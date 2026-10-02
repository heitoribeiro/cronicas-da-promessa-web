import { resolveCharacterLayerZ } from './character-layers.js?v=0.35';
import {
  clamp, degToRad, createHeightSampler, isPathAt, sunDirection,
  terrainNormal, lightFactor, shadeColor, mixColor, fogFactor, pointLightContribution,
  visibleDirectionIndex, loadRoWorld
} from './ro-world-system.js?v=0.35';
import {
  loadModelLibrary, prepareMeshInstance, projectPreparedMesh, modelShadowSize
} from './ro-mesh-system.js?v=0.35';
import {
  createPerformanceController, screenBounds, boundsVisible
} from './ro-performance.js?v=0.35';

const canvas=document.querySelector('#scene');
const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
ctx.imageSmoothingEnabled=false;

const DIRS=['s','sw','w','nw','n','ne','e','se'];
const keys=new Set();
const imageCache=new Map();
const patternCache=new Map();
const preparedMeshes=new Map();

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
let terrainCells=[];
let terrainEdges=[];
let palisadeGroups=[];
let atmosphereGradient=null;
let vignetteGradient=null;
let viewportW=Math.max(1,innerWidth);
let viewportH=Math.max(1,innerHeight);
let lastReadoutAt=0;
let lastPerfReadoutAt=0;
let renderedFrames=0;

const projection={cy:1,sy:0,cp:1,sp:0,halfW:viewportW/2,halfH:viewportH/2};
const camera={x:14,z:10,yaw:0,pitch:degToRad(57),zoom:46,minZoom:28,maxZoom:72};
const player={x:14,z:12.8,y:0,dir:4,action:'idle',frame:0,frameAt:0};

const perf=createPerformanceController({
  onChange:()=>{
    resize();
    updateQualityUI();
  }
});

function effectiveFog(){
  return showFog&&perf.settings.fog&&world?.fog?.enabled;
}

function updateProjectionCache(){
  projection.cy=Math.cos(camera.yaw);
  projection.sy=Math.sin(camera.yaw);
  projection.cp=Math.cos(camera.pitch);
  projection.sp=Math.sin(camera.pitch);
  projection.halfW=viewportW*.5;
  projection.halfH=viewportH*.5;
}

function resize(){
  viewportW=Math.max(1,innerWidth);
  viewportH=Math.max(1,innerHeight);
  const dpr=Math.min(devicePixelRatio||1,perf.settings.dprMax);
  canvas.width=Math.max(1,Math.floor(viewportW*dpr));
  canvas.height=Math.max(1,Math.floor(viewportH*dpr));
  canvas.style.width=viewportW+'px';
  canvas.style.height=viewportH+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled=false;

  atmosphereGradient=ctx.createLinearGradient(0,0,0,viewportH);
  atmosphereGradient.addColorStop(0,'#d8bb80');
  atmosphereGradient.addColorStop(.48,'#c89a5a');
  atmosphereGradient.addColorStop(1,'#8d6435');

  vignetteGradient=ctx.createRadialGradient(
    viewportW*.5,viewportH*.5,viewportH*.1,
    viewportW*.5,viewportH*.5,Math.max(viewportW,viewportH)*.76
  );
  vignetteGradient.addColorStop(0,'#0000');
  vignetteGradient.addColorStop(1,'#25170d42');
  updateProjectionCache();
}
addEventListener('resize',resize,{passive:true});
resize();

function getImage(src){
  if(!src) return null;
  if(imageCache.has(src)) return imageCache.get(src);
  const img=new Image();
  img.decoding='async';
  img.src=src;
  imageCache.set(src,img);
  return img;
}

function getPattern(src,img){
  const key=src;
  if(patternCache.has(key)) return patternCache.get(key);
  if(!img?.complete||!img.naturalWidth) return null;
  const pattern=ctx.createPattern(img,'repeat');
  if(pattern) patternCache.set(key,pattern);
  return pattern;
}

