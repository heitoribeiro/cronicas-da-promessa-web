import { resolveCharacterLayerZ } from './character-layers.js?v=0.33';
import {
  clamp, degToRad, createHeightSampler, isPathAt, sunDirection,
  terrainNormal, lightFactor, shadeColor, mixColor, fogFactor, pointLightContribution,
  visibleDirectionIndex, loadRoWorld
} from './ro-world-system.js?v=0.33';
import { loadModelLibrary, buildMeshFaces, modelShadowSize } from './ro-mesh-system.js?v=0.33';

const canvas=document.querySelector('#scene');
const ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;

const DIRS=['s','sw','w','nw','n','ne','e','se'];
const keys=new Set();
const imageCache=new Map();

let world=null;
let sprites=null;
let modelLibrary=null;
let heightAt=()=>0;
let sun={x:.5,y:.7,z:-.5};
let sex='female';
let last=performance.now();
let showFog=true;
let showGrid=false;
let showLighting=true;
let pointerCell=null;

const camera={x:14,z:10,yaw:0,pitch:degToRad(57),zoom:46,minZoom:28,maxZoom:72};
const player={x:14,z:12.8,y:0,dir:4,action:'idle',frame:0,frameAt:0};

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

function getImage(src){
  if(!src) return null;
  if(imageCache.has(src)) return imageCache.get(src);
  const img=new Image();
  img.src=src;
  imageCache.set(src,img);
  return img;
}

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

function unprojectGround(screenX,screenY){
  if(!world) return null;
  const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw);
  const cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
  const rx=(screenX-innerWidth/2)/camera.zoom;
  let y=0,wx=0,wz=0;
  for(let i=0;i<3;i++){
    const rz=((screenY-innerHeight/2)/camera.zoom+y*sp)/Math.max(.08,cp);
    const dx=rx*cy+rz*sy;
    const dz=-rx*sy+rz*cy;
    wx=camera.x+dx; wz=camera.z+dz;
    y=heightAt(wx,wz);
  }
  return {x:wx,z:wz,y};
}

function poly(points,fill,stroke=null,lineWidth=1){
  ctx.beginPath();
  points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.closePath();
  ctx.fillStyle=fill;
  ctx.fill();
  if(stroke){
    ctx.strokeStyle=stroke;
    ctx.lineWidth=lineWidth;
    ctx.stroke();
  }
}

function fogged(color,depth){
  if(!showFog||!world?.fog?.enabled) return color;
  return mixColor(color,world.fog.color,fogFactor(depth,world.fog)*.72);
}

function lit(color,normal,depth,extra=1){
  const factor=showLighting?lightFactor(normal,world.lighting,sun):1;
  return fogged(shadeColor(color,factor*extra),depth);
}


function beginFacePath(points){
  ctx.beginPath();
  points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.closePath();
}

function faceCentroid3D(vertices){
  const n=Math.max(1,vertices?.length||0);
  return (vertices||[]).reduce((acc,v)=>({
    x:acc.x+v.x/n,y:acc.y+v.y/n,z:acc.z+v.z/n
  }),{x:0,y:0,z:0});
}

function drawTexturedMeshFace(face){
  beginFacePath(face.points);
  ctx.save();
  ctx.clip();

  ctx.fillStyle=face.color;
  ctx.fillRect(0,0,innerWidth,innerHeight);

  const texSrc=face.material?.texture;
  if(texSrc){
    const img=getImage(texSrc+'?v=0.33');
    if(img?.complete && img.naturalWidth){
      const pattern=ctx.createPattern(img,'repeat');
      if(pattern){
        ctx.globalAlpha=.88;
        ctx.fillStyle=pattern;
        ctx.fillRect(0,0,innerWidth,innerHeight);
        ctx.globalAlpha=1;
      }
    }
  }

  if(showLighting){
    if(face.light<1){
      ctx.fillStyle='rgba(19,13,9,'+Math.min(.55,(1-face.light)*.72)+')';
      ctx.fillRect(0,0,innerWidth,innerHeight);
    }else if(face.light>1){
      ctx.fillStyle='rgba(255,231,177,'+Math.min(.22,(face.light-1)*.35)+')';
      ctx.fillRect(0,0,innerWidth,innerHeight);
    }

    const local=pointLightContribution(faceCentroid3D(face.verts3),world.lights);
    if(local.intensity>0){
      ctx.fillStyle=local.color;
      ctx.globalAlpha=Math.min(.34,local.intensity*.28);
      ctx.fillRect(0,0,innerWidth,innerHeight);
      ctx.globalAlpha=1;
    }
  }
  if(showFog && face.fog>0){
    ctx.fillStyle=world.fog.color;
    ctx.globalAlpha=Math.min(.72,face.fog*.72);
    ctx.fillRect(0,0,innerWidth,innerHeight);
    ctx.globalAlpha=1;
  }
  ctx.restore();

  beginFacePath(face.points);
  ctx.strokeStyle='#2e21155c';
  ctx.lineWidth=1;
  ctx.stroke();
}

