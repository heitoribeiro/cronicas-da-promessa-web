const app = document.querySelector('#app');
const SAVE = 'cronicas-promessa-save-v3';
const tribes = ['Rúben','Simeão','Levi','Judá','Dã','Naftali','Gade','Aser','Issacar','Zebulom','José','Benjamim'];
const vocations = ['Pastor','Agricultor','Coletor','Levita'];

const QUESTS = [
  { id:'fire', label:'Vá até a fogueira central.', target:{x:900,y:590,r:110}, action:'Examinar fogueira' },
  { id:'eliabe', label:'Fale com Eliabe, o artesão, na oficina.', target:{x:1330,y:760,r:115}, action:'Falar com Eliabe' },
  { id:'well', label:'Busque água no poço para ajudar o curral.', target:{x:900,y:825,r:105}, action:'Retirar água' },
  { id:'corral', label:'Leve a água para a Criança do Rebanho.', target:{x:455,y:790,r:120}, action:'Falar com a Criança do Rebanho' },
  { id:'elder', label:'Apresente-se ao Ancião junto à Tenda do Estandarte.', target:{x:900,y:300,r:125}, action:'Falar com o Ancião' },
  { id:'complete', label:'Missão concluída: você conheceu o Acampamento de Judá.' }
];

let state = {
  profile: null,
  x: 900,
  y: 980,
  day: 1,
  time: 480,
  inventory: {},
  reputation: 0,
  questStep: 0,
  visited: {}
};

function $(selector) { return document.querySelector(selector); }

function normalizeState() {
  state.inventory ||= {};
  state.visited ||= {};
  if (!Number.isInteger(state.questStep)) state.questStep = 0;
  if (!Number.isFinite(state.reputation)) state.reputation = 0;
  if (!Number.isFinite(state.time)) state.time = 480;
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch (error) {
    console.warn('Falha ao carregar save local:', error);
  }
  normalizeState();
}

function save() {
  try { localStorage.setItem(SAVE, JSON.stringify(state)); }
  catch (error) { console.warn('Falha ao salvar progresso:', error); }
}