async function preloadVisualAssets(){
  const urls=new Set();
  for(const material of Object.values(modelLibrary?.materials||{})){
    if(material.texture) urls.add(material.texture+'?v=0.35');
  }
  for(const npc of Object.values(sprites?.npcs||{})){
    for(const action of Object.values(npc.atlas?.actions||{})){
      if(action.source) urls.add(action.source.replace(/v=0\.\d+/,'v=0.35'));
    }
  }
  for(const p of Object.values(sprites?.players||{})){
    for(const layer of p.layers||[]){
      for(const src of Object.values(layer.actions||{})) urls.add(src+'?v=0.35');
    }
  }
  const decodes=[];
  for(const url of urls){
    const img=getImage(url);
    if(typeof img.decode==='function') decodes.push(img.decode().catch(()=>{}));
  }
  await Promise.allSettled(decodes);
}

function project(x,y,z){
  const dx=x-camera.x,dz=z-camera.z;
  const rx=dx*projection.cy-dz*projection.sy;
  const rz=dx*projection.sy+dz*projection.cy;
  return {
    x:projection.halfW+rx*camera.zoom,
    y:projection.halfH+(rz*projection.cp-y*projection.sp)*camera.zoom,
    depth:rz*projection.sp+y*projection.cp
  };
}

function unprojectGround(screenX,screenY){
  if(!world) return null;
  const rx=(screenX-projection.halfW)/camera.zoom;
  let y=0,wx=0,wz=0;
  for(let i=0;i<3;i++){
    const rz=((screenY-projection.halfH)/camera.zoom+y*projection.sp)/Math.max(.08,projection.cp);
    const dx=rx*projection.cy+rz*projection.sy;
    const dz=-rx*projection.sy+rz*projection.cy;
    wx=camera.x+dx;
    wz=camera.z+dz;
    y=heightAt(wx,wz);
  }
  return {x:wx,z:wz,y};
}

function beginPath(points){
  ctx.beginPath();
  for(let i=0;i<points.length;i++){
    const p=points[i];
    if(i) ctx.lineTo(p.x,p.y); else ctx.moveTo(p.x,p.y);
  }
  ctx.closePath();
}

function poly(points,fill,stroke=null,lineWidth=1){
  beginPath(points);
  ctx.fillStyle=fill;
  ctx.fill();
  if(stroke){
    ctx.strokeStyle=stroke;
    ctx.lineWidth=lineWidth;
    ctx.stroke();
  }
}

function clippedFill(points,fillStyle,alpha=1){
  const bounds=screenBounds(points,1);
  if(!boundsVisible(bounds,viewportW,viewportH,perf.settings.cullMargin)) return false;
  const x0=Math.max(-2,bounds.x0),y0=Math.max(-2,bounds.y0);
  const x1=Math.min(viewportW+2,bounds.x1),y1=Math.min(viewportH+2,bounds.y1);
  if(x1<=x0||y1<=y0) return false;
  ctx.save();
  beginPath(points);
  ctx.clip();
  ctx.globalAlpha=alpha;
  ctx.fillStyle=fillStyle;
  ctx.fillRect(x0,y0,x1-x0,y1-y0);
  ctx.restore();
  return true;
}

function fogged(color,depth){
  if(!effectiveFog()) return color;
  return mixColor(color,world.fog.color,fogFactor(depth,world.fog)*.72);
}

function lit(color,normal,depth,extra=1){
  const factor=showLighting?lightFactor(normal,world.lighting,sun):1;
  return fogged(shadeColor(color,factor*extra),depth);
}

function facePattern(face,img,src){
  const pattern=getPattern(src,img);
  if(!pattern) return null;
  if(typeof pattern.setTransform==='function'&&typeof DOMMatrix!=='undefined'&&face.points?.length>=2){
    const a=face.points[0],b=face.points[1];
    let cx=0,cy=0;
    for(const p of face.points){cx+=p.x;cy+=p.y}
    cx/=face.points.length;cy/=face.points.length;
    const angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
    const edge=Math.max(1,Math.hypot(b.x-a.x,b.y-a.y));
    const scale=Math.max(.58,Math.min(2.0,edge/104));
    pattern.setTransform(new DOMMatrix().translate(cx,cy).rotate(angle).scale(scale,scale).translate(-cx,-cy));
  }
  return pattern;
}