function drawMeshModel(model){
  if(!modelLibrary||!model.meshId) return false;
  const faces=buildMeshFaces(
    modelLibrary,model,heightAt,project,lightFactor,world.lighting,sun,world.fog,showLighting,showFog
  );
  if(!faces.length) return false;
  const shadow=modelShadowSize(model);
  drawGroundShadow(model.x,model.z,shadow.w,shadow.d,.24);
  faces.sort((a,b)=>a.depth-b.depth);
  for(const face of faces) drawTexturedMeshFace(face);
  return true;
}

function faceDepth(points){
  return points.reduce((sum,p)=>sum+p.depth,0)/Math.max(1,points.length);
}


function drawGroundCell(cell){
  beginFacePath(cell.p);
  ctx.fillStyle=cell.color;
  ctx.fill();

  const textureSrc=cell.path?world.terrain.pathTexture:world.terrain.texture;
  if(textureSrc){
    const img=getImage(textureSrc+'?v=0.33');
    if(img?.complete && img.naturalWidth){
      ctx.save();
      beginFacePath(cell.p);
      ctx.clip();
      const pattern=ctx.createPattern(img,'repeat');
      if(pattern){
        ctx.globalAlpha=.52;
        ctx.globalCompositeOperation='multiply';
        ctx.fillStyle=pattern;
        ctx.fillRect(0,0,innerWidth,innerHeight);
      }
      ctx.restore();
    }
  }

  if(showLighting){
    const local=pointLightContribution({x:cell.x+.5,y:heightAt(cell.x+.5,cell.z+.5),z:cell.z+.5},world.lights);
    if(local.intensity>0){
      ctx.save();
      beginFacePath(cell.p);
      ctx.clip();
      ctx.fillStyle=local.color;
      ctx.globalAlpha=Math.min(.30,local.intensity*.24);
      ctx.fillRect(0,0,innerWidth,innerHeight);
      ctx.restore();
    }
  }

  beginFacePath(cell.p);
  ctx.strokeStyle=showGrid?'#5c431c66':'#6d4d251c';
  ctx.lineWidth=showGrid?1:.5;
  ctx.stroke();
}

function drawGround(){
  const t=world.terrain;
  const cells=[];
  for(let z=0;z<t.rows;z++){
    for(let x=0;x<t.cols;x++){
      const h00=heightAt(x,z),h10=heightAt(x+1,z),h11=heightAt(x+1,z+1),h01=heightAt(x,z+1);
      const p=[project(x,h00,z),project(x+1,h10,z),project(x+1,h11,z+1),project(x,h01,z+1)];
      const depth=faceDepth(p);
      const path=isPathAt(t,x+.5,z+.5);
      const jitter=((x*17+z*29)%9)-4;
      const base=path?t.pathColor:shadeColor(t.baseColor,1+jitter*.008);
      const normal=terrainNormal(heightAt,x+.5,z+.5,.22);
      cells.push({p,depth,color:lit(base,normal,depth),x,z,path});
    }
  }
  cells.sort((a,b)=>a.depth-b.depth);
  for(const cell of cells) drawGroundCell(cell);

  const edge='#7b552b';
  const skirt=1.15;
  const edges=[];
  for(let x=0;x<t.cols;x++){
    for(const z of [0,t.rows]){
      const a=project(x,heightAt(x,z),z);
      const b=project(x+1,heightAt(x+1,z),z);
      const c=project(x+1,-skirt,z);
      const d=project(x,-skirt,z);
      edges.push({p:[a,b,c,d],depth:faceDepth([a,b,c,d])});
    }
  }
  for(let z=0;z<t.rows;z++){
    for(const x of [0,t.cols]){
      const a=project(x,heightAt(x,z),z);
      const b=project(x,heightAt(x,z+1),z+1);
      const c=project(x,-skirt,z+1);
      const d=project(x,-skirt,z);
      edges.push({p:[a,b,c,d],depth:faceDepth([a,b,c,d])});
    }
  }
  edges.sort((a,b)=>a.depth-b.depth);
  for(const e of edges) poly(e.p,fogged(edge,e.depth),'#4f351e44');
}

