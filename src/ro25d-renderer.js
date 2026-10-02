import { resolveCharacterLayerZ } from './character-layers.js?v=0.31';

const canvas=document.querySelector('#scene');
const ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;

const DIRS=['s','sw','w','nw','n','ne','e','se'];
const keys=new Set();
let manifest=null;
let sex='female';
let last=performance.now();

const camera={
  x:9,z:7,yaw:0,pitch:56*Math.PI/180,zoom:47,
  minZoom:28,maxZoom:72
};
const player={x:9,z:8,y:0,dir:0,action:'walk',frame:0,frameAt:0};

const terrain={
  cols:20,rows:15,
  h(x,z){
    const dune1=Math.exp(-(((x-3.2)**2)/12+((z-3.0)**2)/7))*.34;
    const dune2=Math.exp(-(((x-16.0)**2)/10+((z-11.4)**2)/8))*.28;
    const bowl=Math.exp(-(((x-10)**2)/28+((z-7.5)**2)/20))*.08;
    return Math.max(0,dune1+dune2-bowl);
  },
  color(x,z){
    const path=Math.abs(x-10)<1.1 || Math.abs(z-7.5)<.9;
    if(path) return '#d6bd79';
    const n=((x*17+z*29)%7)-3;
    const base=[190+n*2,142+n*2,78+n];
    return `rgb(${base[0]},${base[1]},${base[2]})`;
  }
};

const models=[
  {type:'tent',x:10,z:3.4,w:3.7,d:2.5,h:2.7,roof:'#9f2d30',wall:'#eee0b8'},
  {type:'tent',x:4.2,z:4.1,w:2.4,d:1.8,h:1.9,roof:'#35664d',wall:'#eadbb3'},
  {type:'tent',x:15.7,z:4.4,w:2.5,d:1.9,h:2.0,roof:'#284e82',wall:'#eadbb3'},
  {type:'workshop',x:15.1,z:10.5,w:2.8,d:2.0,h:1.7,roof:'#6a4226',wall:'#e4d19d'},
  {type:'gate',x:10,z:13.2,w:3.4,d:.7,h:2.2,roof:'#6b4126',wall:'#925a30'},
  {type:'crate',x:5.1,z:7.5,w:.8,d:.8,h:.75,roof:'#80502e',wall:'#a46b39'},
  {type:'crate',x:5.9,z:7.8,w:.7,d:.7,h:.62,roof:'#80502e',wall:'#9b6035'},
  {type:'crate',x:14.0,z:8.6,w:.9,d:.8,h:.72,roof:'#80502e',wall:'#9d6337'}
];

const actors=[
  {id:'elder',x:8.5,z:4.8,dir:4},
  {id:'eliabe',x:14.8,z:9.4,dir:6},
  {id:'miria',x:13.3,z:6.0,dir:1},
  {id:'hanan',x:5.3,z:9.7,dir:7},
  {id:'guard',x:10.3,z:12.2,dir:4}
];

const imageCache=new Map();
function getImage(src){
  if(!src) return null;
  if(imageCache.has(src)) return imageCache.get(src);
  const img=new Image();
  img.src=src;
  imageCache.set(src,img);
  return img;
}

function resize(){
  const dpr=Math.min(devicePixelRatio||1,2);
  const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);
  canvas.width=Math.floor(w*dpr);
  canvas.height=Math.floor(h*dpr);
  canvas.style.width=w+'px';
  canvas.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled=false;
}
addEventListener('resize',resize);
resize();

function project(x,y,z){
  const dx=x-camera.x,dz=z-camera.z;
  const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw);
  const rx=dx*cy-dz*sy;
  const rz=dx*sy+dz*cy;
  const cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
  return {
    x:innerWidth/2+rx*camera.zoom,
    y:innerHeight/2+(rz*cp-y*sp)*camera.zoom,
    depth:rz*sp+y*cp
  };
}

function poly(points,fill,stroke='#00000022'){
  ctx.beginPath();
  points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}
function shade(hex,factor){
  const n=parseInt(hex.slice(1),16);
  const r=Math.max(0,Math.min(255,((n>>16)&255)*factor));
  const g=Math.max(0,Math.min(255,((n>>8)&255)*factor));
  const b=Math.max(0,Math.min(255,(n&255)*factor));
  return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
}

function drawGround(){
  const tiles=[];
  for(let z=0;z<terrain.rows;z++){
    for(let x=0;x<terrain.cols;x++){
      const a=project(x,terrain.h(x,z),z);
      const b=project(x+1,terrain.h(x+1,z),z);
      const c=project(x+1,terrain.h(x+1,z+1),z+1);
      const d=project(x,terrain.h(x,z+1),z+1);
      tiles.push({x,z,p:[a,b,c,d],depth:(a.depth+b.depth+c.depth+d.depth)/4,color:terrain.color(x,z)});
    }
  }
  tiles.sort((a,b)=>a.depth-b.depth);
  for(const t of tiles) poly(t.p,t.color,'#6f522433');
}

