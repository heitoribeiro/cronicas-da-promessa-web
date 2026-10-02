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
    const response=await fetch('./assets/art/pixel/metadata/sprite_manifest.json?v=0.27',{cache:'no-store'});
    manifest=await response.json();
    meta=manifest.npcs.eliabe;
    document.querySelector('#characterName').textContent=meta.name;
    document.querySelector('#canvasInfo').textContent=`${meta.canvas.width}×${meta.canvas.height}`;
    document.querySelector('#pivotInfo').textContent=`${meta.pivot.x},${meta.pivot.y}`;
    render();
    requestAnimationFrame(tick);
  }catch(error){
    status.textContent='Falha ao carregar o manifesto: '+error.message;
    status.style.color='#ff9c7f';
  }
}
init();