function drawGroundShadow(x,z,w=1,d=1,opacity=null){
  const y=heightAt(x,z)+.012;
  const p=project(x,y,z);
  const reach=.42+Math.max(w,d)*.38;
  const q=project(x-sun.x*reach,y,z-sun.z*reach);
  const vx=q.x-p.x,vy=q.y-p.y;
  const angle=Math.atan2(vy,vx);
  const o=opacity??world.lighting.shadowOpacity??.3;
  const major=Math.max(7,(w+d)*camera.zoom*.17+Math.hypot(vx,vy)*.35);
  const minor=Math.max(4,Math.min(w,d)*camera.zoom*.16);
  ctx.save();
  ctx.translate(p.x+vx*.34,p.y+vy*.34+2);
  ctx.rotate(angle);
  ctx.scale(1,.58);
  ctx.beginPath();
  ctx.ellipse(0,0,major,minor,0,0,Math.PI*2);
  ctx.fillStyle='rgba(42,28,16,'+o+')';
  ctx.fill();
  ctx.restore();
}

function boxFaces(m,y=heightAt(m.x,m.z)){
  const x0=m.x-m.w/2,x1=m.x+m.w/2,z0=m.z-m.d/2,z1=m.z+m.d/2,y1=y+m.h;
  const v={
    a:project(x0,y,z0), b:project(x1,y,z0), c:project(x1,y,z1), d:project(x0,y,z1),
    A:project(x0,y1,z0),B:project(x1,y1,z0),C:project(x1,y1,z1),D:project(x0,y1,z1)
  };
  return [
    {p:[v.a,v.b,v.B,v.A],base:m.wall,n:{x:0,y:0,z:-1},mul:.96},
    {p:[v.b,v.c,v.C,v.B],base:m.wall,n:{x:1,y:0,z:0},mul:.90},
    {p:[v.c,v.d,v.D,v.C],base:m.wall,n:{x:0,y:0,z:1},mul:.88},
    {p:[v.d,v.a,v.A,v.D],base:m.wall,n:{x:-1,y:0,z:0},mul:.84},
    {p:[v.A,v.B,v.C,v.D],base:m.roof||m.wall,n:{x:0,y:1,z:0},mul:1.04}
  ];
}

function drawBox(m){
  drawGroundShadow(m.x,m.z,m.w,m.d);
  const faces=boxFaces(m).map(f=>({...f,depth:faceDepth(f.p)})).sort((a,b)=>a.depth-b.depth);
  for(const f of faces) poly(f.p,lit(f.base,f.n,f.depth,f.mul),'#3c281766');
}

function drawTent(m){
  drawGroundShadow(m.x,m.z,m.w*1.05,m.d*1.08,.26);
  const y=heightAt(m.x,m.z),wallH=m.h*.46,roofY=y+m.h;
  const x0=m.x-m.w/2,x1=m.x+m.w/2,z0=m.z-m.d/2,z1=m.z+m.d/2;
  const v={
    a:project(x0,y,z0),b:project(x1,y,z0),c:project(x1,y,z1),d:project(x0,y,z1),
    A:project(x0,y+wallH,z0),B:project(x1,y+wallH,z0),C:project(x1,y+wallH,z1),D:project(x0,y+wallH,z1),
    r0:project(m.x,roofY,z0),r1:project(m.x,roofY,z1)
  };
  const faces=[
    {p:[v.a,v.b,v.B,v.A],base:m.wall,n:{x:0,y:0,z:-1},mul:.98},
    {p:[v.b,v.c,v.C,v.B],base:m.wall,n:{x:1,y:0,z:0},mul:.91},
    {p:[v.c,v.d,v.D,v.C],base:m.wall,n:{x:0,y:0,z:1},mul:.88},
    {p:[v.d,v.a,v.A,v.D],base:m.wall,n:{x:-1,y:0,z:0},mul:.85},
    {p:[v.A,v.B,v.r0],base:m.roof,n:{x:0,y:.75,z:-.65},mul:1.03},
    {p:[v.B,v.C,v.r1,v.r0],base:m.roof,n:{x:.7,y:.72,z:0},mul:.98},
    {p:[v.D,v.A,v.r0,v.r1],base:m.roof,n:{x:-.7,y:.72,z:0},mul:.89},
    {p:[v.C,v.D,v.r1],base:m.roof,n:{x:0,y:.75,z:.65},mul:.94}
  ].map(f=>({...f,depth:faceDepth(f.p)})).sort((a,b)=>a.depth-b.depth);
  faces.forEach(f=>poly(f.p,lit(f.base,f.n,f.depth,f.mul),'#38251677'));

  const front=project(m.x,y+wallH*.48,z0-.01);
  const bottom=project(m.x,y,z0-.01);
  ctx.strokeStyle=fogged(m.accent||'#7c2d2d',front.depth);
  ctx.lineWidth=Math.max(2,camera.zoom*.07);
  ctx.beginPath();ctx.moveTo(front.x,front.y);ctx.lineTo(bottom.x,bottom.y);ctx.stroke();
}