function prepareTerrain(){
  terrainCells=[];
  terrainEdges=[];
  const t=world.terrain;

  for(let z=0;z<t.rows;z++){
    for(let x=0;x<t.cols;x++){
      const h00=heightAt(x,z);
      const h10=heightAt(x+1,z);
      const h11=heightAt(x+1,z+1);
      const h01=heightAt(x,z+1);
      const path=isPathAt(t,x+.5,z+.5);
      const jitter=((x*17+z*29)%9)-4;
      const baseColor=path?t.pathColor:shadeColor(t.baseColor,1+jitter*.008);
      const normal=terrainNormal(heightAt,x+.5,z+.5,.22);
      const sunLight=lightFactor(normal,world.lighting,sun);
      const localLight=pointLightContribution(
        {x:x+.5,y:heightAt(x+.5,z+.5),z:z+.5},
        world.lights
      );
      terrainCells.push({
        x,z,path,baseColor,normal,sunLight,localLight,
        verts:[
          {x,y:h00,z},{x:x+1,y:h10,z},
          {x:x+1,y:h11,z:z+1},{x,y:h01,z:z+1}
        ]
      });
    }
  }

  const skirt=-1.15;
  for(let x=0;x<t.cols;x++){
    for(const z of [0,t.rows]){
      terrainEdges.push([
        {x,y:heightAt(x,z),z},
        {x:x+1,y:heightAt(x+1,z),z},
        {x:x+1,y:skirt,z},
        {x,y:skirt,z}
      ]);
    }
  }
  for(let z=0;z<t.rows;z++){
    for(const x of [0,t.cols]){
      terrainEdges.push([
        {x,y:heightAt(x,z),z},
        {x,y:heightAt(x,z+1),z:z+1},
        {x,y:skirt,z:z+1},
        {x,y:skirt,z}
      ]);
    }
  }
}

function prepareModels(){
  preparedMeshes.clear();
  for(const model of world.models||[]){
    if(model.renderMode!=='mesh'||!model.meshId) continue;
    const prepared=prepareMeshInstance(
      modelLibrary,model,heightAt,lightFactor,world.lighting,sun,world.lights
    );
    if(prepared) preparedMeshes.set(model.id,prepared);
  }
}

function preparePalisade(){
  palisadeGroups=[];
  for(const segment of world.palisade||[]){
    const dx=segment.x2-segment.x1,dz=segment.z2-segment.z1;
    const len=Math.hypot(dx,dz);
    const count=Math.max(1,Math.floor(len/.46));
    const posts=[];
    for(let i=0;i<=count;i++){
      const t=i/count;
      const x=segment.x1+dx*t,z=segment.z1+dz*t;
      posts.push({x,z,y:heightAt(x,z)});
    }
    palisadeGroups.push({
      segment,
      posts,
      cx:(segment.x1+segment.x2)*.5,
      cz:(segment.z1+segment.z2)*.5
    });
  }
}

function modelVisible(prepared){
  if(!prepared) return true;
  const p=project(prepared.center.x,prepared.center.y,prepared.center.z);
  const r=Math.max(50,prepared.radius*camera.zoom*1.15);
  return p.x+r>=-perf.settings.cullMargin&&p.x-r<=viewportW+perf.settings.cullMargin&&
    p.y+r>=-perf.settings.cullMargin&&p.y-r<=viewportH+perf.settings.cullMargin;
}

function drawTexturedMeshFace(face){
  const bounds=screenBounds(face.points,1);
  if(!boundsVisible(bounds,viewportW,viewportH,perf.settings.cullMargin)) return;

  clippedFill(face.points,face.color,1);

  if(perf.settings.meshTextures){
    const texSrc=face.material?.texture;
    if(texSrc){
      const url=texSrc+'?v=0.35';
      const img=getImage(url);
      if(img?.complete&&img.naturalWidth){
        const pattern=facePattern(face,img,url);
        if(pattern) clippedFill(face.points,pattern,perf.settings.meshTextureAlpha);
      }
    }
  }

  if(showLighting){
    if(face.light<1){
      clippedFill(face.points,'rgba(19,13,9,'+Math.min(.48,(1-face.light)*.66)+')',1);
    }else if(face.light>1){
      clippedFill(face.points,'rgba(255,231,177,'+Math.min(.18,(face.light-1)*.30)+')',1);
    }

    if(perf.settings.pointLights&&face.localLight?.intensity>0){
      clippedFill(
        face.points,
        face.localLight.color,
        Math.min(.30,face.localLight.intensity*.24)
      );
    }
  }

  if(effectiveFog()&&face.fog>0){
    clippedFill(face.points,world.fog.color,Math.min(.68,face.fog*.68));
  }

  if(perf.settings.id!=='performance'){
    beginPath(face.points);
    ctx.strokeStyle='#2e211550';
    ctx.lineWidth=1;
    ctx.stroke();
  }
}

