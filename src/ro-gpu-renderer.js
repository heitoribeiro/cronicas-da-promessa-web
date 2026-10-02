import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { createHeightSampler, isPathAt, sunDirection, visibleDirectionIndex } from './ro-world-system.js?v=0.36';

const mount=document.querySelector('#gpuMount');
const fpsNode=document.querySelector('#gpuFps');
const drawsNode=document.querySelector('#gpuDraws');
const triNode=document.querySelector('#gpuTriangles');

const renderer=new THREE.WebGLRenderer({
  antialias:false,
  alpha:false,
  powerPreference:'high-performance',
  stencil:false,
  depth:true
});
renderer.setClearColor(0xc89a5a,1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=false;
renderer.info.autoReset=true;
mount.appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xc9a363);
scene.fog=new THREE.Fog(0xd7b77b,18,48);

const camera=new THREE.PerspectiveCamera(28,1,.1,160);
const cameraState={yaw:0,distance:23,height:18};
const keys=new Set();

let world=null;
let library=null;
let sprites=null;
let heightAt=()=>0;
let playerSex='female';
const player={x:14,z:12.8,dir:4,action:'idle',frame:0,frameAt:0};
const actorVisuals=[];
const playerLayers=[];
const textureCache=new Map();
const materialCache=new Map();
const pointLightObjects=[];
let worldFog=null;
let avgFps=60,lastFrame=performance.now(),fpsSampleAt=lastFrame,fpsFrames=0;
let quality='balanced';

function setRendererQuality(){
  const cap=quality==='high' ? 1.5 : quality==='performance' ? .75 : 1.0;
  renderer.setPixelRatio(Math.max(.65,Math.min(window.devicePixelRatio||1,cap)));
  renderer.setSize(innerWidth,innerHeight,false);
  camera.aspect=innerWidth/Math.max(1,innerHeight);
  camera.updateProjectionMatrix();
  scene.fog=quality==='performance' ? null : worldFog;
  for(const light of pointLightObjects) light.visible=quality!=='performance';
}
addEventListener('resize',setRendererQuality,{passive:true});

function loadTexture(url){
  if(textureCache.has(url)) return textureCache.get(url);
  const tex=new THREE.TextureLoader().load(url);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.magFilter=THREE.NearestFilter;
  tex.minFilter=THREE.NearestFilter;
  tex.generateMipmaps=false;
  tex.wrapS=THREE.RepeatWrapping;
  tex.wrapT=THREE.RepeatWrapping;
  textureCache.set(url,tex);
  return tex;
}

function materialFor(id){
  if(materialCache.has(id)) return materialCache.get(id);
  const def=library.materials[id]||{color:'#a08060'};
  const params={
    color:new THREE.Color(def.color||'#a08060'),
    flatShading:true,
    side:THREE.DoubleSide
  };
  if(def.texture) params.map=loadTexture(def.texture+'?v=0.36');
  const mat=new THREE.MeshLambertMaterial(params);
  materialCache.set(id,mat);
  return mat;
}

function resolveMaterialId(model,slot){
  return model.materials?.[slot]||model.materialOverrides?.[slot]||slot;
}

function faceUvCoordinates(src,ids){
  const verts=ids.map(i=>src.vertices[i]);
  const a=verts[0],b=verts[1],d=verts[2];
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
  const vx=d[0]-a[0],vy=d[1]-a[1],vz=d[2]-a[2];
  const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  const ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);

  let projectUv;
  if(ay>=ax&&ay>=az) projectUv=v=>[v[0],v[2]];
  else if(ax>=az) projectUv=v=>[v[2],v[1]];
  else projectUv=v=>[v[0],v[1]];

  const raw=verts.map(projectUv);
  let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;
  for(const uv of raw){
    if(uv[0]<minU)minU=uv[0];if(uv[0]>maxU)maxU=uv[0];
    if(uv[1]<minV)minV=uv[1];if(uv[1]>maxV)maxV=uv[1];
  }
  const du=Math.max(.0001,maxU-minU),dv=Math.max(.0001,maxV-minV);
  return raw.map(uv=>[(uv[0]-minU)/du,(uv[1]-minV)/dv]);
}