function faceDepth(points){return points.reduce((s,p)=>s+p.depth,0)/points.length}
function drawBox(m){
  const y=terrain.h(m.x,m.z);
  const x0=m.x-m.w/2,x1=m.x+m.w/2,z0=m.z-m.d/2,z1=m.z+m.d/2,y1=y+m.h;
  const v={
    a:project(x0,y,z0),b:project(x1,y,z0),c:project(x1,y,z1),d:project(x0,y,z1),
    A:project(x0,y1,z0),B:project(x1,y1,z0),C:project(x1,y1,z1),D:project(x0,y1,z1)
  };
  const faces=[
    {p:[v.a,v.b,v.B,v.A],c:shade(m.wall,.82)},
    {p:[v.b,v.c,v.C,v.B],c:shade(m.wall,.66)},
    {p:[v.c,v.d,v.D,v.C],c:shade(m.wall,.76)},
    {p:[v.d,v.a,v.A,v.D],c:shade(m.wall,.62)},
    {p:[v.A,v.B,v.C,v.D],c:m.roof}
  ].map(f=>({...f,d:faceDepth(f.p)})).sort((a,b)=>a.d-b.d);
  faces.forEach(f=>poly(f.p,f.c,'#3e2a1777'));
}
function drawTent(m){
  const y=terrain.h(m.x,m.z);
  const x0=m.x-m.w/2,x1=m.x+m.w/2,z0=m.z-m.d/2,z1=m.z+m.d/2,wallH=m.h*.52,roofY=y+m.h;
  const v={
    a:project(x0,y,z0),b:project(x1,y,z0),c:project(x1,y,z1),d:project(x0,y,z1),
    A:project(x0,y+wallH,z0),B:project(x1,y+wallH,z0),C:project(x1,y+wallH,z1),D:project(x0,y+wallH,z1),
    r0:project(m.x,roofY,z0),r1:project(m.x,roofY,z1)
  };
  const faces=[
    {p:[v.a,v.b,v.B,v.A],c:shade(m.wall,.92)},
    {p:[v.d,v.a,v.A,v.D],c:shade(m.wall,.70)},
    {p:[v.b,v.c,v.C,v.B],c:shade(m.wall,.76)},
    {p:[v.c,v.d,v.D,v.C],c:shade(m.wall,.82)},
    {p:[v.A,v.B,v.r0],c:shade(m.roof,.95)},
    {p:[v.B,v.C,v.r1,v.r0],c:m.roof},
    {p:[v.D,v.A,v.r0,v.r1],c:shade(m.roof,.78)},
    {p:[v.C,v.D,v.r1],c:shade(m.roof,.88)}
  ].map(f=>({...f,d:faceDepth(f.p)})).sort((a,b)=>a.d-b.d);
  faces.forEach(f=>poly(f.p,f.c,'#3d261788'));
}
function drawModels(){
  const sorted=models.map(m=>({...m,depth:project(m.x,terrain.h(m.x,m.z),m.z).depth})).sort((a,b)=>a.depth-b.depth);
  for(const m of sorted){
    if(m.type==='tent') drawTent(m); else drawBox(m);
  }
}

function cameraOctant(){
  return ((Math.round(camera.yaw/(Math.PI/4))%8)+8)%8;
}
function visibleDir(worldDir){
  return ((worldDir-cameraOctant())%8+8)%8;
}

function drawShadow(x,z,scale=1){
  const p=project(x,terrain.h(x,z)+.01,z);
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.scale(1,.38);
  ctx.beginPath();ctx.ellipse(0,0,18*scale,10*scale,0,0,Math.PI*2);
  ctx.fillStyle='#2e1d1450';ctx.fill();
  ctx.restore();
}
function drawAtlasSprite(meta,x,z,worldDir,frame=0,scale=.72){
  const dirIndex=visibleDir(worldDir);
  const dir=(meta.atlas?.directionOrder||DIRS)[dirIndex];
  const cfg=meta.atlas?.actions?.idle;
  if(!cfg)return;
  const img=getImage(cfg.source.replace(/v=0\.\d+/,'v=0.31'));
  if(!img?.complete)return;
  const fw=meta.atlas.frame.width,fh=meta.atlas.frame.height;
  const row=(meta.atlas.directionOrder||DIRS).indexOf(dir);
  const p=project(x,terrain.h(x,z),z);
  drawShadow(x,z,scale);
  const dw=fw*scale,dh=fh*scale;
  ctx.drawImage(img,(frame%cfg.frames)*fw,row*fh,fw,fh,p.x-dw/2,p.y-dh+3,dw,dh);
}

