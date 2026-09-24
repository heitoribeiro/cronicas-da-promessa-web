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
  visited: {},
  energy: 100,
  hunger: 82,
  meals: {},
  dailyTask: null,
  dailyCompleted: {}
};

function $(selector) { return document.querySelector(selector); }

function normalizeState() {
  state.inventory ||= {};
  state.visited ||= {};
  state.meals ||= {};
  state.dailyCompleted ||= {};
  if (!Number.isFinite(state.energy)) state.energy = 100;
  if (!Number.isFinite(state.hunger)) state.hunger = 82;
  state.energy = Math.max(0,Math.min(100,state.energy));
  state.hunger = Math.max(0,Math.min(100,state.hunger));
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
      <p class="subtitle" style="font-size:13px">Web Alpha 0.11</p>
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
        <p class="subtitle">Web Alpha 0.11 • Judá vivo</p>
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
      inventory: {}, reputation: 0, questStep: 0, visited: {},
      energy: 100, hunger: 82, meals: {}, dailyTask: null, dailyCompleted: {}
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
        <img class="scenic-asset gate-asset" style="left:770px;top:940px" src="./assets/art/judah/gate.svg" alt="Entrada de Judá">

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
          <img class="animal-sprite sheep-one" src="./assets/art/animals/sheep.svg" alt="Ovelha">
          <img class="animal-sprite sheep-two" src="./assets/art/animals/sheep.svg" alt="Ovelha">
          <img class="animal-sprite goat-one" src="./assets/art/animals/goat.svg" alt="Cabra">
          <i class="trough"></i>
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
        <img class="scenic-asset flora-asset shrub-asset mini-flora" style="left:330px;top:420px" src="./assets/art/judah/desert_shrub.svg" alt="">
        <img class="scenic-asset flora-asset shrub-asset mini-flora" style="left:1415px;top:690px" src="./assets/art/judah/desert_shrub.svg" alt="">
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

        <img class="scenic-asset player-home-asset" style="left:565px;top:835px" src="./assets/art/judah/player_tent.svg" alt="Sua tenda">
        <div class="zone-label player-home-label" style="left:615px;top:825px">Sua tenda</div>

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

      <div class="interior-map hidden" id="standardInterior">
        <img class="interior-bg" src="./assets/art/interiors/judah_standard_interior.svg" alt="Interior da Tenda do Estandarte">
        <div class="interior-npc elder-interior hidden" id="elderInteriorNpc"><img src="./assets/art/npcs/elder.svg" alt="Ancião"><b>Ancião</b></div>
        <div class="interior-marker exit-marker">SAÍDA</div>
      </div>

      <div class="interior-map hidden" id="workshopInterior">
        <img class="interior-bg" src="./assets/art/interiors/workshop_interior.svg" alt="Interior da Oficina">
        <div class="interior-npc eliabe-interior hidden" id="eliabeInteriorNpc"><img src="./assets/art/npcs/eliabe.svg" alt="Eliabe"><b>Eliabe</b></div>
        <div class="interior-marker exit-marker">SAÍDA</div>
      </div>

      <div class="interior-map hidden" id="playerInterior">
        <img class="interior-bg" src="./assets/art/interiors/player_tent_interior.svg" alt="Interior da sua tenda">
        <div class="interior-marker bed-marker">CAMA</div>
        <div class="interior-marker chest-marker">BAÚ</div>
        <div class="interior-marker exit-marker">SAÍDA</div>
      </div>

      <div class="daylight" id="daylight"></div>

      <div class="hud">
        <b>${state.profile.name}</b> • Tribo de ${state.profile.tribe} • ${state.profile.vocation}<br>
        Dia ${state.day} • <span id="calendarDay"></span> • <span id="clock"></span> • <span id="dayPhase"></span> • Rep. <span id="rep">${state.reputation}</span>
      </div>

      <div class="needs-hud" id="needsHud">
        <span>Energia <i class="need-bar"><b id="energyBar"></b></i><em id="energyText"></em></span>
        <span>Fome <i class="need-bar"><b id="hungerBar"></b></i><em id="hungerText"></em></span>
      </div>
      <div class="objective" id="objective"></div>
      <div class="daily-task" id="dailyTask"></div>
      <div class="inventory-mini" id="inventoryMini"></div>
      <div class="prompt hidden" id="prompt"></div>
      <button class="map-button" id="mapButton" aria-label="Abrir mapa do acampamento" title="Mapa (M)">MAPA</button>
      <button class="game-menu" id="gameMenu">☰</button>
      <div class="map-overlay hidden" id="mapOverlay" role="dialog" aria-modal="true" aria-label="Mapa do acampamento">
        <div class="map-panel">
          <div class="map-heading"><h2>Acampamento de Judá</h2><button id="closeMap" aria-label="Fechar mapa">Fechar ×</button></div>
          <p id="mapObjective"></p>
          <div class="camp-map" id="campMap">
            <div class="map-path map-path-vertical"></div><div class="map-path map-path-horizontal"></div>
            <div class="map-place" style="left:50%;top:48%">Fogueira</div>
            <div class="map-place" style="left:50%;top:25%">Estandarte</div>
            <div class="map-place" style="left:74%;top:63%">Oficina</div>
            <div class="map-place" style="left:50%;top:69%">Poço</div>
            <div class="map-place" style="left:25%;top:66%">Curral</div>
            <div class="map-place" style="left:37%;top:84%">Sua tenda</div>
            <div class="map-quest hidden" id="mapQuest" aria-label="Destino da missão"></div>
            <div class="map-player" id="mapPlayer" aria-label="Sua posição"></div>
          </div>
          <div class="map-legend"><span>● Você</span><span>◆ Próximo objetivo</span></div>
        </div>
      </div>

      <div class="touch hidden" id="touchControls">
        <button data-k="w">▲</button>
        <div><button data-k="a">◀</button><button data-k="s">▼</button><button data-k="d">▶</button></div>
      </div>

      <button class="action hidden" id="actionButton">AÇÃO</button>
      <div class="dialogue hidden" id="dialogue"></div>
      <div class="badge">Web Alpha 0.11</div>
    </main>`;

  const world = $('#world');
  const standardInterior = $('#standardInterior');
  const workshopInterior = $('#workshopInterior');
  const playerInterior = $('#playerInterior');
  const player = $('#player');
  const prompt = $('#prompt');
  const touchControls = $('#touchControls');
  const actionButton = $('#actionButton');
  const clock = $('#clock');
  const dayPhase = $('#dayPhase');
  const calendarDay = $('#calendarDay');
  const daylight = $('#daylight');
  const energyBar = $('#energyBar');
  const hungerBar = $('#hungerBar');
  const energyText = $('#energyText');
  const hungerText = $('#hungerText');
  const dailyTaskEl = $('#dailyTask');
  const rep = $('#rep');
  const objective = $('#objective');
  const inventoryMini = $('#inventoryMini');
  const menuButton = $('#gameMenu');
  const mapOverlay = $('#mapOverlay');
  const mapButton = $('#mapButton');
  const keys = new Set();

  if (isTouch()) touchControls.classList.remove('hidden');

  let activeInteraction = null;
  let currentScene = 'outdoor';
  const indoorPos = { x:500, y:585 };
  let lastOutdoorPosition = { x:state.x, y:state.y };

  function timePhase() {
    const minute = ((state.time % 1440) + 1440) % 1440;
    if (minute >= 300 && minute < 720) return 'morning';
    if (minute >= 720 && minute < 1080) return 'afternoon';
    if (minute >= 1080 && minute < 1260) return 'evening';
    return 'night';
  }

  function phaseLabel() {
    return ({morning:'Manhã',afternoon:'Tarde',evening:'Entardecer',night:'Noite'})[timePhase()];
  }

  function calendarLabel() {
    const weekDay = ((state.day - 1) % 7) + 1;
    const week = Math.floor((state.day - 1) / 7) + 1;
    const dayName = weekDay === 7 ? 'Shabat' : weekDay + 'º dia';
    return `Semana ${week} • ${dayName}`;
  }

  function mealWindow() {
    const minute = ((state.time % 1440) + 1440) % 1440;
    if (minute >= 390 && minute < 540) return {id:'manha',label:'Desjejum'};
    if (minute >= 720 && minute < 840) return {id:'meio-dia',label:'Refeição'};
    if (minute >= 1080 && minute < 1230) return {id:'noite',label:'Ceia'};
    return null;
  }

  function mealKey() {
    const meal = mealWindow();
    return meal ? `${state.day}:${meal.id}` : '';
  }

  function canEatNow() {
    const meal = mealWindow();
    return Boolean(meal && !state.meals[mealKey()]);
  }

  function eatMeal() {
    const meal = mealWindow();
    if (!meal) return dialogue('Cozinha','Não há refeição sendo servida neste horário.');
    const key = mealKey();
    if (state.meals[key]) return dialogue('Cozinha',`Você já fez a ${meal.label.toLowerCase()} de hoje.`);
    state.meals[key] = true;
    state.hunger = Math.min(100,state.hunger + 38);
    state.energy = Math.min(100,state.energy + 8);
    save();
    dialogue(meal.label,`Você se alimenta com o povo de Judá. Fome restaurada e um pouco da energia retorna.`);
  }

  function needWarning() {
    if (state.energy <= 10) return 'Exausto';
    if (state.hunger <= 10) return 'Faminto';
    if (state.energy <= 30) return 'Cansado';
    if (state.hunger <= 30) return 'Com fome';
    return '';
  }

  function contextualNpcText(key) {
    const phase = timePhase();
    const table = {
      miria:{
        morning:'As famílias começaram cedo. Pela manhã, água, tecidos e pequenos cuidados ocupam quase todo mundo.',
        afternoon:'À tarde eu costumo conferir as crianças e as tendas. O calor muda o ritmo do acampamento.',
        evening:'O entardecer reúne as famílias. É quando as histórias do dia começam a circular.',
        night:'À noite falamos baixo. Há crianças dormindo e guardas atentos ao redor do setor.'
      },
      hanan:{
        morning:'O pão da manhã já saiu. Ainda há muito a preparar antes que o sol fique alto.',
        afternoon:'Agora preparo a refeição maior. Se encontrar ervas pelo caminho, elas sempre são bem-vindas.',
        evening:'No fim do dia a cozinha fica cheia. Todo mundo aparece quando sente o cheiro da panela.',
        night:'A cozinha está quase fechando. Amanhã começamos tudo de novo antes do nascer do sol.'
      },
      guard:{
        morning:'A entrada está tranquila. Pela manhã chegam trabalhadores, pastores e mensageiros.',
        afternoon:'O calor aumenta e a patrulha se espalha pelas laterais do setor.',
        evening:'No entardecer reforçamos os postos. É quando todos começam a retornar ao acampamento.',
        night:'À noite ninguém entra sem ser visto. As tochas ficam acesas até o primeiro clarão da manhã.'
      },
      elder:{
        morning:'A manhã é hora de ouvir pedidos, distribuir tarefas e lembrar a todos por que seguimos juntos.',
        afternoon:'Durante a tarde trato de decisões do conselho e assuntos das famílias.',
        evening:'Ao entardecer, procuro encerrar os assuntos do dia antes que as tendas silenciem.',
        night:'Há decisões que esperam o amanhecer. À noite, também precisamos descansar.'
      },
      eliabe:{
        morning:'De manhã o trabalho rende mais. Madeira, couro e metal passam pelas minhas mãos antes do calor apertar.',
        afternoon:'À tarde faço os reparos mais pesados dentro da oficina.',
        evening:'Estou guardando as ferramentas. Amanhã haverá outra carroça, outra dobradiça e outra lâmina.',
        night:'A forja descansa. Volte pela manhã e certamente haverá algo para fazer.'
      }
    };
    return table[key]?.[phase] || '';
  }

  function enterScene(scene) {
    lastOutdoorPosition = {x:state.x,y:state.y};
    currentScene = scene;
    world.classList.add('hidden');
    standardInterior.classList.toggle('hidden', scene !== 'standard');
    workshopInterior.classList.toggle('hidden', scene !== 'workshop');
    playerInterior.classList.toggle('hidden', scene !== 'home');
    const target = scene === 'standard' ? standardInterior : scene === 'workshop' ? workshopInterior : playerInterior;
    target.appendChild(player);
    indoorPos.x = 500;
    indoorPos.y = 585;
    player.style.left = indoorPos.x + 'px';
    player.style.top = indoorPos.y + 'px';
  }

  function exitInterior() {
    const scene = currentScene;
    currentScene = 'outdoor';
    standardInterior.classList.add('hidden');
    workshopInterior.classList.add('hidden');
    playerInterior.classList.add('hidden');
    world.classList.remove('hidden');
    world.appendChild(player);
    if (scene === 'standard') { state.x = 900; state.y = 350; }
    else if (scene === 'workshop') { state.x = 1325; state.y = 875; }
    else { state.x = 660; state.y = 1020; }
    save();
  }

  const ambientInteractions = [
    { id:'miria', npc:'miria', r:105, action:'Falar com Miriã', run:()=>dialogue('Miriã — a cuidadora',contextualNpcText('miria')) },
    { id:'hanan', npc:'hanan', r:105, action:'Falar com Hanan', run:()=>dialogue('Hanan — o cozinheiro',contextualNpcText('hanan')) },
    { id:'guard', npc:'guard', r:105, action:'Falar com o Guarda', run:()=>dialogue('Guarda de Judá',contextualNpcText('guard')) },
    { id:'meal', x:489,y:570,r:95, enabled:()=>canEatNow(), action:()=>`${mealWindow()?.label || 'Refeição'} comunitária`, run:eatMeal },
    { id:'enter-home', x:660,y:1005,r:90, action:'Entrar na sua tenda', run:()=>enterScene('home') },
    { id:'enter-standard', x:900,y:330,r:95, action:'Entrar na Tenda do Estandarte', run:()=>enterScene('standard') },
    { id:'enter-workshop', x:1325,y:835,r:105, action:'Entrar na oficina', run:()=>enterScene('workshop') },
    { id:'standard', x:900,y:205,r:150, action:'Observar Tenda do Estandarte', run:()=>dialogue('Tenda do Estandarte','O vermelho e o dourado destacam o setor de Judá. O estandarte do leão marca o ponto de liderança da tribo.') },
    { id:'workshop', x:1325,y:735,r:150, action:'Examinar oficina', run:()=>dialogue('Oficina de Judá','Madeira, metal, couro e ferramentas ocupam cada bancada. O trabalho de Eliabe mantém o acampamento em movimento.') },
    { id:'warehouse', x:380,y:505,r:145, action:'Examinar armazém', run:()=>dialogue('Armazéns','Mantimentos, tecidos, jarros e peças de reposição são organizados para atender as famílias do setor.') },
    { id:'corral-look', x:420,y:820,r:165, action:'Observar rebanho', run:()=>dialogue('Currais','Ovelhas e cabras descansam entre cercas, cochos e recipientes de água. O rebanho sustenta parte importante da vida cotidiana.') },
    { id:'well-look', x:900,y:825,r:120, action:'Examinar poço', run:()=>dialogue('Poço de Judá','Água fresca é retirada em turnos ao longo do dia. Jarros e barris permanecem próximos para o abastecimento.') }
  ];

  const npcAgents = {
    elder: { el:$('.npc-elder'), x:890, y:292, route:[[890,292]], target:0, speed:.34, scheduleTag:'' },
    eliabe:{ el:$('.npc-eliabe'),x:1320,y:745,route:[[1320,745]],target:0,speed:.42, scheduleTag:'' },
    child: { el:$('.npc-child'), x:445, y:780, route:[[445,780]], target:0, speed:.45, scheduleTag:'' },
    miria: { el:$('.npc-miria'), x:1245,y:420,route:[[1245,420]],target:0,speed:.38, scheduleTag:'' },
    hanan: { el:$('.npc-hanan'), x:520,y:535,route:[[520,535]],target:0,speed:.30, scheduleTag:'' },
    guard: { el:$('.npc-guard'), x:820,y:1015,route:[[820,1015]],target:0,speed:.48, scheduleTag:'' }
  };

  const npcSchedules = {
    elder:[
      {from:480,to:510,tag:'estandarte',route:[[890,292],[850,320],[930,322]]},
      {from:510,to:525,tag:'porta-estandarte',route:[[900,338]]},
      {from:525,to:570,tag:'interior-estandarte',inside:'standard',route:[[500,330]]},
      {from:570,to:600,tag:'saindo-estandarte',route:[[900,338],[690,360],[540,330]]},
      {from:600,to:720,tag:'conselho',route:[[540,330],[500,355],[565,350]]},
      {from:720,to:1260,tag:'estandarte',route:[[890,292],[850,320],[930,322]]},
      {from:1260,to:1440,tag:'descanso',inside:'rest',route:[[890,292]]}
    ],
    eliabe:[
      {from:480,to:510,tag:'oficina',route:[[1320,745],[1370,780],[1275,790]]},
      {from:510,to:525,tag:'porta-oficina',route:[[1325,835]]},
      {from:525,to:690,tag:'interior-oficina',inside:'workshop',route:[[650,430]]},
      {from:690,to:705,tag:'saindo-oficina',route:[[1325,835],[980,650],[575,560]]},
      {from:705,to:750,tag:'armazem',route:[[575,560],[530,590],[610,585]]},
      {from:750,to:1080,tag:'interior-oficina-2',inside:'workshop',route:[[650,430]]},
      {from:1080,to:1260,tag:'oficina-fim',route:[[1320,745],[1370,780],[1275,790]]},
      {from:1260,to:1440,tag:'descanso',inside:'rest',route:[[1320,745]]}
    ],
    child:[
      {from:480,to:690,tag:'curral',route:[[445,780],[360,825],[510,835],[420,745]]},
      {from:690,to:750,tag:'poco',route:[[760,835],[820,850],[735,860]]},
      {from:750,to:1260,tag:'curral',route:[[445,780],[360,825],[510,835],[420,745]]},
      {from:1260,to:1440,tag:'descanso',inside:'rest',route:[[445,780]]}
    ],
    miria:[
      {from:480,to:600,tag:'familias',route:[[1245,420],[1325,445],[1190,470],[1270,390]]},
      {from:600,to:690,tag:'poco',route:[[1015,815],[975,850],[1040,845]]},
      {from:690,to:1260,tag:'familias',route:[[1245,420],[1325,445],[1190,470],[1270,390]]},
      {from:1260,to:1440,tag:'descanso',inside:'rest',route:[[1245,420]]}
    ],
    hanan:[
      {from:480,to:660,tag:'cozinha',route:[[520,535],[455,560],[570,575]]},
      {from:660,to:750,tag:'patio',route:[[735,610],[700,640],[770,645]]},
      {from:750,to:1260,tag:'cozinha',route:[[520,535],[455,560],[570,575]]},
      {from:1260,to:1440,tag:'descanso',inside:'rest',route:[[520,535]]}
    ],
    guard:[
      {from:480,to:600,tag:'entrada',route:[[820,1015],[980,1015],[900,965]]},
      {from:600,to:720,tag:'leste',route:[[1510,760],[1510,620],[1460,700]]},
      {from:720,to:840,tag:'norte',route:[[820,125],[980,125],[900,170]]},
      {from:840,to:1440,tag:'entrada',route:[[820,1015],[980,1015],[900,965]]}
    ]
  };

  function scheduleForNpc(key) {
    if (key === 'eliabe' && state.questStep === 1) return {tag:'quest-oficina',route:[[1320,745],[1360,770],[1285,785]]};
    if (key === 'child' && state.questStep === 3) return {tag:'quest-curral',route:[[445,780],[400,815],[495,825]]};
    if (key === 'elder' && state.questStep === 4) return {tag:'quest-estandarte',route:[[890,292],[855,318],[925,320]]};
    const minute = ((state.time % 1440) + 1440) % 1440;
    return npcSchedules[key].find(block => minute >= block.from && minute < block.to) || npcSchedules[key][0];
  }

  function syncNpcSchedule(key, agent) {
    const block = scheduleForNpc(key);
    if (block.tag !== agent.scheduleTag) {
      agent.scheduleTag = block.tag;
      agent.route = block.route;
      agent.target = 0;
      agent.inside = block.inside || null;
      agent.el.classList.toggle('hidden', Boolean(agent.inside));
    }
  }

  function moveNpc(key, agent, dt) {
    syncNpcSchedule(key, agent);
    if (agent.inside) return;
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

  const animalAgents = [
    { el:$('.sheep-one'), x:72,y:70, route:[[72,70],[155,90],[105,155],[58,128]], target:1, speed:.28 },
    { el:$('.sheep-two'), x:210,y:155, route:[[210,155],[300,170],[265,88],[190,105]], target:1, speed:.24 },
    { el:$('.goat-one'), x:292,y:72, route:[[292,72],[325,130],[245,170],[235,80]], target:1, speed:.31 }
  ];

  function moveAnimal(agent, dt) {
    const target = agent.route[agent.target];
    const dx = target[0]-agent.x, dy = target[1]-agent.y;
    const dist = Math.hypot(dx,dy);
    if (dist < 3) {
      agent.target = (agent.target + 1) % agent.route.length;
      agent.el.classList.remove('animal-walking');
      return;
    }
    const step = Math.min(dist,agent.speed*dt);
    agent.x += dx/dist*step;
    agent.y += dy/dist*step;
    agent.el.style.left = agent.x + 'px';
    agent.el.style.top = agent.y + 'px';
    agent.el.classList.add('animal-walking');
    agent.el.classList.toggle('face-left',dx < 0);
  }

  const ySortedScenery = [
    ['.standard-tent-asset',300],['.council-tent-asset',385],['.family-tent-asset:not(.family-small)',355],
    ['.family-tent-asset.family-small:nth-of-type(2)',438],['.workshop-asset',846],
    ['.warehouse-asset:not(.warehouse-small)',575],['.warehouse-small',596],
    ['.campfire-asset',635],['.well-asset',858],['.gate-asset',1080],
    ['.acacia-asset',330],['.rock-art',350],['.supply-art',665]
  ];
  ySortedScenery.forEach(([selector,y]) => document.querySelectorAll(selector).forEach(el => el.style.zIndex = String(100 + y)));

  function updateDepth() {
    player.style.zIndex = String(100 + Math.floor(currentScene === 'outdoor' ? state.y : indoorPos.y));
    Object.values(npcAgents).forEach(agent => agent.el.style.zIndex = String(100 + Math.floor(agent.y)));
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
    {type:'rect',x:585,y:855,w:150,h:92},
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

  function canStandInterior(scene,px,py) {
    if (px < 85 || px > 915 || py < 135 || py > 630) return false;
    const rects = scene === 'standard'
      ? [
          {x:350,y:330,w:300,h:125},
          {x:185,y:365,w:145,h:120},
          {x:670,y:365,w:145,h:120}
        ]
      : scene === 'workshop'
        ? [
            {x:105,y:150,w:310,h:225},
            {x:500,y:220,w:305,h:145},
            {x:790,y:165,w:145,h:225},
            {x:105,y:405,w:360,h:145}
          ]
        : [
            {x:115,y:235,w:325,h:180},
            {x:575,y:240,w:235,h:150},
            {x:600,y:415,w:160,h:120}
          ];
    const circles = scene === 'workshop' ? [{x:650,y:495,r:92}] : scene === 'standard' ? [{x:170,y:260,r:45},{x:830,y:260,r:45}] : [];
    if (rects.some(o => circleHitsRect(px,py,PLAYER_RADIUS,o))) return false;
    if (circles.some(o => Math.hypot(px-o.x,py-o.y) < PLAYER_RADIUS + o.r)) return false;
    return true;
  }

  function canStand(px,py) {
    if (px < 135 || px > 1665 || py < 95 || py > 1085) return false;
    const hitsWorld = obstacles.some(o => o.type === 'circle'
      ? Math.hypot(px-o.x,py-o.y) < PLAYER_RADIUS + o.r
      : circleHitsRect(px,py,PLAYER_RADIUS,o));
    if (hitsWorld) return false;
    return !Object.values(npcAgents).some(npc => !npc.inside && Math.hypot(px-npc.x,py-npc.y) < PLAYER_RADIUS + 24);
  }

  function questGuidance() {
    const quest = QUESTS[state.questStep];
    if (!quest?.target) return quest.label;
    if (currentScene !== 'outdoor') return `${quest.label} Saia da tenda para seguir a missão.`;
    const npc = quest.id === 'eliabe' ? npcAgents.eliabe : quest.id === 'corral' ? npcAgents.child : quest.id === 'elder' ? npcAgents.elder : null;
    const destination = npc?.inside === 'workshop' ? {x:1325,y:835} : npc?.inside === 'standard' ? {x:900,y:330} : npc || quest.target;
    const dx = destination.x - state.x, dy = destination.y - state.y;
    const distance = Math.round(Math.hypot(dx,dy));
    if (distance < (quest.target.r || 110)) return quest.label;
    const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'leste' : 'oeste') : (dy > 0 ? 'sul' : 'norte');
    const place = npc?.inside ? 'Entre na tenda indicada. ' : '';
    return `${quest.label} ${place}Siga para ${direction} (${distance} passos).`;
  }

  function refreshHud() {
    const quest = QUESTS[Math.min(state.questStep, QUESTS.length - 1)];
    objective.textContent = questGuidance();
    rep.textContent = state.reputation;
    calendarDay.textContent = calendarLabel();
    energyBar.style.width = state.energy.toFixed(0) + '%';
    hungerBar.style.width = state.hunger.toFixed(0) + '%';
    energyText.textContent = Math.round(state.energy);
    hungerText.textContent = Math.round(state.hunger);
    const warning = needWarning();
    document.querySelector('.needs-hud')?.classList.toggle('warning',Boolean(warning));
    dailyTaskEl.textContent = getDailyTaskText();
    const items = [];
    if (state.inventory.lenha) items.push(`Lenha ×${state.inventory.lenha}`);
    if (state.inventory.agua) items.push(`Água ×${state.inventory.agua}`);
    inventoryMini.textContent = items.length ? items.join(' • ') : 'Bolsa vazia';
  }

  function updateMap() {
    const quest = QUESTS[state.questStep];
    const npc = quest?.id === 'eliabe' ? npcAgents.eliabe : quest?.id === 'corral' ? npcAgents.child : quest?.id === 'elder' ? npcAgents.elder : null;
    const target = npc?.inside === 'workshop' ? {x:1325,y:835} : npc?.inside === 'standard' ? {x:900,y:330} : npc || quest?.target;
    const marker = $('#mapQuest');
    marker.classList.toggle('hidden', !target);
    if (target) {
      marker.style.left = `${target.x / 18}%`;
      marker.style.top = `${target.y / 12}%`;
    }
    const playerMarker = $('#mapPlayer');
    playerMarker.style.left = `${state.x / 18}%`;
    playerMarker.style.top = `${state.y / 12}%`;
    $('#mapObjective').textContent = questGuidance();
  }

  function toggleMap(force) {
    const open = force ?? mapOverlay.classList.contains('hidden');
    mapOverlay.classList.toggle('hidden', !open);
    if (open) updateMap();
    else keys.clear();
  }

  function advanceQuest(reward=0) {
    if (reward) state.reputation += reward;
    state.questStep = Math.min(state.questStep + 1, QUESTS.length - 1);
    save();
    refreshHud();
  }

  function timedWindowId() {
    const minute = ((state.time % 1440) + 1440) % 1440;
    if (minute >= 390 && minute < 600) return 'morning-water';
    if (minute >= 1020 && minute < 1200) return 'evening-herd';
    return null;
  }

  function dailyDone(id) {
    return Boolean(state.dailyCompleted[`${state.day}:${id}`]);
  }

  function getDailyTaskText() {
    if (state.questStep < QUESTS.length - 1) return '';
    if (state.dailyTask) {
      if (state.dailyTask.id === 'morning-water') {
        return state.dailyTask.step === 0 ? 'Rotina: busque água no poço para Hanan.' : 'Rotina: entregue a água a Hanan.';
      }
      if (state.dailyTask.id === 'evening-herd') {
        return state.dailyTask.step === 0 ? 'Rotina: confira a entrada antes de recolher o rebanho.' : 'Rotina: volte à Criança do Rebanho.';
      }
    }
    const id = timedWindowId();
    if (id === 'morning-water' && !dailyDone(id)) return 'Disponível até 10:00: Preparativos da manhã com Hanan.';
    if (id === 'evening-herd' && !dailyDone(id)) return 'Disponível até 20:00: Recolher o rebanho.';
    return 'Rotina livre: alimente-se, explore e descanse antes da noite.';
  }

  function completeDailyTask(id,reward) {
    state.dailyCompleted[`${state.day}:${id}`] = true;
    state.dailyTask = null;
    state.reputation += reward;
    save();
    refreshHud();
  }

  function getTimedInteraction() {
    if (state.questStep < QUESTS.length - 1 || currentScene !== 'outdoor') return null;
    const hanan = npcAgents.hanan, child = npcAgents.child;
    if (state.dailyTask?.id === 'morning-water') {
      if (state.dailyTask.step === 0 && Math.hypot(state.x-900,state.y-825) < 115) {
        return {action:'Encher jarro para Hanan',run:()=>{state.inventory.agua_hanan=1;state.dailyTask.step=1;save();refreshHud();dialogue('Poço','Você enche um jarro para os preparativos da manhã.');}};
      }
      if (state.dailyTask.step === 1 && !hanan.inside && Math.hypot(state.x-hanan.x,state.y-hanan.y) < 110) {
        return {action:'Entregar água a Hanan',run:()=>{delete state.inventory.agua_hanan;completeDailyTask('morning-water',3);state.hunger=Math.min(100,state.hunger+12);dialogue('Hanan','Chegou na hora certa. Obrigado. Pegue também um pouco de pão antes de seguir.');}};
      }
    }
    if (state.dailyTask?.id === 'evening-herd') {
      if (state.dailyTask.step === 0 && Math.hypot(state.x-900,state.y-1010) < 125) {
        return {action:'Conferir a entrada',run:()=>{state.dailyTask.step=1;save();refreshHud();dialogue('Entrada de Judá','A passagem está livre. É hora de conduzir o rebanho para dentro do setor.');}};
      }
      if (state.dailyTask.step === 1 && !child.inside && Math.hypot(state.x-child.x,state.y-child.y) < 115) {
        return {action:'Avisar a Criança do Rebanho',run:()=>{completeDailyTask('evening-herd',4);dialogue('Criança do Rebanho','Tudo certo! Agora podemos recolher os animais antes de escurecer de vez.');}};
      }
    }
    const id = timedWindowId();
    if (id === 'morning-water' && !dailyDone(id) && !hanan.inside && Math.hypot(state.x-hanan.x,state.y-hanan.y) < 110) {
      return {action:'Ajudar Hanan',run:()=>{state.dailyTask={id,step:0};save();refreshHud();dialogue('Hanan — Preparativos da manhã','Preciso de água fresca antes que a cozinha fique cheia. Traga um jarro do poço antes das dez.');}};
    }
    if (id === 'evening-herd' && !dailyDone(id) && !child.inside && Math.hypot(state.x-child.x,state.y-child.y) < 115) {
      return {action:'Ajudar com o rebanho',run:()=>{state.dailyTask={id,step:0};save();refreshHud();dialogue('Criança do Rebanho','Antes de recolher os animais, pode conferir se a entrada principal está livre?');}};
    }
    return null;
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
    const timed = getTimedInteraction();
    if (timed) return timed;
    const quest = QUESTS[state.questStep];
    const questNpc = quest?.id === 'eliabe' ? npcAgents.eliabe : quest?.id === 'corral' ? npcAgents.child : quest?.id === 'elder' ? npcAgents.elder : null;
    if ((quest?.target || questNpc) && !questNpc?.inside) {
      const tx = questNpc ? questNpc.x : quest.target.x;
      const ty = questNpc ? questNpc.y : quest.target.y;
      const tr = questNpc ? 105 : quest.target.r;
      if (Math.hypot(state.x-tx,state.y-ty) < tr) return { action:quest.action, run:runQuestInteraction };
    }
    for (const item of ambientInteractions) {
      if (item.enabled && !item.enabled()) continue;
      const npc = item.npc ? npcAgents[item.npc] : null;
      if (npc?.inside) continue;
      const tx = npc ? npc.x : item.x, ty = npc ? npc.y : item.y;
      if (Math.hypot(state.x-tx,state.y-ty) < item.r) {
        return {...item,action:typeof item.action === 'function' ? item.action() : item.action};
      }
    }
    return null;
  }

  function getInteriorInteraction() {
    if (Math.hypot(indoorPos.x-500,indoorPos.y-625) < 90) return {action:'Sair',run:exitInterior};
    if (currentScene === 'standard') {
      const elder = npcAgents.elder;
      if (elder.inside === 'standard' && Math.hypot(indoorPos.x-500,indoorPos.y-330) < 130) {
        if (state.questStep === 4) return {action:QUESTS[4].action,run:runQuestInteraction};
        return {action:'Falar com o Ancião',run:()=>dialogue('Ancião do Conselho',contextualNpcText('elder'))};
      }
      if (Math.hypot(indoorPos.x-500,indoorPos.y-375) < 120) {
        return {action:'Examinar mesa do conselho',run:()=>dialogue('Mesa do conselho','Mapas, anotações e registros de famílias estão organizados sobre a mesa. Aqui são tratadas decisões do setor de Judá.')};
      }
    }
    if (currentScene === 'home') {
      if (Math.hypot(indoorPos.x-270,indoorPos.y-330) < 125) {
        const minute = ((state.time % 1440) + 1440) % 1440;
        const canSleep = minute >= 1200 || minute < 360;
        return canSleep
          ? {action:'Dormir até o amanhecer',run:()=>sleepUntilMorning()}
          : {action:'Descansar',run:()=>dialogue('Sua cama','Ainda é cedo para encerrar o dia. Você pode voltar depois das 20:00.')};
      }
      if (Math.hypot(indoorPos.x-680,indoorPos.y-475) < 100) {
        return {action:'Abrir baú',run:()=>dialogue('Baú pessoal','Aqui ficarão ferramentas, roupas e itens importantes. O armazenamento completo será ampliado nas próximas versões.')};
      }
    }
    if (currentScene === 'workshop') {
      const eliabe = npcAgents.eliabe;
      if (eliabe.inside === 'workshop' && Math.hypot(indoorPos.x-650,indoorPos.y-430) < 135) {
        if (state.questStep === 1) return {action:QUESTS[1].action,run:runQuestInteraction};
        return {action:'Falar com Eliabe',run:()=>dialogue('Eliabe — o artesão',contextualNpcText('eliabe'))};
      }
      if (Math.hypot(indoorPos.x-840,indoorPos.y-300) < 110) {
        return {action:'Observar forja',run:()=>dialogue('Forja','O calor é intenso. Carvão, metal aquecido e ferramentas pesadas ocupam o canto da oficina.')};
      }
    }
    return null;
  }

  function sleepUntilMorning() {
    state.day += 1;
    state.time = 360;
    state.energy = 100;
    state.hunger = Math.max(52,state.hunger - 8);
    state.dailyTask = null;
    save();
    refreshHud();
    dialogue('Amanhecer',`Você descansa durante a noite. Começa o Dia ${state.day} com a energia restaurada.`,'Levantar');
  }

  function interact() {
    if (!$('#dialogue').classList.contains('hidden') || !mapOverlay.classList.contains('hidden')) return;
    activeInteraction?.run?.();
  }

  function updateInteriorNpcs() {
    const elderInside = $('#elderInteriorNpc');
    const eliabeInside = $('#eliabeInteriorNpc');
    const elder = npcAgents.elder;
    const eliabe = npcAgents.eliabe;
    elderInside.classList.toggle('hidden', elder.inside !== 'standard');
    eliabeInside.classList.toggle('hidden', eliabe.inside !== 'workshop');
  }

  function applyLighting() {
    const phase = timePhase();
    dayPhase.textContent = phaseLabel();
    calendarDay.textContent = calendarLabel();
    daylight.className = 'daylight ' + phase;
  }

  function draw() {
    applyLighting();
    updateInteriorNpcs();

    if (currentScene === 'outdoor') {
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
    } else {
      player.style.left = indoorPos.x + 'px';
      player.style.top = indoorPos.y + 'px';
      const activeInterior = currentScene === 'standard' ? standardInterior : currentScene === 'workshop' ? workshopInterior : playerInterior;
      const scale = Math.min(innerWidth / 1000, innerHeight / 700);
      activeInterior.style.transform = `translate(${innerWidth/2}px,${innerHeight/2}px) scale(${scale}) translate(-500px,-350px)`;
      activeInteraction = getInteriorInteraction();
    }
    prompt.classList.toggle('hidden', !activeInteraction);
    actionButton.classList.toggle('hidden', !activeInteraction || !isTouch());
    if (activeInteraction) prompt.textContent = isTouch() ? `AÇÃO — ${activeInteraction.action}` : `E — ${activeInteraction.action}`;

    const h = Math.floor(state.time / 60) % 24;
    const m = Math.floor(state.time % 60);
    clock.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  function onKeyDown(event) {
    if (event.key.toLowerCase() === 'm' && !event.repeat) {
      if ($('#dialogue').classList.contains('hidden')) toggleMap();
      return;
    }
    if (!mapOverlay.classList.contains('hidden')) {
      if (event.key === 'Escape') toggleMap(false);
      return;
    }
    keys.add(event.key.toLowerCase());
    if (event.key.toLowerCase() === 'e' && !event.repeat) interact();
    if (event.key === 'Escape') {
      const modal = $('#dialogue');
      if (!modal.classList.contains('hidden')) modal.classList.add('hidden');
      else { save(); menu(); }
    }
  }
  function onKeyUp(event) { keys.delete(event.key.toLowerCase()); }

  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  actionButton.addEventListener('click', interact);
  mapButton.addEventListener('click', () => toggleMap());
  $('#closeMap').addEventListener('click', () => toggleMap(false));
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
  let lastHudRefresh = 0;

  function tick(now) {
    if (!document.body.contains(player)) {
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      return;
    }
    const dt = Math.min((now-last)/16.67,2); last = now;
    const dialogOpen = !$('#dialogue').classList.contains('hidden') || !mapOverlay.classList.contains('hidden');
    let dx=0,dy=0;
    if (!dialogOpen) {
      if (keys.has('a')||keys.has('arrowleft')) dx--;
      if (keys.has('d')||keys.has('arrowright')) dx++;
      if (keys.has('w')||keys.has('arrowup')) dy--;
      if (keys.has('s')||keys.has('arrowdown')) dy++;
    }
    player.classList.toggle('walking', Boolean(dx || dy));
    updatePlayerSprite(dx,dy,now);
    if (!dialogOpen) {
      Object.entries(npcAgents).forEach(([key,agent]) => moveNpc(key,agent,dt));
      if (currentScene === 'outdoor') animalAgents.forEach(agent => moveAnimal(agent,dt));
      const gameMinutes = .018 * dt;
      state.time += gameMinutes;
      state.hunger = Math.max(0,state.hunger - gameMinutes/30);
      state.energy = Math.max(0,state.energy - gameMinutes/(dx||dy ? 28 : 95));
      if (state.hunger <= 0) state.energy = Math.max(0,state.energy - gameMinutes/12);
      const activeWindow = timedWindowId();
      if (state.dailyTask && !activeWindow && ((state.dailyTask.id === 'morning-water' && state.time >= 600) || (state.dailyTask.id === 'evening-herd' && state.time >= 1200))) {
        state.dailyTask = null;
      }
      if (state.time >= 1440) {
        state.time -= 1440;
        state.day += 1;
        save();
      }
    }
    updateDepth();
    if (dx||dy) {
      const length = Math.hypot(dx,dy);
      const speedFactor = state.energy < 10 ? .58 : state.energy < 30 ? .82 : 1;
      const stepX = (dx/length)*4.2*dt*speedFactor;
      const stepY = (dy/length)*4.2*dt*speedFactor;
      if (currentScene === 'outdoor') {
        const nextX = state.x + stepX;
        const nextY = state.y + stepY;
        if (canStand(nextX,state.y)) state.x = nextX;
        if (canStand(state.x,nextY)) state.y = nextY;
      } else {
        const nextIndoorX = indoorPos.x + stepX*1.15;
        const nextIndoorY = indoorPos.y + stepY*1.15;
        if (canStandInterior(currentScene,nextIndoorX,indoorPos.y)) indoorPos.x = nextIndoorX;
        if (canStandInterior(currentScene,indoorPos.x,nextIndoorY)) indoorPos.y = nextIndoorY;
      }
    }
    if (now - lastHudRefresh > 250) {
      refreshHud();
      lastHudRefresh = now;
    }
    draw();
    requestAnimationFrame(tick);
  }

  draw();
  requestAnimationFrame(tick);
}

load();
try { menu(); } catch (error) { renderFatal(error); }