function drawTower(m){
  drawGroundShadow(m.x,m.z,m.w,m.d,.3);
  const baseY=heightAt(m.x,m.z);
  const legW=.18;
  for(const ox of [-m.w*.34,m.w*.34]){
    for(const oz of [-m.d*.34,m.d*.34]){
      const leg={...m,x:m.x+ox,z:m.z+oz,w:legW,d:legW,h:m.h*.68,wall:m.wall,roof:m.wall};
      const faces=boxFaces(leg,baseY).map(f=>({...f,depth:faceDepth(f.p)})).sort((a,b)=>a.depth-b.depth);
      faces.forEach(f=>poly(f.p,lit(f.base,f.n,f.depth,f.mul),'#38251655'));
    }
  }
  const platform={...m,w:m.w*1.16,d:m.d*1.16,h:.30,wall:m.wall,roof:m.roof};
  const pf=boxFaces(platform,baseY+m.h*.68).map(f=>({...f,depth:faceDepth(f.p)})).sort((a,b)=>a.depth-b.depth);
  pf.forEach(f=>poly(f.p,lit(f.base,f.n,f.depth,f.mul),'#38251666'));

  const y=baseY+m.h*.98;
  const rw=m.w*1.4,rd=m.d*1.4;
  const A=project(m.x-rw/2,y,m.z-rd/2),B=project(m.x+rw/2,y,m.z-rd/2),C=project(m.x+rw/2,y,m.z+rd/2),D=project(m.x-rw/2,y,m.z+rd/2);
  const r0=project(m.x,y+1.0,m.z-rd/2),r1=project(m.x,y+1.0,m.z+rd/2);
  const rf=[
    {p:[A,B,r0],n:{x:0,y:.8,z:-.6}},
    {p:[B,C,r1,r0],n:{x:.6,y:.8,z:0}},
    {p:[D,A,r0,r1],n:{x:-.6,y:.8,z:0}},
    {p:[C,D,r1],n:{x:0,y:.8,z:.6}}
  ].map(f=>({...f,depth:faceDepth(f.p)})).sort((a,b)=>a.depth-b.depth);
  rf.forEach(f=>poly(f.p,lit(m.roof,f.n,f.depth),'#38251666'));
}

function drawGate(m){
  drawGroundShadow(m.x,m.z,m.w,m.d,.25);
  const y=heightAt(m.x,m.z);
  const postW=.42;
  for(const ox of [-m.w*.38,m.w*.38]){
    const post={...m,x:m.x+ox,w:postW,d:m.d,h:m.h,wall:m.wall,roof:m.wall};
    const faces=boxFaces(post,y).map(f=>({...f,depth:faceDepth(f.p)})).sort((a,b)=>a.depth-b.depth);
    faces.forEach(f=>poly(f.p,lit(f.base,f.n,f.depth,f.mul),'#38251666'));
  }
  const beam={...m,w:m.w,d:m.d*.9,h:.45,wall:m.roof,roof:shadeColor(m.roof,1.08)};
  const bf=boxFaces(beam,y+m.h-.45).map(f=>({...f,depth:faceDepth(f.p)})).sort((a,b)=>a.depth-b.depth);
  bf.forEach(f=>poly(f.p,lit(f.base,f.n,f.depth,f.mul),'#38251666'));
}

function drawWell(m){
  drawGroundShadow(m.x,m.z,m.w,m.d,.22);
  const y=heightAt(m.x,m.z);
  const segments=10;
  const lower=[],upper=[];
  for(let i=0;i<segments;i++){
    const a=i/segments*Math.PI*2;
    lower.push(project(m.x+Math.cos(a)*m.w*.5,y,m.z+Math.sin(a)*m.d*.5));
    upper.push(project(m.x+Math.cos(a)*m.w*.5,y+m.h*.45,m.z+Math.sin(a)*m.d*.5));
  }
  const side=[];
  for(let i=0;i<segments;i++){
    const j=(i+1)%segments;
    side.push({p:[lower[i],lower[j],upper[j],upper[i]],depth:faceDepth([lower[i],lower[j],upper[j],upper[i]]),i});
  }
  side.sort((a,b)=>a.depth-b.depth).forEach(s=>{
    const a=(s.i+.5)/segments*Math.PI*2;
    poly(s.p,lit(m.wall,{x:Math.cos(a),y:0,z:Math.sin(a)},s.depth),'#3b291866');
  });
  poly(upper,lit('#6e6251',{x:0,y:1,z:0},faceDepth(upper)),'#3c2c2077');
  const center=project(m.x,y+m.h*.46,m.z);
  ctx.beginPath();ctx.ellipse(center.x,center.y,Math.max(6,m.w*camera.zoom*.31),Math.max(3,m.d*camera.zoom*.12),0,0,Math.PI*2);
  ctx.fillStyle=fogged('#31545e',center.depth);ctx.fill();
}

