import { directionFromVector } from './sprite-system.js?v=0.36';
import { resolveCharacterLayerZ } from './character-layers.js?v=0.36';

const DIRS=['s','sw','w','nw','n','ne','e','se'];

function makeLayerNode(layer){
  const viewport=document.createElement('span');
  viewport.className='player-layer-viewport';
  viewport.dataset.layer=layer.id;

  const img=document.createElement('img');
  img.className='player-layer-sheet';
  img.alt='';
  img.draggable=false;

  viewport.appendChild(img);
  return {viewport,img};
}

export class LayeredPlayerController {
  constructor(root,profile,playerMeta){
    this.root=root;
    this.profile=profile;
    this.meta=playerMeta;
    this.direction='s';
    this.action='idle';
    this.frame=0;
    this.frameStartedAt=0;
    this.layers=new Map();
    this.lastRenderKey='';
    this.build();
  }

  build(){
    if(!this.root || !this.meta) return;
    this.root.innerHTML='';
    this.root.classList.add('layered-player');
    this.root.parentElement?.classList.add('player-layered-host');
    this.root.dataset.spriteMode='layered-atlas';
    const canvas=this.meta.canvas || {width:96,height:112};
    const pivot=this.meta.pivot || {x:48,y:108};
    this.root.style.setProperty('--player-frame-w',canvas.width+'px');
    this.root.style.setProperty('--player-frame-h',canvas.height+'px');
    this.root.style.setProperty('--player-pivot-y',pivot.y+'px');
    this.root.style.setProperty('--player-pivot-neg-y',(-pivot.y)+'px');

    for(const layer of this.meta.layers || []){
      const node=makeLayerNode(layer);
      this.root.appendChild(node.viewport);
      this.layers.set(layer.id,{...node,layer,lastSrc:'',lastLayoutKey:''});
    }
    this.render(true);
  }

  getActionConfig(action=this.action){
    return this.meta.actions?.[action] || null;
  }

  setAction(action,now=performance.now()){
    if(!this.meta.actions?.[action]) return;
    if(action!==this.action){
      this.action=action;
      this.frame=0;
      this.frameStartedAt=now;
      this.lastRenderKey='';
    }
  }

  setDirection(direction){
    if(!DIRS.includes(direction) || direction===this.direction) return false;
    this.direction=direction;
    this.lastRenderKey='';
    return true;
  }

  setMotion(dx,dy,now=performance.now()){
    const moving=Boolean(dx||dy);
    if(moving) this.setDirection(directionFromVector(dx,dy,true));
    this.setAction(moving?'walk':'idle',now);
    this.tick(now);
  }

  tick(now=performance.now()){
    const cfg=this.getActionConfig();
    if(!cfg) return;
    const frameMs=Math.max(40,Number(cfg.frameMs)||120);
    const frames=Math.max(1,Number(cfg.frames)||1);
    if(!this.frameStartedAt) this.frameStartedAt=now;
    let changed=false;
    if(now-this.frameStartedAt>=frameMs){
      const steps=Math.floor((now-this.frameStartedAt)/frameMs);
      const next=(this.frame+steps)%frames;
      changed=next!==this.frame;
      this.frame=next;
      this.frameStartedAt+=steps*frameMs;
    }
    if(changed || !this.lastRenderKey) this.render();
  }

  render(force=false){
    const cfg=this.getActionConfig();
    if(!cfg) return;
    const canvas=this.meta.canvas;
    const frameW=canvas.width;
    const frameH=canvas.height;
    const row=Math.max(0,(this.meta.directionOrder || DIRS).indexOf(this.direction));
    const sheetW=frameW*cfg.frames;
    const sheetH=frameH*(this.meta.directionOrder || DIRS).length;
    const renderKey=this.action+'|'+this.direction+'|'+this.frame;
    if(!force && renderKey===this.lastRenderKey) return;
    this.lastRenderKey=renderKey;

    this.root.dataset.direction=this.direction;
    this.root.dataset.action=this.action;

    for(const entry of this.layers.values()){
      const src=entry.layer.actions?.[this.action];
      if(!src) continue;
      const url=src.includes('?') ? src : src+'?v=0.36';
      if(entry.lastSrc!==url){
        entry.lastSrc=url;
        entry.img.src=url;
      }
      entry.viewport.style.zIndex=String(resolveCharacterLayerZ(entry.layer,this.direction,{
        topGarment:entry.layer.id==='garment' && this.direction==='n'
      }));
      const layoutKey=sheetW+'x'+sheetH;
      if(entry.lastLayoutKey!==layoutKey){
        entry.lastLayoutKey=layoutKey;
        entry.img.style.width=sheetW+'px';
        entry.img.style.height=sheetH+'px';
      }
      entry.img.style.transform=`translate3d(${-this.frame*frameW}px,${-row*frameH}px,0)`;
    }
  }
}

export function createLayeredPlayerController(root,sex,manifest){
  const meta=manifest?.players?.[sex];
  if(!root || !meta || meta.mode!=='layered_atlas') return null;
  return new LayeredPlayerController(root,{sex},meta);
}


export function renderLayeredPlayerPortrait(root,sex,manifest){
  const meta=manifest?.players?.[sex];
  if(!root || !meta || meta.mode!=='layered_atlas') return false;

  root.innerHTML='';
  root.classList.add('layered-player-portrait');
  root.style.backgroundImage='none';

  const direction='s';
  const action='idle';
  const cfg=meta.actions[action];
  const frameW=meta.canvas.width;
  const frameH=meta.canvas.height;
  const row=Math.max(0,(meta.directionOrder||DIRS).indexOf(direction));
  const sheetW=frameW*cfg.frames;
  const sheetH=frameH*(meta.directionOrder||DIRS).length;

  for(const layer of meta.layers||[]){
    const src=layer.actions?.[action];
    if(!src) continue;

    const viewport=document.createElement('span');
    viewport.className='portrait-layer-viewport';
    viewport.dataset.layer=layer.id;
    viewport.style.zIndex=String(resolveCharacterLayerZ(layer,direction));

    const img=document.createElement('img');
    img.className='portrait-layer-sheet';
    img.alt='';
    img.draggable=false;
    img.src=src+(src.includes('?')?'':'?v=0.36');
    img.style.width=sheetW+'px';
    img.style.height=sheetH+'px';
    img.style.transform=`translate(0px,${-row*frameH}px)`;

    viewport.appendChild(img);
    root.appendChild(viewport);
  }
  return true;
}