function appendModelToBatches(model,batches){
  const src=library.meshes[model.meshId];
  if(!src) return;

  const angle=THREE.MathUtils.degToRad(Number(model.rotationY||0));
  const ca=Math.cos(angle),sa=Math.sin(angle);
  const sx=Number(model.w||1)*(model.scale?.x??1);
  const sy=Number(model.h||1)*(model.scale?.y??1);
  const sz=Number(model.d||1)*(model.scale?.z??1);
  const baseY=heightAt(model.x,model.z);

  for(const face of src.faces){
    const ids=face.v;
    if(!ids||ids.length<3) continue;
    const matId=resolveMaterialId(model,face.m);
    let bucket=batches.get(matId);
    if(!bucket){
      bucket={positions:[],uvs:[]};
      batches.set(matId,bucket);
    }

    const faceUvs=faceUvCoordinates(src,ids);
    for(let i=1;i<ids.length-1;i++){
      for(const localIndex of [0,i,i+1]){
        const idx=ids[localIndex];
        const v=src.vertices[idx];
        const lx=v[0]*sx,lz=v[2]*sz;
        const rx=lx*ca-lz*sa,rz=lx*sa+lz*ca;
        bucket.positions.push(model.x+rx,baseY+v[1]*sy,model.z+rz);
        bucket.uvs.push(faceUvs[localIndex][0],faceUvs[localIndex][1]);
      }
    }
  }
}

function buildTerrain(){
  const t=world.terrain;
  const positions=[];
  const colors=[];
  const indices=[];
  const cols=t.cols,rows=t.rows;

  for(let z=0;z<=rows;z++){
    for(let x=0;x<=cols;x++){
      positions.push(x,heightAt(x,z),z);
      const path=isPathAt(t,Math.min(cols-.001,x+.01),Math.min(rows-.001,z+.01));
      const color=new THREE.Color(path?t.pathColor:t.baseColor);
      colors.push(color.r,color.g,color.b);
    }
  }
  const stride=cols+1;
  for(let z=0;z<rows;z++){
    for(let x=0;x<cols;x++){
      const a=z*stride+x,b=a+1,d=(z+1)*stride+x,c=d+1;
      indices.push(a,d,b,b,d,c);
    }
  }

  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geo,mat);
  mesh.matrixAutoUpdate=false;
  mesh.updateMatrix();
  scene.add(mesh);
}

function buildLights(){
  scene.add(new THREE.AmbientLight(0xffe9c2,Number(world.lighting?.ambient||.5)*1.25));
  const s=sunDirection(world.lighting||{});
  const dl=new THREE.DirectionalLight(0xffe4b0,1.4);
  dl.position.set(-s.x*18,Math.max(8,s.y*22),-s.z*18);
  scene.add(dl);

  for(const l of world.lights||[]){
    const light=new THREE.PointLight(l.color||'#ffb060',Number(l.intensity||.4)*4,Number(l.range||4),2);
    light.position.set(l.x,l.y||1,l.z);
    pointLightObjects.push(light);
    scene.add(light);
  }
}

function cloneAtlasTexture(src,frames,dirs){
  const tex=loadTexture(src.replace(/v=0\.\d+/,'v=0.36')).clone();
  tex.needsUpdate=true;
  tex.wrapS=THREE.RepeatWrapping;
  tex.wrapT=THREE.RepeatWrapping;
  tex.magFilter=THREE.NearestFilter;
  tex.minFilter=THREE.NearestFilter;
  tex.generateMipmaps=false;
  tex.repeat.set(1/frames,1/dirs);
  return tex;
}

function setAtlasFrame(tex,frame,row,frames,dirs){
  tex.repeat.set(1/frames,1/dirs);
  tex.offset.x=(frame%frames)/frames;
  tex.offset.y=1-(row+1)/dirs;
}

function createNpcSprite(actor){
  const meta=sprites.npcs?.[actor.id];
  const cfg=meta?.atlas?.actions?.idle;
  if(!meta?.atlas||!cfg) return null;
  const dirs=meta.atlas.directionOrder.length;
  const tex=cloneAtlasTexture(cfg.source,cfg.frames,dirs);
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,alphaTest:.02,depthTest:true,depthWrite:false});
  const sprite=new THREE.Sprite(mat);
  const h=actor.id==='child'?1.35:1.85;
  const ratio=meta.atlas.frame.width/meta.atlas.frame.height;
  sprite.scale.set(h*ratio,h,1);
  sprite.position.set(actor.x,heightAt(actor.x,actor.z)+h*.5,actor.z);
  sprite.renderOrder=10;
  scene.add(sprite);
  return {actor,meta,cfg,tex,sprite,lastKey:''};
}