function drawTree(m){
  drawGroundShadow(m.x,m.z,m.w,m.d,.28);
  const baseY=heightAt(m.x,m.z);
  const trunk={...m,w:.28,d:.28,h:m.h*.65,wall:m.wall,roof:m.wall};
  const tf=boxFaces(trunk,baseY).map(f=>({...f,depth:faceDepth(f.p)})).sort((a,b)=>a.depth-b.depth);
  tf.forEach(f=>poly(f.p,lit(f.base,f.n,f.depth,f.mul),'#36241455'));
  const y=baseY+m.h*.58;
  const top=project(m.x,y+m.h*.42,m.z);
  const left=project(m.x-m.w*.62,y,m.z);
  const right=project(m.x+m.w*.62,y,m.z);
  const front=project(m.x,y,m.z+m.d*.62);
  const back=project(m.x,y,m.z-m.d*.62);
  const faces=[
    {p:[top,left,front],n:{x:-.5,y:.7,z:.5}},
    {p:[top,front,right],n:{x:.5,y:.7,z:.5}},
    {p:[top,right,back],n:{x:.5,y:.7,z:-.5}},
    {p:[top,back,left],n:{x:-.5,y:.7,z:-.5}}
  ].map(f=>({...f,depth:faceDepth(f.p)})).sort((a,b)=>a.depth-b.depth);
  faces.forEach((f,i)=>poly(f.p,lit(m.roof,f.n,f.depth,.92+i*.025),'#30401f55'));
}

function drawRock(m){
  drawGroundShadow(m.x,m.z,m.w,m.d,.18);
  const y=heightAt(m.x,m.z);
  const pts=[
    project(m.x-m.w*.5,y,m.z-m.d*.25),
    project(m.x+m.w*.5,y,m.z-m.d*.3),
    project(m.x+m.w*.42,y,m.z+m.d*.38),
    project(m.x-m.w*.45,y,m.z+m.d*.42)
  ];
  const top=project(m.x,y+m.h,m.z);
  const faces=[];
  for(let i=0;i<pts.length;i++){
    const j=(i+1)%pts.length;
    faces.push({p:[pts[i],pts[j],top],depth:faceDepth([pts[i],pts[j],top]),n:{x:Math.cos(i*Math.PI/2),y:.55,z:Math.sin(i*Math.PI/2)}});
  }
  faces.sort((a,b)=>a.depth-b.depth).forEach(f=>poly(f.p,lit(m.wall,f.n,f.depth),'#4b423d55'));
}

function drawBench(m){
  drawGroundShadow(m.x,m.z,m.w,m.d,.15);
  const y=heightAt(m.x,m.z);
  const seat={...m,h:.18,wall:m.wall,roof:m.roof};
  const sf=boxFaces(seat,y+m.h*.55).map(f=>({...f,depth:faceDepth(f.p)})).sort((a,b)=>a.depth-b.depth);
  sf.forEach(f=>poly(f.p,lit(f.base,f.n,f.depth,f.mul),'#3d281766'));
  for(const ox of [-m.w*.35,m.w*.35]){
    const leg={...m,x:m.x+ox,w:.16,d:.18,h:m.h*.58,wall:m.wall,roof:m.wall};
    const lf=boxFaces(leg,y).map(f=>({...f,depth:faceDepth(f.p)})).sort((a,b)=>a.depth-b.depth);
    lf.forEach(f=>poly(f.p,lit(f.base,f.n,f.depth,f.mul),'#3d281755'));
  }
}

function drawBanner(m){
  const y=heightAt(m.x,m.z);
  const a=project(m.x,y,m.z),b=project(m.x,y+m.h,m.z);
  ctx.strokeStyle=lit(m.wall,{x:0,y:1,z:0},b.depth);
  ctx.lineWidth=Math.max(2,camera.zoom*.07);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  const right=project(m.x+.8,y+m.h-.12,m.z);
  const low=project(m.x+.72,y+m.h-.85,m.z);
  poly([b,right,low,project(m.x,y+m.h-.72,m.z)],fogged(m.roof,b.depth),'#5b1f2388');
  const emblem=project(m.x+.38,y+m.h-.43,m.z);
  ctx.fillStyle=fogged(m.accent||'#e0b84b',emblem.depth);
  ctx.fillRect(emblem.x-3,emblem.y-3,6,6);
}

