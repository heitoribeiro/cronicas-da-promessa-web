const PRESETS={
  high:{
    id:'high',label:'Alta',targetFps:60,renderFps:60,dprMax:1.5,resolutionScale:1,
    terrainTextures:true,meshTextures:true,pointLights:true,
    shadows:true,fog:true,cullMargin:180,palisadeStride:1,
    terrainTextureAlpha:.46,meshTextureAlpha:.88
  },
  balanced:{
    id:'balanced',label:'Equilibrada',targetFps:50,renderFps:50,dprMax:1.15,resolutionScale:.85,
    terrainTextures:false,meshTextures:true,pointLights:true,
    shadows:true,fog:true,cullMargin:120,palisadeStride:2,
    terrainTextureAlpha:0,meshTextureAlpha:.82
  },
  performance:{
    id:'performance',label:'Desempenho',targetFps:30,renderFps:30,dprMax:1,resolutionScale:.70,
    terrainTextures:false,meshTextures:false,pointLights:false,
    shadows:false,fog:false,cullMargin:80,palisadeStride:3,
    terrainTextureAlpha:0,meshTextureAlpha:0
  }
};

const ORDER=['performance','balanced','high'];

export function createPerformanceController({storageKey='cronicas.ro25d.quality',onChange=()=>{}}={}){
  let requested='auto';
  try{
    const saved=localStorage.getItem(storageKey);
    if(saved==='auto'||PRESETS[saved]) requested=saved;
  }catch{}

  let effective=requested==='auto'?'balanced':requested;
  let avgCost=0;
  let avgFps=60;
  let lastRenderAt=0;
  let sampleCount=0;
  let lastAutoChange=performance.now();
  let goodSince=performance.now();

  function settings(){
    return PRESETS[effective];
  }

  function label(){
    if(requested==='auto') return 'Auto · '+PRESETS[effective].label;
    return PRESETS[effective].label;
  }

  function persist(){
    try{localStorage.setItem(storageKey,requested)}catch{}
  }

  function emit(reason='manual'){
    onChange({requested,effective,settings:settings(),label:label(),avgFps,avgCost,reason});
  }

  function setRequested(mode,reason='manual'){
    if(mode!=='auto'&&!PRESETS[mode]) return;
    requested=mode;
    effective=mode==='auto'?'balanced':mode;
    sampleCount=0;
    avgCost=0;
    avgFps=60;
    lastAutoChange=performance.now();
    goodSince=lastAutoChange;
    persist();
    emit(reason);
  }

  function cycle(){
    const order=['auto','high','balanced','performance'];
    const i=order.indexOf(requested);
    setRequested(order[(i+1)%order.length]);
  }

  function recordRender(startAt,endAt){
    const cost=Math.max(.01,endAt-startAt);
    const fps=lastRenderAt?1000/Math.max(1,endAt-lastRenderAt):60;
    lastRenderAt=endAt;
    const alpha=sampleCount<20?.16:.06;
    avgCost=sampleCount?avgCost*(1-alpha)+cost*alpha:cost;
    avgFps=sampleCount?avgFps*(1-alpha)+Math.min(120,fps)*alpha:Math.min(120,fps);
    sampleCount++;

    if(requested!=='auto'||sampleCount<35) return false;

    const now=endAt;
    const current=PRESETS[effective];
    const budget=1000/current.targetFps;
    const idx=ORDER.indexOf(effective);

    if(avgCost>budget*.86 && now-lastAutoChange>1800 && idx>0){
      effective=ORDER[idx-1];
      lastAutoChange=now;
      goodSince=now;
      emit('auto-down');
      return true;
    }

    if(avgCost<budget*.44){
      if(now-goodSince>6500 && now-lastAutoChange>6500 && idx<ORDER.length-1){
        effective=ORDER[idx+1];
        lastAutoChange=now;
        goodSince=now;
        emit('auto-up');
        return true;
      }
    }else{
      goodSince=now;
    }
    return false;
  }

  return {
    get requested(){return requested},
    get effective(){return effective},
    get avgCost(){return avgCost},
    get avgFps(){return avgFps},
    get settings(){return settings()},
    get label(){return label()},
    setMode:setRequested,
    cycle,
    recordRender,
    notify:()=>emit('init')
  };
}

export function screenBounds(points,pad=0){
  if(!points?.length) return {x0:0,y0:0,x1:0,y1:0,width:0,height:0};
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const p of points){
    if(p.x<x0)x0=p.x;if(p.y<y0)y0=p.y;
    if(p.x>x1)x1=p.x;if(p.y>y1)y1=p.y;
  }
  x0-=pad;y0-=pad;x1+=pad;y1+=pad;
  return {x0,y0,x1,y1,width:x1-x0,height:y1-y0};
}

export function boundsVisible(bounds,width,height,margin=0){
  return bounds.x1>=-margin&&bounds.y1>=-margin&&bounds.x0<=width+margin&&bounds.y0<=height+margin;
}

export const PERFORMANCE_PRESETS=PRESETS;