function drawMeshModel(model){
  const prepared=preparedMeshes.get(model.id);
  if(!prepared||!modelVisible(prepared)) return false;
  const faces=projectPreparedMesh(
    prepared,project,world.fog,showLighting,effectiveFog()
  );
  if(!faces.length) return false;

  if(perf.settings.shadows){
    const shadow=modelShadowSize(model);
    drawGroundShadow(model.x,model.z,shadow.w,shadow.d,.22);
  }

  faces.sort((a,b)=>a.depth-b.depth);
  for(const face of faces) drawTexturedMeshFace(face);
  return true;
}

function drawGroundCell(cell,points,depth){
  const bounds=screenBounds(points,1);
  if(!boundsVisible(bounds,viewportW,viewportH,perf.settings.cullMargin)) return;

  let color=showLighting?shadeColor(cell.baseColor,cell.sunLight):cell.baseColor;
  if(effectiveFog()) color=mixColor(color,world.fog.color,fogFactor(depth,world.fog)*.72);

  beginPath(points);
  ctx.fillStyle=color;
  ctx.fill();

  if(perf.settings.terrainTextures){
    const textureSrc=cell.path?world.terrain.pathTexture:world.terrain.texture;
    if(textureSrc){
      const url=textureSrc+'?v=0.35';
      const img=getImage(url);
      if(img?.complete&&img.naturalWidth){
        const pattern=getPattern(url,img);
        if(pattern){
          ctx.save();
          beginPath(points);
          ctx.clip();
          ctx.globalAlpha=perf.settings.terrainTextureAlpha;
          ctx.globalCompositeOperation='multiply';
          ctx.fillStyle=pattern;
          const x0=Math.max(-2,bounds.x0),y0=Math.max(-2,bounds.y0);
          const x1=Math.min(viewportW+2,bounds.x1),y1=Math.min(viewportH+2,bounds.y1);
          if(x1>x0&&y1>y0) ctx.fillRect(x0,y0,x1-x0,y1-y0);
          ctx.restore();
        }
      }
    }
  }

  if(showLighting&&perf.settings.pointLights&&cell.localLight.intensity>0){
    clippedFill(points,cell.localLight.color,Math.min(.26,cell.localLight.intensity*.21));
  }

  if(showGrid){
    beginPath(points);
    ctx.strokeStyle='#5c431c66';
    ctx.lineWidth=1;
    ctx.stroke();
  }
}

function drawGround(){
  const projected=[];
  for(const cell of terrainCells){
    const points=cell.verts.map(v=>project(v.x,v.y,v.z));
    const bounds=screenBounds(points,2);
    if(!boundsVisible(bounds,viewportW,viewportH,perf.settings.cullMargin)) continue;
    let depth=0;
    for(const p of points) depth+=p.depth;
    depth/=points.length;
    projected.push({cell,points,depth});
  }

  if(perf.settings.id!=='performance') projected.sort((a,b)=>a.depth-b.depth);
  for(const item of projected) drawGroundCell(item.cell,item.points,item.depth);

  if(perf.settings.id==='performance') return;
  for(const edge of terrainEdges){
    const points=edge.map(v=>project(v.x,v.y,v.z));
    const bounds=screenBounds(points,1);
    if(!boundsVisible(bounds,viewportW,viewportH,20)) continue;
    let depth=0;for(const p of points)depth+=p.depth;depth/=points.length;
    poly(points,fogged('#7b552b',depth),'#4f351e33');
  }
}