function isTouch() {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function renderFatal(error) {
  console.error(error);
  app.innerHTML = `
    <main class="screen"><section class="panel">
      <h1 class="title" style="font-size:36px">CRÔNICAS DA PROMESSA</h1>
      <p class="subtitle">O jogo encontrou um erro de inicialização.</p>
      <div class="menu"><button class="btn" id="reloadGame">RECARREGAR</button></div>
      <p class="subtitle" style="font-size:13px">Web Alpha 0.7</p>
    </section></main>`;
  $('#reloadGame')?.addEventListener('click', () => location.reload());
}

window.addEventListener('error', event => {
  if (!app.innerHTML.trim()) renderFatal(event.error || new Error(event.message));
});
window.addEventListener('unhandledrejection', event => {
  if (!app.innerHTML.trim()) renderFatal(event.reason || new Error('Erro desconhecido'));
});

function menu() {
  app.innerHTML = `
    <main class="screen">
      <section class="panel">
        <h1 class="title">CRÔNICAS DA PROMESSA</h1>
        <p class="subtitle">Um povo em caminho. Muitas histórias para viver.</p>
        <div class="menu">
          <button class="btn" id="newGame">NOVA JORNADA</button>
          <button class="btn secondary" id="continueGame" ${state.profile ? '' : 'disabled'}>CONTINUAR</button>
        </div>
        <p class="subtitle">Web Alpha 0.7 • Judá vivo</p>
      </section>
    </main>`;

  $('#newGame').addEventListener('click', createCharacter);
  if (state.profile) $('#continueGame').addEventListener('click', game);
}

function createCharacter() {
  app.innerHTML = `
    <main class="screen">
      <section class="panel">
        <h2 class="title" style="font-size:36px">SUA JORNADA COMEÇA AQUI</h2>
        <div class="form">
          <label>NOME<input id="characterName" maxlength="22" placeholder="Seu nome" autocomplete="off"/></label>
          <div class="row">
            <label>PERSONAGEM<select id="characterSex"><option>Masculino</option><option>Feminino</option></select></label>
            <label>TRIBO DE ISRAEL<select id="characterTribe">${tribes.map(t => `<option ${t === 'Judá' ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          </div>
          <label>VOCAÇÃO<select id="characterVocation">${vocations.map(v => `<option>${v}</option>`).join('')}</select></label>
          <div class="row">
            <button class="btn secondary" id="backButton">VOLTAR</button>
            <button class="btn" id="startButton">INICIAR JORNADA</button>
          </div>
        </div>
      </section>
    </main>`;

  $('#backButton').addEventListener('click', menu);
  $('#startButton').addEventListener('click', () => {
    const nameInput = $('#characterName');
    const value = nameInput.value.trim();
    if (!value) return nameInput.focus();

    state = {
      profile: {
        name: value,
        sex: $('#characterSex').value,
        tribe: $('#characterTribe').value,
        vocation: $('#characterVocation').value
      },
      x: 900, y: 980, day: 1, time: 480,
      inventory: {}, reputation: 0, questStep: 0, visited: {}
    };
    save();
    game();
  });
}

function dialogue(title, text, button='Continuar') {
  const modal = $('#dialogue');
  if (!modal) return;
  modal.innerHTML = `<div class="dialogue-card"><div class="dialogue-name">${title}</div><div class="dialogue-text">${text}</div><button class="dialogue-button">${button}</button></div>`;
  modal.classList.remove('hidden');
  modal.querySelector('button').addEventListener('click', () => modal.classList.add('hidden'), { once:true });
}

function game() {
  if (!state.profile) return createCharacter();
  normalizeState();
  const playerSexSlug = state.profile.sex === 'Feminino' ? 'female' : 'male';
  const playerAsset = `./assets/art/characters/${playerSexSlug}_down_1.svg`;

  app.innerHTML = `
    <main class="game">
      <div class="world" id="world">
        <div class="dune dune-a"></div><div class="dune dune-b"></div><div class="dune dune-c"></div>
        <div class="district district-council"></div><div class="district district-family"></div>
        <div class="district district-corral"></div><div class="district district-workshop"></div>

        <div class="palisade pal-n"></div><div class="palisade pal-w"></div><div class="palisade pal-e"></div>
        <div class="palisade pal-s1"></div><div class="palisade pal-s2"></div>
        <img class="scenic-asset tower-asset tower-nw" src="./assets/art/judah/watchtower.svg" alt="">
        <img class="scenic-asset tower-asset tower-ne" src="./assets/art/judah/watchtower.svg" alt="">
        <img class="scenic-asset tower-asset tower-sw" src="./assets/art/judah/watchtower.svg" alt="">
        <img class="scenic-asset tower-asset tower-se" src="./assets/art/judah/watchtower.svg" alt="">
        <div class="gate"><span></span><span></span></div>

        <div class="path main-v"></div><div class="path main-h"></div><div class="court"></div>

        <img class="scenic-asset standard-tent-asset" style="left:730px;top:75px" src="./assets/art/judah/judah_standard_tent.svg" alt="Tenda do Estandarte">
        <img class="scenic-asset family-tent-asset council-tent-asset" style="left:265px;top:215px" src="./assets/art/judah/family_tent.svg" alt="Tenda do Conselho">
        <img class="scenic-asset family-tent-asset" style="left:1125px;top:190px" src="./assets/art/judah/family_tent.svg" alt="Tenda familiar">
        <img class="scenic-asset family-tent-asset family-small" style="left:1340px;top:292px" src="./assets/art/judah/family_tent.svg" alt="">
        <img class="scenic-asset family-tent-asset family-small" style="left:1188px;top:370px" src="./assets/art/judah/family_tent.svg" alt="">

        <img class="scenic-asset warehouse-asset" style="left:260px;top:438px" src="./assets/art/judah/warehouse.svg" alt="Armazém">
        <img class="scenic-asset warehouse-asset warehouse-small" style="left:445px;top:480px" src="./assets/art/judah/warehouse.svg" alt="Armazém">
        <img class="scenic-asset workshop-asset" style="left:1190px;top:650px" src="./assets/art/judah/workshop.svg" alt="Oficina">
        <div class="corral" style="left:245px;top:690px">
          <i class="animal sheep a1"></i><i class="animal sheep a2"></i><i class="animal goat a3"></i><i class="trough"></i>
        </div>

        <img class="scenic-asset campfire-asset" style="left:842px;top:520px" src="./assets/art/judah/campfire.svg" alt="Fogueira central">
        <div class="bench" style="left:760px;top:540px"></div><div class="bench" style="left:1005px;top:640px"></div>
        <img class="scenic-asset well-asset" style="left:820px;top:744px" src="./assets/art/judah/well.svg" alt="Poço de Judá">

        <img class="scenic-asset flora-asset acacia-asset" style="left:72px;top:135px" src="./assets/art/judah/acacia.svg" alt="">
        <img class="scenic-asset flora-asset acacia-asset small-flora" style="left:1510px;top:145px" src="./assets/art/judah/acacia.svg" alt="">
        <img class="scenic-asset flora-asset acacia-asset" style="left:58px;top:820px" src="./assets/art/judah/acacia.svg" alt="">
        <img class="scenic-asset flora-asset acacia-asset small-flora" style="left:1495px;top:820px" src="./assets/art/judah/acacia.svg" alt="">
        <img class="scenic-asset flora-asset shrub-asset" style="left:185px;top:515px" src="./assets/art/judah/desert_shrub.svg" alt="">
        <img class="scenic-asset flora-asset shrub-asset" style="left:1465px;top:555px" src="./assets/art/judah/desert_shrub.svg" alt="">
        <img class="scenic-asset flora-asset shrub-asset mini-flora" style="left:675px;top:930px" src="./assets/art/judah/desert_shrub.svg" alt="">
        <img class="scenic-asset flora-asset shrub-asset mini-flora" style="left:1050px;top:945px" src="./assets/art/judah/desert_shrub.svg" alt="">
        <img class="scenic-asset prop-art rock-art" style="left:585px;top:245px" src="./assets/art/judah/rock_cluster.svg" alt="">
        <img class="scenic-asset prop-art rock-art small-rock" style="left:1050px;top:830px" src="./assets/art/judah/rock_cluster.svg" alt="">
        <img class="scenic-asset prop-art supply-art" style="left:470px;top:560px" src="./assets/art/judah/supply_stack.svg" alt="">
        <div class="jar" style="left:1125px;top:500px"></div><div class="crate" style="left:510px;top:620px"></div>
        <div class="torch" style="left:790px;top:690px"></div><div class="torch" style="left:1010px;top:690px"></div>

        <div class="cook-area" style="left:430px;top:535px"><span class="cook-pot"></span></div>
        <div class="rug rug-standard" style="left:835px;top:355px"></div>
        <div class="rug rug-family" style="left:1180px;top:500px"></div>
        <div class="clay-cluster" style="left:1110px;top:548px"><i></i><i></i><i></i></div>
        <div class="supply-pile" style="left:515px;top:575px"><i></i><i></i></div>
        <div class="tribe-banner banner-left" style="left:675px;top:330px"></div>
        <div class="tribe-banner banner-right" style="left:1080px;top:360px"></div>

        <div class="npc npc-elder" style="left:890px;top:292px"><img src="./assets/art/npcs/elder.svg" alt="Ancião"><b>Ancião</b></div>
        <div class="npc npc-eliabe" style="left:1320px;top:745px"><img src="./assets/art/npcs/eliabe.svg" alt="Eliabe"><b>Eliabe</b></div>
        <div class="npc npc-child" style="left:445px;top:780px"><img src="./assets/art/npcs/herd_child.svg" alt="Criança do Rebanho"><b>Rebanho</b></div>
        <div class="npc npc-miria" style="left:1245px;top:420px"><img src="./assets/art/npcs/miria.svg" alt="Miriã"><b>Miriã</b></div>
        <div class="npc npc-hanan" style="left:520px;top:535px"><img src="./assets/art/npcs/hanan.svg" alt="Hanan"><b>Hanan</b></div>
        <div class="npc npc-guard" style="left:820px;top:1015px"><img src="./assets/art/npcs/guard.svg" alt="Guarda"><b>Guarda</b></div>

        <div class="zone-label standard-zone">Tenda do Estandarte</div>
        <div class="zone-label council-zone">Conselho</div><div class="zone-label family-zone">Tendas familiares</div>
        <div class="zone-label corral-zone">Currais</div><div class="zone-label workshop-zone">Oficinas</div>

        <div class="player player-art" id="player"><img src="${playerAsset}" alt="Personagem"></div>
      </div>

      <div class="hud">
        <b>${state.profile.name}</b> • Tribo de ${state.profile.tribe} • ${state.profile.vocation}<br>
        Dia ${state.day} • <span id="clock"></span> • Rep. <span id="rep">${state.reputation}</span>
      </div>

      <div class="objective" id="objective"></div>
      <div class="inventory-mini" id="inventoryMini"></div>
      <div class="prompt hidden" id="prompt"></div>
      <button class="game-menu" id="gameMenu">☰</button>

      <div class="touch hidden" id="touchControls">
        <button data-k="w">▲</button>
        <div><button data-k="a">◀</button><button data-k="s">▼</button><button data-k="d">▶</button></div>
      </div>

      <button class="action hidden" id="actionButton">AÇÃO</button>
      <div class="dialogue hidden" id="dialogue"></div>
      <div class="badge">Web Alpha 0.7</div>
    </main>`;

  const world = $('#world');
  const player = $('#player');
  const prompt = $('#prompt');
  const touchControls = $('#touchControls');
  const actionButton = $('#actionButton');
  const clock = $('#clock');
  const rep = $('#rep');
  const objective = $('#objective');
  const inventoryMini = $('#inventoryMini');
  const menuButton = $('#gameMenu');
  const keys = new Set();

  if (isTouch()) touchControls.classList.remove('hidden');

  let activeInteraction = null;

  const ambientInteractions = [
    { id:'miria', npc:'miria', r:105, action:'Falar com Miriã', run:()=>dialogue('Miriã — a cuidadora','As famílias chegaram cedo hoje. Um acampamento cresce quando cada pessoa cuida um pouco do outro.') },
    { id:'hanan', npc:'hanan', r:105, action:'Falar com Hanan', run:()=>dialogue('Hanan — o cozinheiro','O cheiro do pão traz gente para perto. Volte mais tarde e talvez eu precise de algumas ervas.') },
    { id:'guard', npc:'guard', r:105, action:'Falar com o Guarda', run:()=>dialogue('Guarda de Judá','A entrada está tranquila. O estandarte no alto indica o coração do nosso setor.') },
    { id:'standard', x:900,y:205,r:150, action:'Observar Tenda do Estandarte', run:()=>dialogue('Tenda do Estandarte','O vermelho e o dourado destacam o setor de Judá. O estandarte do leão marca o ponto de liderança da tribo.') },
    { id:'workshop', x:1325,y:735,r:150, action:'Examinar oficina', run:()=>dialogue('Oficina de Judá','Madeira, metal, couro e ferramentas ocupam cada bancada. O trabalho de Eliabe mantém o acampamento em movimento.') },
    { id:'warehouse', x:380,y:505,r:145, action:'Examinar armazém', run:()=>dialogue('Armazéns','Mantimentos, tecidos, jarros e peças de reposição são organizados para atender as famílias do setor.') },
    { id:'corral-look', x:420,y:820,r:165, action:'Observar rebanho', run:()=>dialogue('Currais','Ovelhas e cabras descansam entre cercas, cochos e recipientes de água. O rebanho sustenta parte importante da vida cotidiana.') },
    { id:'well-look', x:900,y:825,r:120, action:'Examinar poço', run:()=>dialogue('Poço de Judá','Água fresca é retirada em turnos ao longo do dia. Jarros e barris permanecem próximos para o abastecimento.') }
  ];

  const npcAgents = {
    elder: { el:$('.npc-elder'), x:890, y:292, route:[[890,292],[835,325],[930,330]], target:1, speed:.34 },
    eliabe:{ el:$('.npc-eliabe'),x:1320,y:745,route:[[1320,745],[1370,780],[1275,790]],target:1,speed:.42 },
    child: { el:$('.npc-child'), x:445, y:780, route:[[445,780],[360,825],[510,835],[420,745]], target:1, speed:.45 },
    miria: { el:$('.npc-miria'), x:1245,y:420,route:[[1245,420],[1325,445],[1190,470],[1270,390]],target:1,speed:.38 },
    hanan: { el:$('.npc-hanan'), x:520,y:535,route:[[520,535],[455,560],[570,575]],target:1,speed:.30 },
    guard: { el:$('.npc-guard'), x:820,y:1015,route:[[820,1015],[980,1015],[900,965]],target:1,speed:.48 }
  };

  function moveNpc(agent, dt) {
    const target = agent.route[agent.target];
    const dx = target[0]-agent.x, dy = target[1]-agent.y;
    const dist = Math.hypot(dx,dy);
    if (dist < 4) {
      agent.target = (agent.target + 1) % agent.route.length;
      agent.el.classList.remove('npc-walking');
      return;
    }
    const step = Math.min(dist, agent.speed * dt * 1.5);
    agent.x += dx/dist * step;
    agent.y += dy/dist * step;
    agent.el.style.left = agent.x + 'px';
    agent.el.style.top = agent.y + 'px';
    agent.el.classList.add('npc-walking');
    agent.el.classList.toggle('face-left', dx < -1);
    agent.el.classList.toggle('face-right', dx > 1);
  }

  const PLAYER_RADIUS = 20;
  const obstacles = [
    {type:'rect',x:755,y:150,w:292,h:144},
    {type:'rect',x:280,y:274,w:190,h:112},
    {type:'rect',x:1145,y:248,w:180,h:108},
    {type:'rect',x:1360,y:344,w:142,h:94},
    {type:'rect',x:1200,y:420,w:142,h:92},
    {type:'rect',x:275,y:485,w:160,h:88},
    {type:'rect',x:460,y:522,w:133,h:74},
    {type:'rect',x:1210,y:700,w:235,h:146},
    {type:'rect',x:748,y:548,w:128,h:34},
    {type:'rect',x:995,y:647,w:126,h:34},
    {type:'circle',x:900,y:820,r:54},
    {type:'circle',x:900,y:590,r:48},
    {type:'circle',x:489,y:570,r:50}
  ];

  function circleHitsRect(px,py,r,o) {
    const cx = Math.max(o.x, Math.min(px, o.x + o.w));
    const cy = Math.max(o.y, Math.min(py, o.y + o.h));
    return Math.hypot(px-cx, py-cy) < r;
  }

  function canStand(px,py) {
    if (px < 135 || px > 1665 || py < 95 || py > 1085) return false;
    const hitsWorld = obstacles.some(o => o.type === 'circle'
      ? Math.hypot(px-o.x,py-o.y) < PLAYER_RADIUS + o.r
      : circleHitsRect(px,py,PLAYER_RADIUS,o));
    if (hitsWorld) return false;
    return !Object.values(npcAgents).some(npc => Math.hypot(px-npc.x,py-npc.y) < PLAYER_RADIUS + 24);
  }

  function refreshHud() {
    const quest = QUESTS[Math.min(state.questStep, QUESTS.length - 1)];
    objective.textContent = quest.label;
    rep.textContent = state.reputation;
    const items = [];
    if (state.inventory.lenha) items.push(`Lenha ×${state.inventory.lenha}`);
    if (state.inventory.agua) items.push(`Água ×${state.inventory.agua}`);
    inventoryMini.textContent = items.length ? items.join(' • ') : 'Bolsa vazia';
  }

  function advanceQuest(reward=0) {
    if (reward) state.reputation += reward;
    state.questStep = Math.min(state.questStep + 1, QUESTS.length - 1);
    save();
    refreshHud();
  }

  function runQuestInteraction() {
    switch (state.questStep) {
      case 0:
        state.inventory.lenha = (state.inventory.lenha || 0) + 1;
        dialogue('Fogueira central','Você observa o centro do acampamento. A fogueira reúne viajantes, famílias e trabalhadores. Você separa um pequeno feixe de lenha para ajudar a mantê-la acesa.');
        advanceQuest(2);
        break;
      case 1:
        dialogue('Eliabe — o artesão','Bem-vindo. Ferramentas quebram, tendas rasgam, carroças cedem... sempre existe algo para consertar. Antes de seguir, leve água ao curral. Eles estão precisando.');
        advanceQuest(2);
        break;
      case 2:
        state.inventory.agua = (state.inventory.agua || 0) + 1;
        dialogue('Poço de Judá','Você baixa o balde e retira água fresca. Agora pode levá-la ao curral.');
        advanceQuest(1);
        break;
      case 3:
        state.inventory.agua = Math.max(0,(state.inventory.agua || 0) - 1);
        dialogue('Criança do Rebanho','Obrigado! Os animais estavam com sede. O Ancião pediu que todo recém-chegado se apresente junto à Tenda do Estandarte.');
        advanceQuest(2);
        break;
      case 4:
        dialogue('Ancião do Conselho',`${state.profile.name}, sua jornada começa entre pessoas comuns, trabalho diário e pequenas responsabilidades. Conheça este povo e faça do seu caminho uma história digna de ser lembrada.`,'Concluir');
        advanceQuest(5);
        break;
      default:
        dialogue('Acampamento de Judá','Você já conheceu os principais pontos do setor. Explore livremente enquanto novas histórias são preparadas.');
    }
  }

  function getActiveInteraction() {
    const quest = QUESTS[state.questStep];
    const questNpc = quest?.id === 'eliabe' ? npcAgents.eliabe : quest?.id === 'corral' ? npcAgents.child : quest?.id === 'elder' ? npcAgents.elder : null;
    if (quest?.target || questNpc) {
      const tx = questNpc ? questNpc.x : quest.target.x;
      const ty = questNpc ? questNpc.y : quest.target.y;
      const tr = questNpc ? 105 : quest.target.r;
      if (Math.hypot(state.x-tx,state.y-ty) < tr) return { action:quest.action, run:runQuestInteraction };
    }
    for (const item of ambientInteractions) {
      const npc = item.npc ? npcAgents[item.npc] : null;
      const tx = npc ? npc.x : item.x, ty = npc ? npc.y : item.y;
      if (Math.hypot(state.x-tx,state.y-ty) < item.r) return item;
    }
    return null;
  }

  function interact() {
    activeInteraction?.run?.();
  }

  function draw() {
    player.style.left = state.x + 'px';
    player.style.top = state.y + 'px';

    const baseZoom = isTouch() ? (innerWidth > innerHeight ? 0.78 : 0.62) : 0.9;
    const zoom = Math.min(1.15, Math.max(baseZoom, innerWidth / 1800, innerHeight / 1200));
    const viewW = innerWidth / zoom;
    const viewH = innerHeight / zoom;
    const cameraX = viewW >= 1800 ? 900 : Math.max(viewW / 2, Math.min(1800 - viewW / 2, state.x));
    const cameraY = viewH >= 1200 ? 600 : Math.max(viewH / 2, Math.min(1200 - viewH / 2, state.y));
    world.style.transform = `translate(${innerWidth / 2}px,${innerHeight / 2}px) scale(${zoom}) translate(${-cameraX}px,${-cameraY}px)`;

    activeInteraction = getActiveInteraction();
    prompt.classList.toggle('hidden', !activeInteraction);
    actionButton.classList.toggle('hidden', !activeInteraction || !isTouch());
    if (activeInteraction) prompt.textContent = isTouch() ? `AÇÃO — ${activeInteraction.action}` : `E — ${activeInteraction.action}`;

    const h = Math.floor(state.time / 60) % 24;
    const m = Math.floor(state.time % 60);
    clock.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  function onKeyDown(event) {
    keys.add(event.key.toLowerCase());
    if (event.key.toLowerCase() === 'e') interact();
    if (event.key === 'Escape') { save(); menu(); }
  }
  function onKeyUp(event) { keys.delete(event.key.toLowerCase()); }

  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  actionButton.addEventListener('click', interact);
  menuButton.addEventListener('click', () => { save(); menu(); });

  touchControls.querySelectorAll('button').forEach(button => {
    const key = button.dataset.k;
    const press = event => { event.preventDefault(); keys.add(key); };
    const release = event => { event.preventDefault(); keys.delete(key); };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
  });

  refreshHud();
  const playerImg = player.querySelector('img');
  let playerFacing = 'down';
  let playerFrame = 1;
  let lastPlayerFrame = 0;

  function updatePlayerSprite(dx,dy,now) {
    const moving = Boolean(dx || dy);
    if (moving) {
      if (Math.abs(dx) > Math.abs(dy)) playerFacing = dx < 0 ? 'left' : 'right';
      else playerFacing = dy < 0 ? 'up' : 'down';
      if (now - lastPlayerFrame > 165) {
        playerFrame = playerFrame === 1 ? 2 : 1;
        lastPlayerFrame = now;
      }
    } else {
      playerFrame = 1;
    }
    const src = `./assets/art/characters/${playerSexSlug}_${playerFacing}_${playerFrame}.svg`;
    if (!playerImg.src.endsWith(src.replace('./','/'))) playerImg.setAttribute('src',src);
    player.dataset.facing = playerFacing;
  }

  let last = performance.now();

  function tick(now) {
    if (!document.body.contains(player)) {
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      return;
    }
    const dt = Math.min((now-last)/16.67,2); last = now;
    const dialogOpen = !$('#dialogue').classList.contains('hidden');
    let dx=0,dy=0;
    if (!dialogOpen) {
      if (keys.has('a')||keys.has('arrowleft')) dx--;
      if (keys.has('d')||keys.has('arrowright')) dx++;
      if (keys.has('w')||keys.has('arrowup')) dy--;
      if (keys.has('s')||keys.has('arrowdown')) dy++;
    }
    player.classList.toggle('walking', Boolean(dx || dy));
    updatePlayerSprite(dx,dy,now);
    if (!dialogOpen) Object.values(npcAgents).forEach(agent => moveNpc(agent,dt));
    if (dx||dy) {
      const length = Math.hypot(dx,dy);
      const stepX = (dx/length)*4.2*dt;
      const stepY = (dy/length)*4.2*dt;
      const nextX = state.x + stepX;
      const nextY = state.y + stepY;
      if (canStand(nextX,state.y)) state.x = nextX;
      if (canStand(state.x,nextY)) state.y = nextY;
      state.time += .04*dt;
    }
    draw();
    requestAnimationFrame(tick);
  }

  draw();
  requestAnimationFrame(tick);
}

load();
try { menu(); } catch (error) { renderFatal(error); }