function drawFire(m,now){
  drawGroundShadow(m.x,m.z,1,1,.18);
  const y=heightAt(m.x,m.z);
  const base=project(m.x,y+.05,m.z);
  const stones=8;
  for(let i=0;i<stones;i++){
    const a=i/stones*Math.PI*2;
    const p=project(m.x+Math.cos(a)*.38,y+.08,m.z+Math.sin(a)*.3);
    ctx.fillStyle=fogged(i%2?'#756657':'#8a7763',p.depth);
    ctx.beginPath();ctx.ellipse(p.x,p.y,5,3,0,0,Math.PI*2);ctx.fill();
  }
  const flicker=Math.sin(now*.013)*3;
  const top=project(m.x,y+.9+flicker/camera.zoom,m.z);
  const mid=project(m.x,y+.45,m.z);
  ctx.beginPath();
  ctx.moveTo(base.x-11,base.y);ctx.quadraticCurveTo(mid.x-13,mid.y,top.x,top.y);
  ctx.quadraticCurveTo(mid.x+12,mid.y,base.x+11,base.y);ctx.closePath();
  ctx.fillStyle='#ef6d2d';ctx.fill();
  ctx.beginPath();
  ctx.moveTo(base.x-6,base.y-1);ctx.quadraticCurveTo(mid.x-4,mid.y+2,top.x,top.y+9);
  ctx.quadraticCurveTo(mid.x+6,mid.y+2,base.x+6,base.y-1);ctx.closePath();
  ctx.fillStyle='#ffd45b';ctx.fill();
}

function drawPalisade(segment){
  const dx=segment.x2-segment.x1,dz=segment.z2-segment.z1;
  const len=Math.hypot(dx,dz);
  const count=Math.max(1,Math.floor(len/.48));
  for(let i=0;i<=count;i++){
    const t=i/count;
    const x=segment.x1+dx*t,z=segment.z1+dz*t;
    const y=heightAt(x,z);
    const a=project(x,y,z),b=project(x,y+1.15,z),tip=project(x,y+1.38,z);
    ctx.strokeStyle=lit('#785331',{x:0,y:1,z:0},b.depth,.86);
    ctx.lineWidth=Math.max(2,camera.zoom*.08);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.fillStyle=fogged('#5e3d27',tip.depth);
    ctx.beginPath();ctx.moveTo(b.x-3,b.y);ctx.lineTo(tip.x,tip.y);ctx.lineTo(b.x+3,b.y);ctx.closePath();ctx.fill();
  }
}

function drawModel(m,now){
  if(m.renderMode==='mesh' && drawMeshModel(m)) return;
  if(m.type==='tent') return drawTent(m);
  if(m.type==='tower') return drawTower(m);
  if(m.type==='gate') return drawGate(m);
  if(m.type==='well') return drawWell(m);
  if(m.type==='tree') return drawTree(m);
  if(m.type==='rock') return drawRock(m);
  if(m.type==='bench') return drawBench(m);
  if(m.type==='banner') return drawBanner(m);
  if(m.type==='fire') return drawFire(m,now);
  return drawBox(m);
}

function drawAtlasSprite(meta,x,z,worldDir,frame=0,scale=.72){
  if(!meta?.atlas) return;
  const cfg=meta.atlas.actions?.idle;
  if(!cfg) return;
  const dirIndex=visibleDirectionIndex(worldDir,camera.yaw);
  const direction=(meta.atlas.directionOrder||DIRS)[dirIndex];
  const row=(meta.atlas.directionOrder||DIRS).indexOf(direction);
  const img=getImage(cfg.source.replace(/v=0\.\d+/,'v=0.33'));
  if(!img?.complete) return;
  const fw=meta.atlas.frame.width,fh=meta.atlas.frame.height;
  const p=project(x,heightAt(x,z),z);
  drawGroundShadow(x,z,.72,.45,.22);
  const dw=fw*scale,dh=fh*scale;
  ctx.drawImage(img,(frame%cfg.frames)*fw,row*fh,fw,fh,p.x-dw/2,p.y-dh+3,dw,dh);
}

function drawLayeredPlayer(now){
  const meta=sprites?.players?.[sex];
  if(!meta) return;
  const cfg=meta.actions[player.action]||meta.actions.idle;
  if(now-player.frameAt>=cfg.frameMs){
    const steps=Math.floor((now-player.frameAt)/cfg.frameMs);
    player.frame=(player.frame+steps)%cfg.frames;
    player.frameAt+=steps*cfg.frameMs;
  }
  const dirIndex=visibleDirectionIndex(player.dir,camera.yaw);
  const direction=meta.directionOrder[dirIndex];
  const p=project(player.x,heightAt(player.x,player.z),player.z);
  drawGroundShadow(player.x,player.z,.78,.46,.24);
  const scale=.80,fw=meta.canvas.width,fh=meta.canvas.height,dw=fw*scale,dh=fh*scale;
  const layers=[...meta.layers].sort((a,b)=>resolveCharacterLayerZ(a,direction)-resolveCharacterLayerZ(b,direction));
  for(const layer of layers){
    const src=layer.actions?.[player.action]||layer.actions?.idle;
    const img=getImage((src||'')+'?v=0.33');
    if(!img?.complete) continue;
    const row=meta.directionOrder.indexOf(direction);
    ctx.drawImage(img,player.frame*fw,row*fh,fw,fh,p.x-dw/2,p.y-dh+3,dw,dh);
  }
}