function drawGroundShadow(x,z,w=1,d=1,opacity=null){
  if(!perf.settings.shadows) return;
  const y=heightAt(x,z)+.012;
  const p=project(x,y,z);
  if(p.x<-120||p.x>viewportW+120||p.y<-120||p.y>viewportH+120) return;
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

function drawFire(model,now){
  if(perf.settings.shadows) drawGroundShadow(model.x,model.z,1,1,.16);
  const y=heightAt(model.x,model.z);
  const base=project(model.x,y+.05,model.z);
  if(base.x<-80||base.x>viewportW+80||base.y<-100||base.y>viewportH+100) return;

  if(perf.settings.id!=='performance'){
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;
      const p=project(model.x+Math.cos(a)*.38,y+.08,model.z+Math.sin(a)*.3);
      ctx.fillStyle=fogged(i%2?'#756657':'#8a7763',p.depth);
      ctx.beginPath();ctx.ellipse(p.x,p.y,5,3,0,0,Math.PI*2);ctx.fill();
    }
  }

  const flicker=Math.sin(now*.013)*3;
  const top=project(model.x,y+.9+flicker/camera.zoom,model.z);
  const mid=project(model.x,y+.45,model.z);
  ctx.beginPath();
  ctx.moveTo(base.x-11,base.y);ctx.quadraticCurveTo(mid.x-13,mid.y,top.x,top.y);
  ctx.quadraticCurveTo(mid.x+12,mid.y,base.x+11,base.y);ctx.closePath();
  ctx.fillStyle='#ef6d2d';ctx.fill();
  ctx.beginPath();
  ctx.moveTo(base.x-6,base.y-1);ctx.quadraticCurveTo(mid.x-4,mid.y+2,top.x,top.y+9);
  ctx.quadraticCurveTo(mid.x+6,mid.y+2,base.x+6,base.y-1);ctx.closePath();
  ctx.fillStyle='#ffd45b';ctx.fill();
}

function drawModel(model,now){
  if(model.renderMode==='mesh') return drawMeshModel(model);
  if(model.type==='fire') return drawFire(model,now);
  return false;
}

function drawPalisade(group){
  const stride=Math.max(1,perf.settings.palisadeStride|0);
  const posts=group.posts;
  for(let i=0;i<posts.length;i+=stride){
    const post=posts[i];
    const a=project(post.x,post.y,post.z);
    if(a.x<-50||a.x>viewportW+50||a.y<-80||a.y>viewportH+80) continue;
    const b=project(post.x,post.y+1.15,post.z);
    const tip=project(post.x,post.y+1.38,post.z);
    ctx.strokeStyle=lit('#785331',{x:0,y:1,z:0},b.depth,.86);
    ctx.lineWidth=Math.max(1.4,camera.zoom*.065);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.fillStyle=fogged('#5e3d27',tip.depth);
    ctx.beginPath();ctx.moveTo(b.x-2.5,b.y);ctx.lineTo(tip.x,tip.y);ctx.lineTo(b.x+2.5,b.y);ctx.closePath();ctx.fill();
  }
}

function drawAtlasSprite(meta,x,z,worldDir,frame=0,scale=.72){
  if(!meta?.atlas) return;
  const cfg=meta.atlas.actions?.idle;
  if(!cfg) return;
  const p=project(x,heightAt(x,z),z);
  if(p.x<-100||p.x>viewportW+100||p.y<-140||p.y>viewportH+100) return;

  const dirIndex=visibleDirectionIndex(worldDir,camera.yaw);
  const direction=(meta.atlas.directionOrder||DIRS)[dirIndex];
  const row=(meta.atlas.directionOrder||DIRS).indexOf(direction);
  const img=getImage(cfg.source.replace(/v=0\.\d+/,'v=0.35'));
  if(!img?.complete) return;

  if(perf.settings.shadows) drawGroundShadow(x,z,.72,.45,.20);
  const fw=meta.atlas.frame.width,fh=meta.atlas.frame.height;
  const zoomScale=camera.zoom/Math.max(1,Number(world.camera.zoom||46));
  const worldScale=scale*zoomScale;
  const dw=fw*worldScale,dh=fh*worldScale;
  const fogAlpha=1-(effectiveFog()?fogFactor(p.depth,world.fog)*.38:0);
  ctx.save();
  ctx.globalAlpha=Math.max(.58,fogAlpha);
  ctx.drawImage(img,(frame%cfg.frames)*fw,row*fh,fw,fh,p.x-dw*.5,p.y-dh+3,dw,dh);
  ctx.restore();
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
  if(perf.settings.shadows) drawGroundShadow(player.x,player.z,.78,.46,.22);

  const zoomScale=camera.zoom/Math.max(1,Number(world.camera.zoom||46));
  const scale=.80*zoomScale,fw=meta.canvas.width,fh=meta.canvas.height;
  const dw=fw*scale,dh=fh*scale;
  const layers=[...meta.layers].sort((a,b)=>resolveCharacterLayerZ(a,direction)-resolveCharacterLayerZ(b,direction));
  for(const layer of layers){
    const src=layer.actions?.[player.action]||layer.actions?.idle;
    const img=getImage((src||'')+'?v=0.35');
    if(!img?.complete) continue;
    const row=meta.directionOrder.indexOf(direction);
    const fogAlpha=1-(effectiveFog()?fogFactor(p.depth,world.fog)*.38:0);
    ctx.save();
    ctx.globalAlpha=Math.max(.58,fogAlpha);
    ctx.drawImage(img,player.frame*fw,row*fh,fw,fh,p.x-dw*.5,p.y-dh+3,dw,dh);
    ctx.restore();
  }
}

