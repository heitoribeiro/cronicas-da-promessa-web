const DIRECTIONS=[
  ['s','Sul / frente'],
  ['sw','Sudoeste'],
  ['w','Oeste'],
  ['nw','Noroeste'],
  ['n','Norte / costas'],
  ['ne','Nordeste'],
  ['e','Leste'],
  ['se','Sudeste']
];

const grid=document.querySelector('#directionGrid');
const characterSelect=document.querySelector('#characterSelect');
const actionSelect=document.querySelector('#actionSelect');
const pauseButton=document.querySelector('#pauseButton');
const gridButton=document.querySelector('#gridButton');
const status=document.querySelector('#status');

let manifest=null;
let meta=null;
let paused=false;
let frame=0;
let frameStarted=performance.now();
let currentAction=actionSelect.value;
let currentCharacter='eliabe';

function makeCard([dir,label],row){
  const card=document.createElement('article');
  card.className='direction-card';
  card.dataset.direction=dir;
  card.innerHTML=`
    <div class="sprite-stage grid-on">
      <div class="sprite-viewport"><img class="sprite-sheet" alt="Eliabe olhando para ${label}"></div>
      <span class="frame-counter">0</span>
    </div>
    <h3>${label}</h3>
    <small>${dir.toUpperCase()} · linha ${row}</small>
  `;
  grid.appendChild(card);
}

DIRECTIONS.forEach(makeCard);

function syncActions(){
  const previous=currentAction;
  actionSelect.innerHTML='';
  for(const action of Object.keys(meta?.atlas?.actions || {})){
    const option=document.createElement('option');
    option.value=action;
    option.textContent=({idle:'Parado / Idle',walk:'Caminhada / Walk',talk:'Fala / Talk',work:'Trabalho / Work',ready:'Prontidão / Ready'})[action] || action;
    actionSelect.appendChild(option);
  }
  currentAction=meta?.atlas?.actions?.[previous] ? previous : Object.keys(meta?.atlas?.actions || {})[0];
  actionSelect.value=currentAction;
}

function loadCharacter(id){
  currentCharacter=id;
  meta=manifest?.npcs?.[id] || null;
  if(!meta?.atlas) return;
  document.querySelector('#characterName').textContent=meta.name;
  document.querySelector('#characterRole').textContent=({eliabe:'Artesão de Judá',elder:'Ancião de Judá',miria:'Moradora de Judá',hanan:'Trabalhador de Judá',guard:'Guarda de Judá'})[id] || 'NPC';
  document.querySelector('#canvasInfo').textContent=`${meta.canvas.width}×${meta.canvas.height}`;
  document.querySelector('#pivotInfo').textContent=`${meta.pivot.x},${meta.pivot.y}`;
  syncActions();
  frame=0;
  frameStarted=performance.now();
  render();
}

function render(){
  if(!meta) return;
  const cfg=meta.atlas.actions[currentAction];
  const fw=meta.atlas.frame.width;
  const fh=meta.atlas.frame.height;
  const sheetW=fw*cfg.frames;
  const sheetH=fh*meta.atlas.directionOrder.length;
  document.querySelectorAll('.direction-card').forEach(card=>{
    const dir=card.dataset.direction;
    const row=meta.atlas.directionOrder.indexOf(dir);
    const img=card.querySelector('.sprite-sheet');
    img.src=cfg.source;
    img.alt=`${meta.name} olhando para ${card.querySelector('h3').textContent}`;
    img.style.width=sheetW+'px';
    img.style.height=sheetH+'px';
    img.style.transform=`translate(${-frame*fw}px,${-row*fh}px)`;
    card.querySelector('.frame-counter').textContent=`${frame+1}/${cfg.frames}`;
  });
  status.textContent=`${currentAction.toUpperCase()} · ${cfg.frames} frames · ${cfg.frameMs} ms/frame`;
}

function tick(now){
  if(meta && !paused){
    const cfg=meta.atlas.actions[currentAction];
    if(now-frameStarted>=cfg.frameMs){
      const steps=Math.floor((now-frameStarted)/cfg.frameMs);
      frame=(frame+steps)%cfg.frames;
      frameStarted+=steps*cfg.frameMs;
      render();
    }
  }
  requestAnimationFrame(tick);
}

characterSelect.addEventListener('change',()=>loadCharacter(characterSelect.value));

actionSelect.addEventListener('change',()=>{
  currentAction=actionSelect.value;
  frame=0;
  frameStarted=performance.now();
  render();
});
pauseButton.addEventListener('click',()=>{
  paused=!paused;
  pauseButton.textContent=paused?'Continuar':'Pausar';
  if(!paused) frameStarted=performance.now();
});
gridButton.addEventListener('click',()=>{
  const stages=[...document.querySelectorAll('.sprite-stage')];
  const active=stages[0]?.classList.contains('grid-on');
  stages.forEach(stage=>stage.classList.toggle('grid-on',!active));
  gridButton.textContent='Grade: '+(!active?'ligada':'desligada');
  gridButton.setAttribute('aria-pressed',String(!active));
});

async function init(){
  try{
    const response=await fetch('./assets/art/pixel/metadata/sprite_manifest.json?v=0.31',{cache:'no-store'});
    manifest=await response.json();
    const available=Object.entries(manifest.npcs).filter(([,npc])=>npc.mode==='atlas' && npc.atlas);
    for(const [id,npc] of available){
      const option=document.createElement('option');
      option.value=id;
      option.textContent=npc.name;
      characterSelect.appendChild(option);
    }
    characterSelect.value=available.some(([id])=>id==='eliabe')?'eliabe':available[0]?.[0];
    loadCharacter(characterSelect.value);
    requestAnimationFrame(tick);
  }catch(error){
    status.textContent='Falha ao carregar o manifesto: '+error.message;
    status.style.color='#ff9c7f';
  }
}
init();
