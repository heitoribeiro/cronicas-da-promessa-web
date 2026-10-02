import { resolveCharacterLayerZ } from './character-layers.js?v=0.31';

const DIRECTIONS=[['s','Sul / frente'],['sw','Sudoeste'],['w','Oeste'],['nw','Noroeste'],['n','Norte / costas'],['ne','Nordeste'],['e','Leste'],['se','Sudeste']];
const grid=document.querySelector('#directionGrid');
const sexSelect=document.querySelector('#sexSelect');
const actionSelect=document.querySelector('#actionSelect');
const pauseButton=document.querySelector('#pauseButton');
const gridButton=document.querySelector('#gridButton');
const layerToggles=document.querySelector('#layerToggles');
const status=document.querySelector('#status');

let manifest=null,meta=null,frame=0,paused=false,frameStarted=performance.now();
const hiddenLayers=new Set();

function buildCards(){
  grid.innerHTML='';
  DIRECTIONS.forEach(([dir,label],row)=>{
    const card=document.createElement('article');
    card.className='card';
    card.dataset.direction=dir;
    card.innerHTML=`<div class="stage grid"><div class="viewport"></div><span class="counter">0</span></div><h3>${label}</h3><small>${dir.toUpperCase()} · linha ${row}</small>`;
    grid.appendChild(card);
  });
}

function rebuildLayerToggles(){
  layerToggles.innerHTML='';
  for(const layer of meta.layers){
    const label=document.createElement('label');
    label.innerHTML=`<input type="checkbox" value="${layer.id}" ${hiddenLayers.has(layer.id)?'':'checked'}> ${layer.id}`;
    label.querySelector('input').addEventListener('change',event=>{
      if(event.target.checked) hiddenLayers.delete(layer.id); else hiddenLayers.add(layer.id);
      render();
    });
    layerToggles.appendChild(label);
  }
}

function ensureLayers(card){
  const viewport=card.querySelector('.viewport');
  for(const layer of meta.layers){
    let node=viewport.querySelector(`[data-layer="${layer.id}"]`);
    if(!node){
      node=document.createElement('span');
      node.className='layer';
      node.dataset.layer=layer.id;
      node.innerHTML='<img alt="">';
      viewport.appendChild(node);
    }
  }
}

function render(){
  if(!meta) return;
  const action=actionSelect.value;
  const cfg=meta.actions[action];
  const fw=meta.canvas.width,fh=meta.canvas.height;
  const sheetW=fw*cfg.frames,sheetH=fh*meta.directionOrder.length;

  document.querySelectorAll('.card').forEach(card=>{
    ensureLayers(card);
    const dir=card.dataset.direction;
    const row=meta.directionOrder.indexOf(dir);
    for(const layer of meta.layers){
      const node=card.querySelector(`[data-layer="${layer.id}"]`);
      const img=node.querySelector('img');
      const src=layer.actions[action]+'?v=0.31';
      img.src=src;
      img.style.width=sheetW+'px';
      img.style.height=sheetH+'px';
      img.style.transform=`translate(${-frame*fw}px,${-row*fh}px)`;
      node.style.zIndex=String(resolveCharacterLayerZ(layer,dir,{topGarment:layer.id==='garment'&&dir==='n'}));
      node.hidden=hiddenLayers.has(layer.id);
    }
    card.querySelector('.counter').textContent=`${frame+1}/${cfg.frames}`;
  });
  status.textContent=`${sexSelect.value.toUpperCase()} · ${action.toUpperCase()} · ${cfg.frames} frames · canvas ${fw}×${fh}`;
}

function selectCharacter(){
  meta=manifest.players[sexSelect.value];
  frame=0;
  frameStarted=performance.now();
  hiddenLayers.clear();
  rebuildLayerToggles();
  render();
}

function tick(now){
  if(meta&&!paused){
    const cfg=meta.actions[actionSelect.value];
    if(now-frameStarted>=cfg.frameMs){
      const steps=Math.floor((now-frameStarted)/cfg.frameMs);
      frame=(frame+steps)%cfg.frames;
      frameStarted+=steps*cfg.frameMs;
      render();
    }
  }
  requestAnimationFrame(tick);
}

sexSelect.addEventListener('change',selectCharacter);
actionSelect.addEventListener('change',()=>{frame=0;frameStarted=performance.now();render()});
pauseButton.addEventListener('click',()=>{paused=!paused;pauseButton.textContent=paused?'Continuar':'Pausar';if(!paused)frameStarted=performance.now()});
gridButton.addEventListener('click',()=>{
  const stages=[...document.querySelectorAll('.stage')];
  const on=stages[0]?.classList.contains('grid');
  stages.forEach(s=>s.classList.toggle('grid',!on));
  gridButton.textContent='Grade: '+(!on?'ligada':'desligada');
  gridButton.setAttribute('aria-pressed',String(!on));
});

async function init(){
  try{
    const res=await fetch('./assets/art/pixel/metadata/sprite_manifest.json?v=0.31',{cache:'no-store'});
    manifest=await res.json();
    buildCards();
    selectCharacter();
    requestAnimationFrame(tick);
  }catch(error){
    status.textContent='Falha: '+error.message;
    status.style.color='#ff9b7a';
  }
}
init();