function clearPlayerLayers(){
  for(const item of playerLayers){
    scene.remove(item.sprite);
    for(const tex of Object.values(item.textures||{})) tex.dispose?.();
    item.sprite.material.dispose?.();
  }
  playerLayers.length=0;
}

function buildPlayerLayers(){
  clearPlayerLayers();
  const meta=sprites.players[playerSex];
  if(!meta) return;
  const h=1.9;
  const ratio=meta.canvas.width/meta.canvas.height;
  meta.layers.forEach((layer,index)=>{
    const textures={};
    for(const action of Object.keys(meta.actions||{})){
      const cfg=meta.actions[action];
      const src=layer.actions[action]||layer.actions.idle;
      if(src) textures[action]=cloneAtlasTexture(src,cfg.frames,meta.directionOrder.length);
    }
    const tex=textures.idle||Object.values(textures)[0];
    const mat=new THREE.SpriteMaterial({map:tex,transparent:true,alphaTest:.02,depthWrite:false,depthTest:true});
    const sprite=new THREE.Sprite(mat);
    sprite.scale.set(h*ratio,h,1);
    sprite.position.set(player.x,heightAt(player.x,player.z)+h*.5+index*.001,player.z);
    sprite.renderOrder=20+index;
    scene.add(sprite);
    playerLayers.push({layer,textures,tex,mat,sprite,lastAction:'idle'});
  });
}

function refreshPlayerAtlas(){
  const meta=sprites.players[playerSex];
  const cfg=meta.actions[player.action]||meta.actions.idle;
  const row=visibleDirectionIndex(player.dir,cameraState.yaw);
  const h=1.9;
  playerLayers.forEach((item,index)=>{
    const nextTex=item.textures[player.action]||item.textures.idle;
    if(nextTex&&nextTex!==item.tex){
      item.tex=nextTex;
      item.mat.map=nextTex;
      item.mat.needsUpdate=true;
    }
    if(item.tex) setAtlasFrame(item.tex,player.frame,row,cfg.frames,meta.directionOrder.length);
    item.sprite.position.set(player.x,heightAt(player.x,player.z)+h*.5+index*.001,player.z);
  });
}

function updateNpcSprites(now){
  for(const visual of actorVisuals){
    const row=visibleDirectionIndex(visual.actor.dir,cameraState.yaw);
    const frame=Math.floor(now/visual.cfg.frameMs)%visual.cfg.frames;
    const key=frame+'|'+row;
    if(key!==visual.lastKey){
      visual.lastKey=key;
      setAtlasFrame(visual.tex,frame,row,visual.cfg.frames,visual.meta.atlas.directionOrder.length);
    }
  }
}

function buildWorldModels(){
  const batches=new Map();
  for(const model of world.models||[]){
    if(model.renderMode!=='mesh'||!model.meshId) continue;
    appendModelToBatches(model,batches);
  }

  for(const [matId,bucket] of batches){
    if(!bucket.positions.length) continue;
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(bucket.positions,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(bucket.uvs,2));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    const mesh=new THREE.Mesh(geo,materialFor(matId));
    mesh.frustumCulled=true;
    mesh.matrixAutoUpdate=false;
    mesh.updateMatrix();
    scene.add(mesh);
  }
}

function updateCamera(){
  const targetY=heightAt(player.x,player.z)+.6;
  const y=cameraState.yaw;
  camera.position.set(
    player.x+Math.sin(y)*cameraState.distance,
    targetY+cameraState.height,
    player.z+Math.cos(y)*cameraState.distance
  );
  camera.lookAt(player.x,targetY,player.z);
}