function drawSelector(){
  if(!pointerCell||!world) return;
  const x=pointerCell.x,z=pointerCell.z;
  if(x<0||z<0||x>=world.terrain.cols||z>=world.terrain.rows) return;
  const points=[
    project(x,heightAt(x,z)+.018,z),
    project(x+1,heightAt(x+1,z)+.018,z),
    project(x+1,heightAt(x+1,z+1)+.018,z+1),
    project(x,heightAt(x,z+1)+.018,z+1)
  ];
  if(!boundsVisible(screenBounds(points,2),viewportW,viewportH,10)) return;
  ctx.save();
  ctx.setLineDash([5,3]);
  poly(points,'rgba(242,202,72,.06)','#f3d35cbb',1.5);
  ctx.restore();
}

function buildQueue(now){
  const queue=[];
  for(const model of world.models||[]){
    const prepared=preparedMeshes.get(model.id);
    if(prepared&&!modelVisible(prepared)) continue;
    const p=project(model.x,heightAt(model.x,model.z)+Number(model.h||1)*.35,model.z);
    if(p.x<-180||p.x>viewportW+180||p.y<-180||p.y>viewportH+180) continue;
    queue.push({kind:'model',ref:model,depth:p.depth});
  }

  for(const group of palisadeGroups){
    const p=project(group.cx,heightAt(group.cx,group.cz)+.6,group.cz);
    if(p.x<-260||p.x>viewportW+260||p.y<-180||p.y>viewportH+180) continue;
    queue.push({kind:'palisade',ref:group,depth:p.depth});
  }

  for(const actor of world.actors||[]){
    const p=project(actor.x,heightAt(actor.x,actor.z)+.65,actor.z);
    if(p.x<-100||p.x>viewportW+100||p.y<-140||p.y>viewportH+100) continue;
    queue.push({kind:'actor',ref:actor,depth:p.depth});
  }

  const pp=project(player.x,heightAt(player.x,player.z)+.7,player.z);
  queue.push({kind:'player',ref:player,depth:pp.depth});
  queue.sort((a,b)=>a.depth-b.depth);
  return queue;
}

function drawAtmosphere(){
  ctx.fillStyle=atmosphereGradient||'#c89a5a';
  ctx.fillRect(0,0,viewportW,viewportH);
}

function drawVignette(){
  if(perf.settings.id==='performance') return;
  ctx.fillStyle=vignetteGradient;
  ctx.fillRect(0,0,viewportW,viewportH);
}

function render(now){
  drawAtmosphere();
  drawGround();
  drawSelector();

  const queue=buildQueue(now);
  for(const item of queue){
    if(item.kind==='model') drawModel(item.ref,now);
    else if(item.kind==='palisade') drawPalisade(item.ref);
    else if(item.kind==='actor'){
      const actor=item.ref;
      const meta=sprites?.npcs?.[actor.id];
      const scale=actor.id==='child'?.62:actor.id==='guard'?.78:.72;
      if(meta?.mode==='atlas') drawAtlasSprite(meta,actor.x,actor.z,actor.dir,Math.floor(now/250),scale);
    }else if(item.kind==='player'){
      drawLayeredPlayer(now);
    }
  }
  drawVignette();
}