function drawLayeredPlayer(now){
  const meta=manifest?.players?.[sex];
  if(!meta)return;
  const cfg=meta.actions[player.action]||meta.actions.idle;
  if(now-player.frameAt>=cfg.frameMs){
    const steps=Math.floor((now-player.frameAt)/cfg.frameMs);
    player.frame=(player.frame+steps)%cfg.frames;
    player.frameAt+=steps*cfg.frameMs;
  }
  const viewDir=visibleDir(player.dir);
  const direction=meta.directionOrder[viewDir];
  const p=project(player.x,terrain.h(player.x,player.z),player.z);
  drawShadow(player.x,player.z,.9);
  const scale=.78,fw=meta.canvas.width,fh=meta.canvas.height,dw=fw*scale,dh=fh*scale;
  const layers=[...meta.layers].sort((a,b)=>resolveCharacterLayerZ(a,direction)-resolveCharacterLayerZ(b,direction));
  for(const layer of layers){
    const src=layer.actions?.[player.action]||layer.actions?.idle;
    const img=getImage((src||'')+'?v=0.31');
    if(!img?.complete)continue;
    const row=meta.directionOrder.indexOf(direction);
    ctx.drawImage(img,player.frame*fw,row*fh,fw,fh,p.x-dw/2,p.y-dh+3,dw,dh);
  }
}

function drawSelection(){
  const p=project(player.x,terrain.h(player.x,player.z)+.015,player.z);
  ctx.strokeStyle='#f5d365cc';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(p.x,p.y,20,8,0,0,Math.PI*2);ctx.stroke();
}

function update(dt,now){
  let dx=0,dz=0;
  if(keys.has('w'))dz-=1;if(keys.has('s'))dz+=1;if(keys.has('a'))dx-=1;if(keys.has('d'))dx+=1;
  if(dx||dz){
    const len=Math.hypot(dx,dz);dx/=len;dz/=len;
    const speed=2.4*dt;
    player.x=Math.max(.6,Math.min(terrain.cols-.6,player.x+dx*speed));
    player.z=Math.max(.6,Math.min(terrain.rows-.6,player.z+dz*speed));
    const angle=Math.atan2(dz,dx)*180/Math.PI;
    if(angle>=-22.5&&angle<22.5)player.dir=6;
    else if(angle>=22.5&&angle<67.5)player.dir=7;
    else if(angle>=67.5&&angle<112.5)player.dir=0;
    else if(angle>=112.5&&angle<157.5)player.dir=1;
    else if(angle>=157.5||angle<-157.5)player.dir=2;
    else if(angle>=-157.5&&angle<-112.5)player.dir=3;
    else if(angle>=-112.5&&angle<-67.5)player.dir=4;
    else player.dir=5;
    player.action='walk';
  }else player.action='idle';
  camera.x+=(player.x-camera.x)*Math.min(1,dt*3.8);
  camera.z+=(player.z-camera.z)*Math.min(1,dt*3.8);
  document.querySelector('#cameraReadout').textContent=`Câmera: ${Math.round(camera.yaw*180/Math.PI)}° · pitch 56° · zoom ${camera.zoom.toFixed(0)}`;
}

function render(now){
  ctx.fillStyle='#b98b4e';ctx.fillRect(0,0,innerWidth,innerHeight);
  drawGround();
  drawModels();
  for(const actor of actors){
    const meta=manifest?.npcs?.[actor.id];
    if(meta?.mode==='atlas')drawAtlasSprite(meta,actor.x,actor.z,actor.dir,Math.floor(now/260),actor.id==='guard'?.78:.72);
  }
  drawLayeredPlayer(now);
  drawSelection();

  const vignette=ctx.createRadialGradient(innerWidth/2,innerHeight/2,innerHeight*.1,innerWidth/2,innerHeight/2,Math.max(innerWidth,innerHeight)*.75);
  vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#26180938');
  ctx.fillStyle=vignette;ctx.fillRect(0,0,innerWidth,innerHeight);
}

function loop(now){
  const dt=Math.min(.04,(now-last)/1000);last=now;
  update(dt,now);render(now);requestAnimationFrame(loop);
}
function rotate(delta){
  camera.yaw+=delta*Math.PI/4;
  camera.yaw=(camera.yaw%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
}
function zoom(delta){camera.zoom=Math.max(camera.minZoom,Math.min(camera.maxZoom,camera.zoom+delta))}
document.querySelector('#rotateLeft').onclick=()=>rotate(-1);
document.querySelector('#rotateRight').onclick=()=>rotate(1);
document.querySelector('#zoomIn').onclick=()=>zoom(5);
document.querySelector('#zoomOut').onclick=()=>zoom(-5);
document.querySelector('#toggleSex').onclick=event=>{sex=sex==='female'?'male':'female';event.currentTarget.textContent='Personagem: '+(sex==='female'?'Feminino':'Masculino')};
addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='q')rotate(-1);if(e.key.toLowerCase()==='e')rotate(1)});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?4:-4)},{passive:false});

async function init(){
  const res=await fetch('./assets/art/pixel/metadata/sprite_manifest.json?v=0.31',{cache:'no-store'});
  manifest=await res.json();
  player.frameAt=performance.now();
  requestAnimationFrame(loop);
}
init().catch(error=>{
  ctx.fillStyle='#071019';ctx.fillRect(0,0,innerWidth,innerHeight);
  ctx.fillStyle='#ffe2a0';ctx.font='16px monospace';ctx.fillText('Falha ao carregar protótipo: '+error.message,24,40);
});