function drawSelector(){
  if(!pointerCell||!world) return;
  const x=pointerCell.x,z=pointerCell.z;
  if(x<0||z<0||x>=world.terrain.cols||z>=world.terrain.rows) return;
  const p=[
    project(x,heightAt(x,z)+.018,z),
    project(x+1,heightAt(x+1,z)+.018,z),
    project(x+1,heightAt(x+1,z+1)+.018,z+1),
    project(x,heightAt(x,z+1)+.018,z+1)
  ];
  ctx.save();
  ctx.setLineDash([5,3]);
  poly(p,'rgba(242,202,72,.08)','#f3d35cdd',2);
  ctx.restore();
}

function buildQueue(now){
  const q=[];
  for(const m of world.models){
    q.push({depth:project(m.x,heightAt(m.x,m.z)+m.h*.35,m.z).depth,draw:()=>drawModel(m,now)});
  }
  for(const s of world.palisade||[]){
    const x=(s.x1+s.x2)/2,z=(s.z1+s.z2)/2;
    q.push({depth:project(x,heightAt(x,z)+.6,z).depth,draw:()=>drawPalisade(s)});
  }
  for(const actor of world.actors||[]){
    q.push({
      depth:project(actor.x,heightAt(actor.x,actor.z)+.65,actor.z).depth,
      draw:()=>{
        const meta=sprites?.npcs?.[actor.id];
        const scale=actor.id==='child'?.62:actor.id==='guard'?.78:.72;
        if(meta?.mode==='atlas') drawAtlasSprite(meta,actor.x,actor.z,actor.dir,Math.floor(now/250),scale);
      }
    });
  }
  q.push({depth:project(player.x,heightAt(player.x,player.z)+.7,player.z).depth,draw:()=>drawLayeredPlayer(now)});
  q.sort((a,b)=>a.depth-b.depth);
  return q;
}

function drawAtmosphere(){
  const g=ctx.createLinearGradient(0,0,0,innerHeight);
  g.addColorStop(0,'#d8bb80');
  g.addColorStop(.48,'#c89a5a');
  g.addColorStop(1,'#8d6435');
  ctx.fillStyle=g;
  ctx.fillRect(0,0,innerWidth,innerHeight);
}

function render(now){
  drawAtmosphere();
  drawGround();
  drawSelector();
  for(const item of buildQueue(now)) item.draw();

  const vignette=ctx.createRadialGradient(innerWidth/2,innerHeight/2,innerHeight*.1,innerWidth/2,innerHeight/2,Math.max(innerWidth,innerHeight)*.76);
  vignette.addColorStop(0,'#0000');
  vignette.addColorStop(1,'#25170d42');
  ctx.fillStyle=vignette;
  ctx.fillRect(0,0,innerWidth,innerHeight);
}

function update(dt,now){
  let dx=0,dz=0;
  if(keys.has('w'))dz-=1;
  if(keys.has('s'))dz+=1;
  if(keys.has('a'))dx-=1;
  if(keys.has('d'))dx+=1;

  if(dx||dz){
    const len=Math.hypot(dx,dz)||1;
    dx/=len; dz/=len;
    const speed=2.65*dt;
    player.x=clamp(player.x+dx*speed,.6,world.terrain.cols-.6);
    player.z=clamp(player.z+dz*speed,.6,world.terrain.rows-.6);
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
  }else{
    player.action='idle';
  }

  const follow=1-Math.exp(-Number(world.camera.followLerp||3.8)*dt);
  camera.x+=(player.x-camera.x)*follow;
  camera.z+=(player.z-camera.z)*follow;

  const readout=document.querySelector('#cameraReadout');
  if(readout){
    const deg=((Math.round(camera.yaw*180/Math.PI)%360)+360)%360;
    readout.textContent='Câmera '+deg+'° · pitch '+Math.round(camera.pitch*180/Math.PI)+'° · zoom '+camera.zoom.toFixed(0);
  }
  const cell=document.querySelector('#cellReadout');
  if(cell) cell.textContent=pointerCell?'GAT-like: '+pointerCell.x+', '+pointerCell.z:'GAT-like: —';
}

function loop(now){
  const dt=Math.min(.04,(now-last)/1000);
  last=now;
  update(dt,now);
  render(now);
  requestAnimationFrame(loop);
}