function update(dt,now){
  let dx=0,dz=0;
  if(keys.has('w'))dz-=1;
  if(keys.has('s'))dz+=1;
  if(keys.has('a'))dx-=1;
  if(keys.has('d'))dx+=1;

  if(dx||dz){
    const len=Math.hypot(dx,dz)||1;
    dx/=len;dz/=len;
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

  if(now-lastReadoutAt>=120){
    lastReadoutAt=now;
    const readout=document.querySelector('#cameraReadout');
    if(readout){
      const deg=((Math.round(camera.yaw*180/Math.PI)%360)+360)%360;
      readout.textContent='Câmera '+deg+'° · pitch '+Math.round(camera.pitch*180/Math.PI)+'° · zoom '+camera.zoom.toFixed(0);
    }
    const cell=document.querySelector('#cellReadout');
    if(cell) cell.textContent=pointerCell?'GAT-like: '+pointerCell.x+', '+pointerCell.z:'GAT-like: —';
  }
}

function updateQualityUI(){
  const button=document.querySelector('#qualityButton');
  if(button) button.textContent='Qualidade: '+perf.label;
  const shell=document.querySelector('.ro25d-shell');
  if(shell){
    shell.dataset.quality=perf.effective;
    shell.dataset.qualityRequested=perf.requested;
  }
}

function updatePerfUI(now){
  if(now-lastPerfReadoutAt<350) return;
  lastPerfReadoutAt=now;
  const node=document.querySelector('#perfReadout');
  if(node){
    node.textContent='Render '+Math.round(perf.avgFps)+' FPS · '+perf.avgCost.toFixed(1)+' ms · DPR '+Math.min(devicePixelRatio||1,perf.settings.dprMax).toFixed(2);
  }
  updateQualityUI();
}

function loop(now){
  if(document.hidden){
    last=now;
    requestAnimationFrame(loop);
    return;
  }

  const dt=Math.min(.04,(now-last)/1000);
  last=now;
  update(dt,now);
  updateProjectionCache();

  const start=performance.now();
  render(now);
  const end=performance.now();
  renderedFrames++;
  perf.recordRender(start,end);
  updatePerfUI(now);
  requestAnimationFrame(loop);
}

function rotate(steps){
  camera.yaw+=steps*degToRad(world.camera.rotationStepDeg||45);
  camera.yaw=(camera.yaw%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  updateProjectionCache();
}
function zoom(delta){
  camera.zoom=clamp(camera.zoom+delta,camera.minZoom,camera.maxZoom);
}
function pitch(deltaDeg){
  camera.pitch=clamp(camera.pitch+degToRad(deltaDeg),degToRad(38),degToRad(72));
  updateProjectionCache();
}

document.querySelector('#rotateLeft')?.addEventListener('click',()=>rotate(-1));
document.querySelector('#rotateRight')?.addEventListener('click',()=>rotate(1));
document.querySelector('#zoomIn')?.addEventListener('click',()=>zoom(5));
document.querySelector('#zoomOut')?.addEventListener('click',()=>zoom(-5));
document.querySelector('#pitchUp')?.addEventListener('click',()=>pitch(-4));
document.querySelector('#pitchDown')?.addEventListener('click',()=>pitch(4));
document.querySelector('#qualityButton')?.addEventListener('click',()=>perf.cycle());
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
  if(k==='q')rotate(-1);
  if(k==='e')rotate(1);
  if(k==='r')pitch(-3);
  if(k==='f')pitch(3);
  if(k==='g')showGrid=!showGrid;
});
addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));

canvas.addEventListener('wheel',event=>{
  event.preventDefault();
  if(event.shiftKey)pitch(event.deltaY<0?-3:3);
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
  if(!dragging)return;
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
    loadRoWorld('./assets/maps/judah/ro25d_world.json?v=0.35'),
    fetch('./assets/art/pixel/metadata/sprite_manifest.json?v=0.35',{cache:'no-store'}).then(r=>{
      if(!r.ok)throw new Error('Falha ao carregar sprite_manifest');
      return r.json();
    }),
    loadModelLibrary('./assets/art/ro25d/model_library.json?v=0.35')
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

  prepareTerrain();
  prepareModels();
  preparePalisade();
  resize();
  perf.notify();
  updateQualityUI();
  await preloadVisualAssets();
  last=performance.now();
  requestAnimationFrame(loop);
}

init().catch(error=>{
  console.error(error);
  ctx.fillStyle='#071019';
  ctx.fillRect(0,0,viewportW,viewportH);
  ctx.fillStyle='#ffe2a0';
  ctx.font='16px monospace';
  ctx.fillText('Falha ao carregar protótipo 2.5D: '+error.message,24,40);
});
