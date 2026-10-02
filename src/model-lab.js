import { loadModelLibrary, buildMeshFaces } from './ro-mesh-system.js?v=0.35';
import { sunDirection } from './ro-world-system.js?v=0.35';

const canvas=document.querySelector('#modelCanvas');
const ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;

const select=document.querySelector('#modelSelect');
const preset=document.querySelector('#presetSelect');
const status=document.querySelector('#status');
const imageCache=new Map();

let library=null;
let modelId='tent';
let modelYaw=0;
let cameraYaw=0;
let zoom=115;
let wire=false;
let textures=true;
let dragging=false;
let lastX=0;

const lighting={longitudeDeg:320,latitudeDeg:48,ambient:.52,diffuse:.48};
const fog={enabled:false,near:99,far:100,color:'#d7b77b'};
const sun=sunDirection(lighting);
const heightAt=()=>0;

function getImage(src){
  if(imageCache.has(src)) return imageCache.get(src);
  const img=new Image();img.src=src;imageCache.set(src,img);return img;
}
function project(x,y,z){
  const cy=Math.cos(cameraYaw),sy=Math.sin(cameraYaw);
  const rx=x*cy-z*sy,rz=x*sy+z*cy;
  const pitch=58*Math.PI/180,cp=Math.cos(pitch),sp=Math.sin(pitch);
  return {x:canvas.width/2+rx*zoom,y:canvas.height*.68+(rz*cp-y*sp)*zoom,depth:rz*sp+y*cp};
}
function begin(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath()}
function materialOverrides(){
  const p=preset.value;
  if(modelId==='tent'){
    if(p==='green') return {wall:'cloth_cream',roof:'cloth_green',trim:'wood_dark'};
    if(p==='blue') return {wall:'cloth_cream',roof:'cloth_blue',trim:'wood_dark'};
    if(p==='ochre') return {wall:'cloth_cream',roof:'cloth_ochre',trim:'gold'};
    return {wall:'cloth_cream',roof:'cloth_red',trim:'gold'};
  }
  if(modelId==='judah_standard_tent'){
    return {
      wall:'cloth_cream',
      roof:'cloth_cream',
      stripe:p==='green'?'cloth_green':p==='blue'?'cloth_blue':p==='ochre'?'cloth_ochre':'cloth_judah',
      trim:'gold',curtain:'cloth_red',pole:'wood_dark',rope:'rope',
      banner:'cloth_judah',emblem:'judah_emblem'
    };
  }
  if(modelId==='workshop') return {wall:'cloth_cream',roof:'wood_dark',trim:'wood'};
  if(modelId==='watchtower') return {wood:'wood',wood_dark:'wood_dark',roof:'cloth_ochre'};
  if(modelId==='judah_watchtower') return {wood:'wood',wood_dark:'wood_dark',roof:'cloth_ochre',pole:'wood_dark',banner:'cloth_judah'};
  if(modelId==='judah_gate') return {wood:'wood',wood_dark:'wood_dark',door:'wood_dark',cloth_red:'cloth_judah',emblem:'judah_emblem',bronze:'bronze'};
  if(modelId==='judah_banner') return {pole:'wood_dark',banner:'cloth_judah',emblem:'judah_emblem'};
  if(modelId==='amphora_cluster') return {pottery:'pottery',pottery_dark:'pottery_dark'};
  if(modelId==='rug') return {rug:'rug_judah'};
  if(modelId==='weapon_rack') return {wood:'wood',wood_dark:'wood_dark',pole:'wood_dark',bronze:'bronze'};
  return {};
}
function drawFace(face){
  begin(face.points);
  ctx.save();ctx.clip();
  ctx.fillStyle=face.color;ctx.fillRect(0,0,canvas.width,canvas.height);
  if(textures&&face.material?.texture){
    const img=getImage(face.material.texture+'?v=0.35');
    if(img.complete&&img.naturalWidth){
      const pattern=ctx.createPattern(img,'repeat');
      if(pattern){ctx.globalAlpha=.9;ctx.fillStyle=pattern;ctx.fillRect(0,0,canvas.width,canvas.height)}
    }
  }
  if(face.light<1){
    ctx.fillStyle='rgba(15,10,7,'+Math.min(.55,(1-face.light)*.72)+')';
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  ctx.restore();
  begin(face.points);
  ctx.strokeStyle=wire?'#ffd75f':'#2f21155e';
  ctx.lineWidth=wire?2:1;
  ctx.stroke();
}
function drawGround(){
  const a=project(-2.6,0,-2.3),b=project(2.6,0,-2.3),c=project(2.6,0,2.3),d=project(-2.6,0,2.3);
  begin([a,b,c,d]);ctx.fillStyle='#b98a4d';ctx.fill();ctx.strokeStyle='#6f4d29';ctx.stroke();
  const p=project(0,.01,0);ctx.save();ctx.translate(p.x+10,p.y+8);ctx.scale(1,.32);ctx.beginPath();ctx.ellipse(0,0,70,25,0,0,Math.PI*2);ctx.fillStyle='#2e1d143e';ctx.fill();ctx.restore();
}
function render(){
  if(!library)return;
  ctx.fillStyle='#c59a5c';ctx.fillRect(0,0,canvas.width,canvas.height);
  drawGround();

  const model={x:0,z:0,w:2.5,h:2.5,d:2.5,meshId:modelId,rotationY:modelYaw*180/Math.PI,materials:materialOverrides()};
  if(modelId==='gate'||modelId==='judah_gate'){model.w=3.2;model.h=2.5;model.d=.9}
  if(modelId==='watchtower'||modelId==='judah_watchtower'){model.w=2.0;model.h=3.0;model.d=2.0}
  if(modelId==='well'){model.w=1.7;model.h=1.4;model.d=1.7}
  if(modelId==='crate'){model.w=1.3;model.h=1.2;model.d=1.3}
  if(modelId==='acacia'){model.w=2.3;model.h=3.0;model.d=2.0}
  if(modelId==='rock'){model.w=1.8;model.h=1.1;model.d=1.5}
  if(modelId==='bench'){model.w=2.4;model.h=.9;model.d=.8}
  if(modelId==='workshop'){model.w=3.0;model.h=2.0;model.d=2.2}
  if(modelId==='judah_standard_tent'){model.w=4.4;model.h=3.15;model.d=3.0}
  if(modelId==='judah_banner'){model.w=.9;model.h=2.2;model.d=.25}
  if(modelId==='amphora_cluster'){model.w=1.2;model.h=1.1;model.d=1.2}
  if(modelId==='rug'){model.w=3.0;model.h=.06;model.d=1.5}
  if(modelId==='weapon_rack'){model.w=1.7;model.h=1.7;model.d=.6}

  const faces=buildMeshFaces(library,model,heightAt,project,(n,l,s)=>{
    const dot=Math.max(0,n.x*s.x+n.y*s.y+n.z*s.z);
    return Math.min(1.25,l.ambient+dot*l.diffuse);
  },lighting,sun,fog,true,false);
  faces.sort((a,b)=>a.depth-b.depth).forEach(drawFace);

  const mesh=library.meshes[modelId];
  document.querySelector('#modelName').textContent=modelId;
  document.querySelector('#vertCount').textContent=mesh.vertices.length;
  document.querySelector('#faceCount').textContent=mesh.faces.length;
  document.querySelector('#modelYaw').textContent=Math.round(modelYaw*180/Math.PI)+'°';
  document.querySelector('#cameraYaw').textContent=Math.round(cameraYaw*180/Math.PI)+'°';
  status.textContent='mesh '+modelId+' · '+mesh.vertices.length+' vértices · '+mesh.faces.length+' faces';
}

function changeModel(){
  modelId=select.value;
  modelYaw=0;
  preset.disabled=!(modelId==='tent'||modelId==='judah_standard_tent');
  render();
}

document.querySelector('#rotLeft').onclick=()=>{modelYaw-=Math.PI/4;render()};
document.querySelector('#rotRight').onclick=()=>{modelYaw+=Math.PI/4;render()};
document.querySelector('#camLeft').onclick=()=>{cameraYaw-=Math.PI/4;render()};
document.querySelector('#camRight').onclick=()=>{cameraYaw+=Math.PI/4;render()};
document.querySelector('#wireButton').onclick=e=>{wire=!wire;e.currentTarget.textContent='Wire: '+(wire?'on':'off');render()};
document.querySelector('#textureButton').onclick=e=>{textures=!textures;e.currentTarget.textContent='Textura: '+(textures?'on':'off');render()};
select.onchange=changeModel;preset.onchange=render;

canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX;lastX=e.clientX;modelYaw+=dx*.01;render()});
canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(65,Math.min(180,zoom+(e.deltaY<0?8:-8)));render()},{passive:false});

async function init(){
  library=await loadModelLibrary('./assets/art/ro25d/model_library.json?v=0.35');
  for(const id of Object.keys(library.meshes)){
    const option=document.createElement('option');option.value=id;option.textContent=id;select.appendChild(option);
  }
  select.value='judah_standard_tent';changeModel();
  setInterval(render,220);
}
init().catch(error=>status.textContent='Falha: '+error.message);