function rotate(steps){
  camera.yaw+=steps*degToRad(world.camera.rotationStepDeg||45);
  camera.yaw=(camera.yaw%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
}
function zoom(delta){
  camera.zoom=clamp(camera.zoom+delta,camera.minZoom,camera.maxZoom);
}
function pitch(deltaDeg){
  camera.pitch=clamp(camera.pitch+degToRad(deltaDeg),degToRad(38),degToRad(72));
}

document.querySelector('#rotateLeft')?.addEventListener('click',()=>rotate(-1));
document.querySelector('#rotateRight')?.addEventListener('click',()=>rotate(1));
document.querySelector('#zoomIn')?.addEventListener('click',()=>zoom(5));
document.querySelector('#zoomOut')?.addEventListener('click',()=>zoom(-5));
document.querySelector('#pitchUp')?.addEventListener('click',()=>pitch(-4));
document.querySelector('#pitchDown')?.addEventListener('click',()=>pitch(4));
document.querySelector('#toggleSex')?.addEventListener('click',event=>{
  sex=sex==='female'?'male':'female';
  event.currentTarget.textContent='Personagem: '+(sex==='female'?'Feminino':'Masculino');
});
document.querySelector('#toggleFog')?.addEventListener('click',event=>{
  showFog=!showFog;
  event.currentTarget.textContent='Fog: '+(showFog?'on':'off');
});
document.querySelector('#toggleGrid')?.addEventListener('click',event=>{
  showGrid=!showGrid;
  event.currentTarget.textContent='Grid: '+(showGrid?'on':'off');
});
document.querySelector('#toggleLight')?.addEventListener('click',event=>{
  showLighting=!showLighting;
  event.currentTarget.textContent='Luz: '+(showLighting?'on':'off');
});

addEventListener('keydown',event=>{
  const k=event.key.toLowerCase();
  keys.add(k);
  if(k==='q') rotate(-1);
  if(k==='e') rotate(1);
  if(k==='r') pitch(-3);
  if(k==='f') pitch(3);
  if(k==='g') showGrid=!showGrid;
});
addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));

canvas.addEventListener('wheel',event=>{
  event.preventDefault();
  if(event.shiftKey) pitch(event.deltaY<0?-3:3);
  else zoom(event.deltaY<0?4:-4);
},{passive:false});

let dragging=false,lastPointerX=0,lastPointerY=0;
canvas.addEventListener('pointerdown',event=>{
  if(event.button===2||event.shiftKey){
    dragging=true;
    lastPointerX=event.clientX;
    lastPointerY=event.clientY;
    canvas.setPointerCapture(event.pointerId);
  }
});
canvas.addEventListener('pointermove',event=>{
  const worldPos=unprojectGround(event.clientX,event.clientY);
  if(worldPos) pointerCell={x:Math.floor(worldPos.x),z:Math.floor(worldPos.z)};
  if(!dragging) return;
  const dx=event.clientX-lastPointerX;
  const dy=event.clientY-lastPointerY;
  lastPointerX=event.clientX;
  lastPointerY=event.clientY;
  camera.yaw-=dx*.006;
  pitch(dy*.08);
});
canvas.addEventListener('pointerup',()=>dragging=false);
canvas.addEventListener('pointercancel',()=>dragging=false);
canvas.addEventListener('contextmenu',event=>event.preventDefault());

async function init(){
  [world,sprites,modelLibrary]=await Promise.all([
    loadRoWorld('./assets/maps/judah/ro25d_world.json?v=0.33'),
    fetch('./assets/art/pixel/metadata/sprite_manifest.json?v=0.33',{cache:'no-store'}).then(r=>{
      if(!r.ok) throw new Error('Falha ao carregar sprite_manifest');
      return r.json();
    }),
    loadModelLibrary('./assets/art/ro25d/model_library.json?v=0.33')
  ]);

  heightAt=createHeightSampler(world.terrain);
  sun=sunDirection(world.lighting);
  Object.assign(camera,{
    x:world.playerSpawn.x,
    z:world.playerSpawn.z-3,
    yaw:degToRad(world.camera.yawDeg),
    pitch:degToRad(world.camera.pitchDeg),
    zoom:world.camera.zoom,
    minZoom:world.camera.minZoom,
    maxZoom:world.camera.maxZoom
  });
  Object.assign(player,{
    x:world.playerSpawn.x,
    z:world.playerSpawn.z,
    dir:world.playerSpawn.dir,
    frameAt:performance.now()
  });

  requestAnimationFrame(loop);
}

init().catch(error=>{
  console.error(error);
  ctx.fillStyle='#071019';
  ctx.fillRect(0,0,innerWidth,innerHeight);
  ctx.fillStyle='#ffe2a0';
  ctx.font='16px monospace';
  ctx.fillText('Falha ao carregar protótipo 2.5D: '+error.message,24,40);
});