function updatePlayer(dt,now){
  let dx=0,dz=0;
  if(keys.has('w'))dz-=1;
  if(keys.has('s'))dz+=1;
  if(keys.has('a'))dx-=1;
  if(keys.has('d'))dx+=1;

  if(dx||dz){
    const len=Math.hypot(dx,dz)||1;dx/=len;dz/=len;
    const speed=3.1;
    player.x=Math.max(.5,Math.min(world.terrain.cols-.5,player.x+dx*speed*dt));
    player.z=Math.max(.5,Math.min(world.terrain.rows-.5,player.z+dz*speed*dt));
    const angle=Math.atan2(dz,dx)*180/Math.PI;
    if(angle>=-22.5&&angle<22.5)player.dir=6;
    else if(angle>=22.5&&angle<67.5)player.dir=7;
    else if(angle>=67.5&&angle<112.5)player.dir=0;
    else if(angle>=112.5&&angle<157.5)player.dir=1;
    else if(angle>=157.5||angle<-157.5)player.dir=2;
    else if(angle>=-157.5&&angle<-112.5)player.dir=3;
    else if(angle>=-112.5&&angle<-67.5)player.dir=4;
    else player.dir=5;
    if(player.action!=='walk'){player.action='walk';player.frame=0;player.frameAt=now}
  }else if(player.action!=='idle'){
    player.action='idle';player.frame=0;player.frameAt=now;
  }

  const meta=sprites.players[playerSex];
  const cfg=meta.actions[player.action]||meta.actions.idle;
  if(now-player.frameAt>=cfg.frameMs){
    const steps=Math.floor((now-player.frameAt)/cfg.frameMs);
    player.frame=(player.frame+steps)%cfg.frames;
    player.frameAt+=steps*cfg.frameMs;
  }
  refreshPlayerAtlas();
}

function updateHud(now){
  fpsFrames++;
  if(now-fpsSampleAt>=500){
    const fps=fpsFrames*1000/(now-fpsSampleAt);
    avgFps=avgFps*.65+fps*.35;
    fpsFrames=0;fpsSampleAt=now;
    fpsNode.textContent=Math.round(avgFps)+' FPS';
    drawsNode.textContent=renderer.info.render.calls+' draw calls';
    triNode.textContent=renderer.info.render.triangles+' triângulos';
  }
}

function loop(now){
  if(document.hidden){lastFrame=now;return}
  const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
  updatePlayer(dt,now);
  updateNpcSprites(now);
  updateCamera();
  renderer.render(scene,camera);
  updateHud(now);
}

function rotateCamera(step){
  cameraState.yaw=(cameraState.yaw+step*Math.PI/4)%(Math.PI*2);
}
function zoom(delta){cameraState.distance=Math.max(13,Math.min(34,cameraState.distance+delta))}

document.querySelector('#gpuRotateLeft').onclick=()=>rotateCamera(-1);
document.querySelector('#gpuRotateRight').onclick=()=>rotateCamera(1);
document.querySelector('#gpuZoomIn').onclick=()=>zoom(-2);
document.querySelector('#gpuZoomOut').onclick=()=>zoom(2);
document.querySelector('#gpuSex').onclick=e=>{
  playerSex=playerSex==='female'?'male':'female';
  e.currentTarget.textContent='Personagem: '+(playerSex==='female'?'Feminino':'Masculino');
  buildPlayerLayers();
};
document.querySelector('#gpuQuality').onclick=e=>{
  quality=quality==='balanced'?'performance':quality==='performance'?'high':'balanced';
  e.currentTarget.textContent='GPU: '+({balanced:'Equilibrado',performance:'Desempenho',high:'Alta'})[quality];
  setRendererQuality();
};

addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();keys.add(k);
  if(k==='q')rotateCamera(-1);
  if(k==='e')rotateCamera(1);
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?2:-2)},{passive:false});

async function init(){
  [world,library,sprites]=await Promise.all([
    fetch('./assets/maps/judah/ro25d_world.json?v=0.36',{cache:'no-store'}).then(r=>r.json()),
    fetch('./assets/art/ro25d/model_library.json?v=0.36',{cache:'no-store'}).then(r=>r.json()),
    fetch('./assets/art/pixel/metadata/sprite_manifest.json?v=0.36',{cache:'no-store'}).then(r=>r.json())
  ]);
  heightAt=createHeightSampler(world.terrain);
  worldFog=new THREE.Fog(
    world.fog?.color||0xd7b77b,
    Math.max(12,Number(world.fog?.near||13)*1.15),
    Math.max(36,Number(world.fog?.far||26)*1.8)
  );
  scene.fog=worldFog;
  Object.assign(player,world.playerSpawn,{frameAt:performance.now()});

  buildTerrain();
  buildWorldModels();
  buildLights();
  for(const actor of world.actors||[]){
    const visual=createNpcSprite(actor);
    if(visual) actorVisuals.push(visual);
  }
  buildPlayerLayers();
  setRendererQuality();
  updateCamera();
  renderer.setAnimationLoop(loop);
}

init().catch(error=>{
  console.error(error);
  fpsNode.textContent='Falha WebGL';
  document.querySelector('.gpu-hud p').textContent='Não foi possível iniciar o laboratório GPU: '+error.message;
});
