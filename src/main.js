const app = document.querySelector('#app');
const SAVE = 'cronicas-promessa-save-v3';
const tribes = ['Rúben','Simeão','Levi','Judá','Dã','Naftali','Gade','Aser','Issacar','Zebulom','José','Benjamim'];
const vocations = ['Pastor','Agricultor','Coletor','Levita'];
const VOCATION_GEAR = {
  Pastor: { id:'cajado', label:'Cajado de pastor' },
  Agricultor: { id:'enxada', label:'Enxada de madeira' },
  Coletor: { id:'cesto', label:'Cesto de coleta' },
  Levita: { id:'bolsa_registros', label:'Bolsa de registros' }
};

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
  dailyCompleted: {},
  workCompleted: {},
  workProgress: null,
  lastDaySummary: null,
  tools: {},
  equippedTool: null,
  warehouseTrades: 0,
  lastSavedAt: null
};

function $(selector) { return document.querySelector(selector); }

function normalizeState() {
  state.inventory ||= {};
  state.visited ||= {};
  state.meals ||= {};
  state.dailyCompleted ||= {};
  state.workCompleted ||= {};
  state.tools ||= {};
  if (!('workProgress' in state)) state.workProgress = null;
  if (!('lastDaySummary' in state)) state.lastDaySummary = null;
  if (!('equippedTool' in state)) state.equippedTool = null;
  if (!Number.isInteger(state.warehouseTrades)) state.warehouseTrades = 0;
  if (!('lastSavedAt' in state)) state.lastSavedAt = null;
  if (!Number.isFinite(state.x)) state.x = 900;
  if (!Number.isFinite(state.y)) state.y = 980;
  if (!Number.isInteger(state.day) || state.day < 1) state.day = 1;
  if (state.equippedTool && !state.tools[state.equippedTool]) state.equippedTool = null;
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
  try {
    state.lastSavedAt = Date.now();
    localStorage.setItem(SAVE, JSON.stringify(state));
  }
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
      <p class="subtitle" style="font-size:13px">Web Alpha 0.17</p>
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
        <p class="subtitle">Web Alpha 0.17 • Judá vivo</p>
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
      energy: 100, hunger: 82, meals: {}, dailyTask: null, dailyCompleted: {},
      workCompleted: {}, workProgress: null, lastDaySummary: null,
      tools: {}, equippedTool: null, warehouseTrades: 0, lastSavedAt: null
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
        <div class="world-quest hidden" id="worldQuest" aria-hidden="true"><span>◆</span><b id="worldQuestLabel"></b></div>
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
        <div class="corral-front" style="left:245px;top:948px"></div>

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
        <div class="zone-label kitchen-label" style="left:442px;top:475px">Cozinha</div>
        <div class="rug rug-standard" style="left:835px;top:355px"></div>
        <div class="rug rug-family" style="left:1180px;top:500px"></div>
        <div class="clay-cluster" style="left:1110px;top:548px"><i></i><i></i><i></i></div>
        <div class="supply-pile" style="left:515px;top:575px"><i></i><i></i></div>
        <div class="tribe-banner banner-left" style="left:675px;top:330px"></div>
        <div class="tribe-banner banner-right" style="left:1080px;top:360px"></div>

        <img class="scenic-asset player-home-asset" style="left:565px;top:835px" src="./assets/art/judah/player_tent.svg" alt="Sua tenda">
        <div class="zone-label player-home-label" style="left:615px;top:825px">Sua tenda</div>
        <div class="work-site pastor-site" data-job="Pastor" style="left:365px;top:875px"><b>PASTOREIO</b></div>
        <div class="work-site farmer-site" data-job="Agricultor" style="left:1060px;top:910px"><b>CANTEIRO</b></div>
        <div class="work-site gatherer-site" data-job="Coletor" style="left:1490px;top:905px"><b>COLETA</b></div>
        <div class="work-site levite-site" data-job="Levita" style="left:815px;top:390px"><b>SERVIÇO</b></div>

        <div class="npc npc-elder" style="left:890px;top:292px"><img src="./assets/art/npcs/elder.svg" alt="Ancião"><b>Ancião</b></div>
        <div class="npc npc-eliabe" style="left:1320px;top:745px"><img src="./assets/art/npcs/eliabe.svg" alt="Eliabe"><b>Eliabe</b></div>
        <div class="npc npc-child" style="left:445px;top:780px"><img src="./assets/art/npcs/herd_child.svg" alt="Criança do Rebanho"><b>Rebanho</b></div>
        <div class="npc npc-miria" style="left:1245px;top:420px"><img src="./assets/art/npcs/miria.svg" alt="Miriã"><b>Miriã</b></div>
        <div class="npc npc-hanan" style="left:520px;top:535px"><img src="./assets/art/npcs/hanan.svg" alt="Hanan"><b>Hanan</b></div>
        <div class="npc npc-guard" style="left:820px;top:1015px"><img src="./assets/art/npcs/guard.svg" alt="Guarda"><b>Guarda</b></div>

        <div class="zone-label standard-zone">Tenda do Estandarte</div>
        <div class="zone-label council-zone">Conselho</div><div class="zone-label family-zone">Tendas familiares</div>
        <div class="zone-label corral-zone">Currais</div><div class="zone-label workshop-zone">Oficinas</div>

        <div class="move-target hidden" id="moveTarget" aria-hidden="true"><i></i></div>
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

      <div class="status-stack">
        <div class="hud">
          <b>${state.profile.name}</b><span class="hud-role">Tribo de ${state.profile.tribe} • ${state.profile.vocation}</span>
          <small>Dia ${state.day} • <span id="calendarDay"></span> • <span id="clock"></span> • <span id="dayPhase"></span> • Rep. <span id="rep">${state.reputation}</span></small>
        </div>
        <div class="inventory-mini" id="inventoryMini"></div>
        <div class="needs-hud" id="needsHud">
          <span>Energia <i class="need-bar"><b id="energyBar"></b></i><em id="energyText"></em></span>
          <span>Fome <i class="need-bar"><b id="hungerBar"></b></i><em id="hungerText"></em></span>
        </div>
        <div class="meal-hint" id="mealHint"></div>
      </div>
      <div class="task-stack">
        <div class="objective" id="objective"></div>
        <div class="daily-task" id="dailyTask"></div>
        <div class="vocation-task" id="vocationTask"></div>
      </div>
      <div class="prompt hidden" id="prompt"></div>
      <div class="quick-actions">
        <button class="inventory-button" id="inventoryButton" aria-label="Abrir bolsa" title="Bolsa (I)">BOLSA</button>
        <button class="map-button" id="mapButton" aria-label="Abrir mapa do acampamento" title="Mapa (M)">MAPA</button>
        <button class="game-menu" id="gameMenu" aria-label="Abrir menu do jogo" title="Menu (Esc)">☰</button>
      </div>
      <div class="inventory-overlay hidden" id="inventoryOverlay" role="dialog" aria-modal="true" aria-label="Bolsa e equipamento">
        <div class="inventory-panel">
          <div class="inventory-heading"><h2>Bolsa e equipamento</h2><button id="closeInventory" aria-label="Fechar bolsa">Fechar ×</button></div>
          <p class="inventory-note">Recursos do trabalho podem ser entregues no Armazém de Judá. Rações podem ser usadas em qualquer lugar.</p>
          <div id="inventoryContent"></div>
        </div>
      </div>
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
            <div class="map-place" style="left:21%;top:42%">Armazém</div>
            <div class="map-place" style="left:27%;top:47%">Cozinha</div>
            <div class="map-place" style="left:37%;top:84%">Sua tenda</div>
            <div class="map-quest hidden" id="mapQuest" aria-label="Destino da missão"></div>
            <div class="map-player" id="mapPlayer" aria-label="Sua posição"></div>
          </div>
          <div class="map-legend"><span>● Você</span><span>◆ Próximo objetivo</span></div>
        </div>
      </div>

      <div class="game-menu-overlay hidden" id="gameMenuOverlay" role="dialog" aria-modal="true" aria-label="Menu do jogo">
        <div class="game-menu-panel">
          <div class="game-menu-heading"><div><small>CRÔNICAS DA PROMESSA</small><h2>Menu do jogo</h2></div><button id="closeGameMenu">Fechar ×</button></div>
          <div class="save-status"><span>Salvamento automático ativo</span><b id="saveStatusText"></b></div>
          <div class="game-menu-actions">
            <button id="saveNowButton"><b>SALVAR AGORA</b><small>Grava imediatamente neste navegador.</small></button>
            <button id="exportSaveButton"><b>EXPORTAR SAVE</b><small>Baixa um arquivo para usar em outro aparelho.</small></button>
            <button id="importSaveButton"><b>IMPORTAR SAVE</b><small>Carrega um arquivo exportado anteriormente.</small></button>
            <button id="returnMainMenuButton" class="secondary"><b>MENU PRINCIPAL</b><small>O progresso será salvo antes de sair.</small></button>
          </div>
          <p class="save-help">Dica: no outro computador ou celular, abra o jogo e escolha <b>Importar save</b>.</p>
          <input class="hidden" type="file" id="saveFileInput" accept=".json,application/json">
        </div>
      </div>

      <div class="touch hidden" id="touchControls">
        <button data-k="w">▲</button>
        <div><button data-k="a">◀</button><button data-k="s">▼</button><button data-k="d">▶</button></div>
      </div>

      <button class="action hidden" id="actionButton">AÇÃO</button>
      <div class="dialogue hidden" id="dialogue"></div>
      <div class="badge">Web Alpha 0.17</div>
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
  const vocationTaskEl = $('#vocationTask');
  const rep = $('#rep');
  const objective = $('#objective');
  const inventoryMini = $('#inventoryMini');
  const menuButton = $('#gameMenu');
  const mapOverlay = $('#mapOverlay');
  const mapButton = $('#mapButton');
  const inventoryOverlay = $('#inventoryOverlay');
  const inventoryButton = $('#inventoryButton');
  const inventoryContent = $('#inventoryContent');
  const gameMenuOverlay = $('#gameMenuOverlay');
  const saveStatusText = $('#saveStatusText');
  const saveFileInput = $('#saveFileInput');
  const worldQuest = $('#worldQuest');
  const moveTargetEl = $('#moveTarget');
  const keys = new Set();

  if (isTouch()) touchControls.classList.remove('hidden');

  let activeInteraction = null;
  let currentScene = 'outdoor';
  const indoorPos = { x:500, y:585 };
  let lastOutdoorPosition = { x:state.x, y:state.y };
  let clickPath = [];
  let clickDestination = null;
  let lastAutoSave = performance.now();

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

  function isShabbat() {
    return ((state.day - 1) % 7) + 1 === 7;
  }

  function vocationConfig() {
    const configs = {
      Pastor: {
        id:'pastor', label:'Cuidado do rebanho', x:420, y:825, radius:150,
        rewardItem:'lã', rewardLabel:'Lã', rewardQty:2, rep:3, energyCost:13,
        toolId:'cajado', toolLabel:'Cajado de pastor',
        intro:'O rebanho precisa ser contado, os cochos verificados e os animais observados antes do calor aumentar.',
        steps:['Contar o rebanho','Verificar cochos e água','Separar os animais que precisam de atenção']
      },
      Agricultor: {
        id:'agricultor', label:'Canteiro comunitário', x:1080, y:920, radius:150,
        rewardItem:'graos', rewardLabel:'Grãos', rewardQty:3, rep:3, energyCost:14,
        toolId:'enxada', toolLabel:'Enxada de madeira',
        intro:'O pequeno canteiro precisa ser revolvido, irrigado e preparado para o próximo plantio.',
        steps:['Revolver a terra','Distribuir água','Organizar sementes e ferramentas']
      },
      Coletor: {
        id:'coletor', label:'Coleta do entorno', x:1505, y:895, radius:160,
        rewardItem:'ervas', rewardLabel:'Ervas', rewardQty:3, rep:3, energyCost:12,
        toolId:'cesto', toolLabel:'Cesto de coleta',
        intro:'O entorno do acampamento oferece gravetos, fibras e ervas úteis. É preciso coletar sem se afastar demais.',
        steps:['Examinar a vegetação','Separar ervas e fibras','Levar a coleta de volta ao setor']
      },
      Levita: {
        id:'levita', label:'Serviço comunitário', x:900, y:410, radius:145,
        rewardItem:'registros', rewardLabel:'Registros', rewardQty:1, rep:4, energyCost:10,
        toolId:'bolsa_registros', toolLabel:'Bolsa de registros',
        intro:'Há registros, recados e tarefas de serviço a organizar junto ao centro do setor.',
        steps:['Organizar os registros','Ajudar na distribuição de tarefas','Revisar os recados do dia']
      }
    };
    return configs[state.profile.vocation] || configs.Pastor;
  }

  function workKey() {
    return `${state.day}:${vocationConfig().id}`;
  }

  function workDoneToday() {
    return Boolean(state.workCompleted[workKey()]);
  }

  function workWindowOpen() {
    const minute = ((state.time % 1440) + 1440) % 1440;
    return minute >= 510 && minute < 990;
  }

  function vocationTaskText() {
    const cfg = vocationConfig();
    if (state.questStep < QUESTS.length - 1) return '';
    if (isShabbat()) return 'Shabat • sem turno de trabalho. O dia é dedicado ao descanso e à vida comunitária.';
    if (workDoneToday()) return canTurnInWork() ? `${cfg.label} concluído hoje • produção pronta para o Armazém.` : `${cfg.label} concluído hoje.`;
    if (state.workProgress?.id === cfg.id && state.workProgress.day === state.day) {
      return `Trabalho: ${cfg.label} • etapa ${state.workProgress.step + 1}/3 — ${cfg.steps[state.workProgress.step]}`;
    }
    if (workWindowOpen()) return `Turno disponível até 16:30: ${cfg.label}.`;
    return `Próximo turno de ${cfg.label}: 08:30–16:30.`;
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
    if (!meal) return dialogue('Cozinha','As refeições são servidas aqui: desjejum das 06:30 às 09:00, almoço das 12:00 às 14:00 e ceia das 18:00 às 20:30.');
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
    target.appendChild(moveTargetEl);
    cancelClickMove();
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
    world.appendChild(moveTargetEl);
    cancelClickMove();
    if (scene === 'standard') { state.x = 900; state.y = 350; }
    else if (scene === 'workshop') { state.x = 1325; state.y = 875; }
    else { state.x = 660; state.y = 1020; }
    save();
  }

  function inventoryRows() {
    const labels = {
      lenha:'Lenha',
      agua:'Água',
      'lã':'Lã',
      graos:'Grãos',
      ervas:'Ervas',
      registros:'Registros',
      racao:'Ração de viagem'
    };
    return Object.entries(labels)
      .map(([id,label]) => ({id,label,qty:Math.max(0,state.inventory[id] || 0)}))
      .filter(item => item.qty > 0);
  }

  function renderInventory() {
    const rows = inventoryRows();
    const cfg = vocationConfig();
    const gear = VOCATION_GEAR[state.profile.vocation];
    const ownsGear = Boolean(state.tools[gear.id]);
    const equipped = state.equippedTool === gear.id;
    const resources = rows.length
      ? rows.map(item => `<div class="inventory-row"><span>${item.label}</span><b>×${item.qty}</b>${item.id === 'racao' ? '<button class="inventory-use" id="useRation">USAR</button>' : ''}</div>`).join('')
      : '<div class="inventory-empty">Sua bolsa está vazia.</div>';
    inventoryContent.innerHTML = `
      <section class="inventory-section">
        <h3>Recursos</h3>
        ${resources}
      </section>
      <section class="inventory-section">
        <h3>Ferramenta da vocação</h3>
        ${ownsGear
          ? `<div class="inventory-gear"><span><b>${gear.label}</b><small>${equipped ? 'Equipada • reduz o gasto de energia no trabalho.' : 'Guardada • equipe para ganhar eficiência no trabalho.'}</small></span><button id="toggleGear">${equipped ? 'GUARDAR' : 'EQUIPAR'}</button></div>`
          : `<div class="inventory-empty">Fale com Eliabe depois da missão inicial para receber: <b>${gear.label}</b>.</div>`}
      </section>
      <div class="inventory-foot">Entregas ao armazém: ${state.warehouseTrades}</div>
    `;
    $('#useRation')?.addEventListener('click', useRation);
    $('#toggleGear')?.addEventListener('click', () => {
      state.equippedTool = equipped ? null : gear.id;
      save();
      refreshHud();
      renderInventory();
    });
  }

  function useRation() {
    if ((state.inventory.racao || 0) <= 0) return;
    state.inventory.racao -= 1;
    state.hunger = Math.min(100,state.hunger + 30);
    state.energy = Math.min(100,state.energy + 6);
    state.time += 10;
    save();
    refreshHud();
    toggleInventory(false);
    dialogue('Ração de viagem','Você faz uma refeição simples fora do horário da cozinha. A fome diminui e parte da energia retorna.');
  }

  function toggleInventory(force) {
    const open = force ?? inventoryOverlay.classList.contains('hidden');
    inventoryOverlay.classList.toggle('hidden', !open);
    if (open) {
      mapOverlay.classList.add('hidden');
      renderInventory();
    } else {
      keys.clear();
    }
  }

  function claimVocationTool() {
    const cfg = vocationConfig();
    if (state.tools[cfg.toolId]) {
      return dialogue('Eliabe — o artesão',`Seu ${cfg.toolLabel.toLowerCase()} já está com você. Abra a Bolsa para equipar ou guardar a ferramenta.`);
    }
    state.tools[cfg.toolId] = true;
    state.equippedTool = cfg.toolId;
    save();
    refreshHud();
    dialogue('Eliabe — o artesão',`Para o seu trabalho como ${state.profile.vocation.toLowerCase()}, leve este ${cfg.toolLabel.toLowerCase()}. Enquanto estiver equipado, o trabalho consumirá menos energia.`);
  }

  function canTurnInWork() {
    const cfg = vocationConfig();
    return (state.inventory[cfg.rewardItem] || 0) >= cfg.rewardQty;
  }

  function warehouseInteraction() {
    if (state.questStep < QUESTS.length - 1) {
      return dialogue('Armazéns','Mantimentos, tecidos, jarros e peças de reposição são organizados para atender as famílias do setor.');
    }
    const cfg = vocationConfig();
    if (!canTurnInWork()) {
      return dialogue('Armazém de Judá',`Entregue ${cfg.rewardQty} × ${cfg.rewardLabel} produzidos no seu turno para retirar 1 ração de viagem. Você ainda não tem a quantidade necessária.`);
    }
    state.inventory[cfg.rewardItem] -= cfg.rewardQty;
    state.inventory.racao = (state.inventory.racao || 0) + 1;
    state.warehouseTrades += 1;
    save();
    refreshHud();
    dialogue('Armazém de Judá',`Você entrega ${cfg.rewardQty} × ${cfg.rewardLabel} e recebe 1 ração de viagem. Ela pode ser usada pela Bolsa quando não houver refeição disponível na cozinha.`);
  }

  function getToolInteraction() {
    if (state.questStep < QUESTS.length - 1 || currentScene !== 'outdoor') return null;
    const cfg = vocationConfig();
    if (state.tools[cfg.toolId]) return null;
    const eliabe = npcAgents.eliabe;
    if (eliabe.inside || Math.hypot(state.x-eliabe.x,state.y-eliabe.y) >= 110) return null;
    return {action:`Receber ${cfg.toolLabel}`,run:claimVocationTool};
  }

  const ambientInteractions = [
    { id:'meal', x:489,y:570,r:95, action:()=>canEatNow() ? `${mealWindow().label} na cozinha` : 'Consultar cozinha', run:eatMeal },
    { id:'miria', npc:'miria', r:105, action:'Falar com Miriã', run:()=>dialogue('Miriã — a cuidadora',contextualNpcText('miria')) },
    { id:'hanan', npc:'hanan', r:105, action:'Falar com Hanan', run:()=>dialogue('Hanan — o cozinheiro',contextualNpcText('hanan')) },
    { id:'guard', npc:'guard', r:105, action:'Falar com o Guarda', run:()=>dialogue('Guarda de Judá',contextualNpcText('guard')) },
    { id:'enter-home', x:660,y:1005,r:90, action:'Entrar na sua tenda', run:()=>enterScene('home') },
    { id:'enter-standard', x:900,y:330,r:95, action:'Entrar na Tenda do Estandarte', run:()=>enterScene('standard') },
    { id:'enter-workshop', x:1325,y:835,r:105, action:'Entrar na oficina', run:()=>enterScene('workshop') },
    { id:'standard', x:900,y:205,r:150, action:'Observar Tenda do Estandarte', run:()=>dialogue('Tenda do Estandarte','O vermelho e o dourado destacam o setor de Judá. O estandarte do leão marca o ponto de liderança da tribo.') },
    { id:'workshop', x:1325,y:735,r:150, action:'Examinar oficina', run:()=>dialogue('Oficina de Judá','Madeira, metal, couro e ferramentas ocupam cada bancada. O trabalho de Eliabe mantém o acampamento em movimento.') },
    { id:'warehouse', x:380,y:505,r:145, action:()=>state.questStep < QUESTS.length - 1 ? 'Examinar armazém' : (canTurnInWork() ? 'Entregar produção no armazém' : 'Consultar armazém'), run:warehouseInteraction },
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
    agent.el.style.zIndex = String(100 + Math.round(690 + agent.y));
    agent.el.classList.add('animal-walking');
    agent.el.classList.toggle('face-left',dx < 0);
  }

  // A base visual dos objetos define se passam à frente ou atrás dos personagens.
  const depthScenery = [...world.querySelectorAll('.scenic-asset,.bench,.jar,.crate,.torch,.clay-cluster,.supply-pile,.tribe-banner')];
  function sortScenery() {
    depthScenery.forEach(el => {
      const foot = el.offsetTop + el.offsetHeight * .9;
      el.style.zIndex = String(100 + Math.round(foot));
    });
  }
  sortScenery();
  world.querySelectorAll('.scenic-asset').forEach(el => el.addEventListener('load', sortScenery, {once:true}));
  addEventListener('resize', sortScenery);

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

  function currentPosition() {
    return currentScene === 'outdoor' ? {x:state.x,y:state.y} : {x:indoorPos.x,y:indoorPos.y};
  }

  function canStandScene(x,y) {
    return currentScene === 'outdoor' ? canStand(x,y) : canStandInterior(currentScene,x,y);
  }

  function sceneBounds() {
    return currentScene === 'outdoor'
      ? {minX:135,maxX:1665,minY:95,maxY:1085,step:36}
      : {minX:85,maxX:915,minY:135,maxY:630,step:32};
  }

  function cancelClickMove() {
    clickPath = [];
    clickDestination = null;
    moveTargetEl.classList.add('hidden');
  }

  function nearestWalkable(x,y) {
    const b = sceneBounds();
    const tx = Math.max(b.minX,Math.min(b.maxX,x));
    const ty = Math.max(b.minY,Math.min(b.maxY,y));
    if (canStandScene(tx,ty)) return {x:tx,y:ty};
    for (let radius=b.step; radius<=b.step*5; radius+=b.step) {
      for (let angle=0; angle<Math.PI*2; angle+=Math.PI/8) {
        const px=Math.max(b.minX,Math.min(b.maxX,tx+Math.cos(angle)*radius));
        const py=Math.max(b.minY,Math.min(b.maxY,ty+Math.sin(angle)*radius));
        if (canStandScene(px,py)) return {x:px,y:py};
      }
    }
    return null;
  }

  function buildClickPath(targetX,targetY) {
    const b=sceneBounds();
    const start=currentPosition();
    const target=nearestWalkable(targetX,targetY);
    if (!target) return [];
    const cols=Math.floor((b.maxX-b.minX)/b.step)+1;
    const rows=Math.floor((b.maxY-b.minY)/b.step)+1;
    const toGrid=(p,min,max)=>Math.max(0,Math.min(max,Math.round((p-min)/b.step)));
    const sx=toGrid(start.x,b.minX,cols-1), sy=toGrid(start.y,b.minY,rows-1);
    const gx=toGrid(target.x,b.minX,cols-1), gy=toGrid(target.y,b.minY,rows-1);
    const key=(x,y)=>x+','+y;
    const point=(x,y)=>({x:b.minX+x*b.step,y:b.minY+y*b.step});
    const walkable=(x,y)=>{
      if(x<0||x>=cols||y<0||y>=rows) return false;
      const p=point(x,y);
      return canStandScene(p.x,p.y);
    };
    const open=[{x:sx,y:sy,g:0,f:Math.hypot(gx-sx,gy-sy)}];
    const records=new Map([[key(sx,sy),{g:0,parent:null}]]);
    const closed=new Set();
    const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    let reached=null;
    while(open.length){
      let bestIndex=0;
      for(let i=1;i<open.length;i++) if(open[i].f<open[bestIndex].f) bestIndex=i;
      const node=open.splice(bestIndex,1)[0];
      const nodeKey=key(node.x,node.y);
      if(closed.has(nodeKey)) continue;
      closed.add(nodeKey);
      if(node.x===gx&&node.y===gy){reached=node;break;}
      for(const [dx,dy] of dirs){
        const nx=node.x+dx, ny=node.y+dy;
        if(!walkable(nx,ny)) continue;
        if(dx&&dy && (!walkable(node.x+dx,node.y)||!walkable(node.x,node.y+dy))) continue;
        const nk=key(nx,ny);
        if(closed.has(nk)) continue;
        const ng=node.g+(dx&&dy?1.414:1);
        const prev=records.get(nk);
        if(prev&&prev.g<=ng) continue;
        records.set(nk,{g:ng,parent:nodeKey});
        open.push({x:nx,y:ny,g:ng,f:ng+Math.hypot(gx-nx,gy-ny)});
      }
    }
    if(!reached) return [target];
    const nodes=[];
    let cursor=key(reached.x,reached.y);
    while(cursor){
      const [x,y]=cursor.split(',').map(Number);
      nodes.push(point(x,y));
      cursor=records.get(cursor)?.parent || null;
    }
    nodes.reverse();
    nodes.shift();
    if(canStandScene(target.x,target.y)) nodes.push(target);
    return nodes;
  }

  function setClickDestination(x,y) {
    const target=nearestWalkable(x,y);
    if(!target) return;
    const path=buildClickPath(target.x,target.y);
    if(!path.length && Math.hypot(currentPosition().x-target.x,currentPosition().y-target.y)>10) return;
    clickPath=path;
    clickDestination=target;
    moveTargetEl.style.left=target.x+'px';
    moveTargetEl.style.top=target.y+'px';
    moveTargetEl.classList.remove('hidden');
  }

  function scenePointerPosition(container,event) {
    const rect=container.getBoundingClientRect();
    const scaleX=rect.width/container.offsetWidth;
    const scaleY=rect.height/container.offsetHeight;
    return {x:(event.clientX-rect.left)/scaleX,y:(event.clientY-rect.top)/scaleY};
  }

  function handleScenePointer(event) {
    if(event.button!==0 || isTouch()) return;
    if(!$('#dialogue').classList.contains('hidden') || !mapOverlay.classList.contains('hidden') || !inventoryOverlay.classList.contains('hidden') || !gameMenuOverlay.classList.contains('hidden')) return;
    const container=currentScene==='outdoor' ? world : currentScene==='standard' ? standardInterior : currentScene==='workshop' ? workshopInterior : playerInterior;
    if(event.currentTarget!==container) return;
    const p=scenePointerPosition(container,event);
    setClickDestination(p.x,p.y);
  }

  function questGuidance() {
    const quest = QUESTS[state.questStep];
    if (!quest?.target) return '';
    if (currentScene !== 'outdoor') return `${quest.label} Saia da tenda para seguir a missão.`;
    const npc = quest.id === 'eliabe' ? npcAgents.eliabe : quest.id === 'corral' ? npcAgents.child : quest.id === 'elder' ? npcAgents.elder : null;
    if (npc?.inside === 'rest') return `${quest.label} O personagem está descansando. Volte pela manhã.`;
    const destination = questDestination();
    const dx = destination.x - state.x, dy = destination.y - state.y;
    const distance = Math.round(Math.hypot(dx,dy));
    if (distance < (quest.target.r || 110)) return quest.label;
    const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'leste' : 'oeste') : (dy > 0 ? 'sul' : 'norte');
    const place = npc?.inside ? 'Entre na tenda indicada. ' : '';
    return `${quest.label} ${place}Siga para ${direction} (${distance} passos).`;
  }

  function questDestination() {
    const quest = QUESTS[state.questStep];
    if (!quest?.target) return dailyDestination();
    const npc = quest.id === 'eliabe' ? npcAgents.eliabe : quest.id === 'corral' ? npcAgents.child : quest.id === 'elder' ? npcAgents.elder : null;
    if (npc?.inside === 'workshop') return {x:1325,y:835,label:'Entre na oficina'};
    if (npc?.inside === 'standard') return {x:900,y:330,label:'Entre na tenda'};
    if (npc?.inside === 'rest') return {x:quest.target.x,y:quest.target.y,label:'Volte pela manhã'};
    return {x:npc?.x ?? quest.target.x,y:npc?.y ?? quest.target.y,label:quest.action};
  }

  function dailyDestination() {
    if (state.dailyTask?.id === 'morning-water') {
      if (state.dailyTask.step === 0) return {x:900,y:825,label:'Encha o jarro no poço'};
      if (!npcAgents.hanan.inside) return {x:npcAgents.hanan.x,y:npcAgents.hanan.y,label:'Entregue a Hanan'};
    }
    if (state.dailyTask?.id === 'evening-herd') {
      if (state.dailyTask.step === 0) return {x:900,y:1010,label:'Confira a entrada'};
      if (!npcAgents.child.inside) return {x:npcAgents.child.x,y:npcAgents.child.y,label:'Avise o rebanho'};
    }
    if (state.hunger <= 35 && canEatNow()) return {x:489,y:570,label:'Coma na Cozinha'};
    const windowId = timedWindowId();
    if (windowId === 'morning-water' && !dailyDone(windowId) && !npcAgents.hanan.inside)
      return {x:npcAgents.hanan.x,y:npcAgents.hanan.y,label:'Ajude Hanan'};
    if (windowId === 'evening-herd' && !dailyDone(windowId) && !npcAgents.child.inside)
      return {x:npcAgents.child.x,y:npcAgents.child.y,label:'Ajude no rebanho'};
    if (canTurnInWork()) return {x:380,y:505,label:'Entregue produção no Armazém'};
    return null;
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
    const meal = mealWindow();
    $('#mealHint').textContent = meal
      ? (canEatNow() ? `${meal.label} disponível na Cozinha, a oeste da fogueira.` : `${meal.label} já feita. Próxima refeição na Cozinha.`)
      : 'Coma na Cozinha, a oeste da fogueira: 06:30, 12:00 ou 18:00.';
    const warning = needWarning();
    document.querySelector('.needs-hud')?.classList.toggle('warning',Boolean(warning));
    dailyTaskEl.textContent = getDailyTaskText();
    vocationTaskEl.textContent = vocationTaskText();
    const items = [];
    if (state.inventory.lenha) items.push(`Lenha ×${state.inventory.lenha}`);
    if (state.inventory.agua) items.push(`Água ×${state.inventory.agua}`);
    if (state.inventory['lã']) items.push(`Lã ×${state.inventory['lã']}`);
    if (state.inventory.graos) items.push(`Grãos ×${state.inventory.graos}`);
    if (state.inventory.ervas) items.push(`Ervas ×${state.inventory.ervas}`);
    if (state.inventory.registros) items.push(`Registros ×${state.inventory.registros}`);
    if (state.inventory.racao) items.push(`Ração ×${state.inventory.racao}`);
    const cfg = vocationConfig();
    if (state.equippedTool === cfg.toolId) items.push(`⚒ ${cfg.toolLabel}`);
    inventoryMini.textContent = items.length ? items.join(' • ') : 'Bolsa vazia';
  }

  function updateMap() {
    const target = questDestination();
    const marker = $('#mapQuest');
    marker.classList.toggle('hidden', !target);
    if (target) {
      marker.style.left = `${target.x / 18}%`;
      marker.style.top = `${target.y / 12}%`;
    }
    const playerMarker = $('#mapPlayer');
    playerMarker.style.left = `${state.x / 18}%`;
    playerMarker.style.top = `${state.y / 12}%`;
    $('#mapObjective').textContent = questGuidance() || getDailyTaskText();
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

  function startOrAdvanceWork() {
    const cfg = vocationConfig();
    if (isShabbat()) {
      return dialogue('Shabat','Hoje não há turno regular de trabalho. O acampamento reduz o ritmo e prioriza descanso, convívio e adoração.');
    }
    if (!workWindowOpen()) {
      return dialogue(cfg.label,'O turno regular acontece entre 08:30 e 16:30.');
    }
    if (workDoneToday()) {
      return dialogue(cfg.label,'Seu trabalho desta jornada já foi concluído. Agora você pode cuidar de outras tarefas.');
    }
    const workEnergyCost = Math.max(6,cfg.energyCost - (state.equippedTool === cfg.toolId ? 3 : 0));
    if (state.energy < workEnergyCost) {
      return dialogue('Cansaço','Você está sem energia suficiente para continuar este trabalho. Coma algo ou descanse.');
    }
    if (!state.workProgress || state.workProgress.id !== cfg.id || state.workProgress.day !== state.day) {
      state.workProgress = {id:cfg.id,day:state.day,step:0};
      save();
      refreshHud();
      return dialogue(cfg.label,cfg.intro);
    }

    const stepIndex = state.workProgress.step;
    state.energy = Math.max(0,state.energy - workEnergyCost);
    state.hunger = Math.max(0,state.hunger - 5);
    state.time += 35;
    state.workProgress.step += 1;

    if (state.workProgress.step >= cfg.steps.length) {
      state.workCompleted[workKey()] = true;
      state.inventory[cfg.rewardItem] = (state.inventory[cfg.rewardItem] || 0) + cfg.rewardQty;
      state.reputation += cfg.rep;
      state.workProgress = null;
      save();
      refreshHud();
      return dialogue('Turno concluído',`${cfg.label} concluído. Você recebe ${cfg.rewardQty} × ${cfg.rewardLabel} e ganha ${cfg.rep} de reputação.`);
    }

    save();
    refreshHud();
    dialogue(cfg.label,`${cfg.steps[stepIndex]} concluído. Ainda há trabalho pela frente.`);
  }

  function getWorkInteraction() {
    if (state.questStep < QUESTS.length - 1 || currentScene !== 'outdoor') return null;
    const cfg = vocationConfig();
    if (Math.hypot(state.x-cfg.x,state.y-cfg.y) > cfg.radius) return null;
    if (isShabbat()) return {action:'Observar o descanso de Shabat',run:startOrAdvanceWork};
    if (workDoneToday()) return {action:'Rever o trabalho do dia',run:startOrAdvanceWork};
    return {action:state.workProgress?.id === cfg.id ? cfg.steps[state.workProgress.step] : `Iniciar: ${cfg.label}`,run:startOrAdvanceWork};
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
    if (canTurnInWork()) return 'Produção pronta: leve os recursos do seu turno ao Armazém de Judá para retirar uma ração.';
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
    const work = getWorkInteraction();
    if (work) return work;
    const tool = getToolInteraction();
    if (tool) return tool;
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
        const cfg = vocationConfig();
        if (state.questStep >= QUESTS.length - 1 && !state.tools[cfg.toolId]) return {action:`Receber ${cfg.toolLabel}`,run:claimVocationTool};
        return {action:'Falar com Eliabe',run:()=>dialogue('Eliabe — o artesão',contextualNpcText('eliabe'))};
      }
      if (Math.hypot(indoorPos.x-840,indoorPos.y-300) < 110) {
        return {action:'Observar forja',run:()=>dialogue('Forja','O calor é intenso. Carvão, metal aquecido e ferramentas pesadas ocupam o canto da oficina.')};
      }
    }
    return null;
  }

  function sleepUntilMorning() {
    const oldDay = state.day;
    const cfg = vocationConfig();
    const worked = Boolean(state.workCompleted[`${oldDay}:${cfg.id}`]);
    const routines = Object.keys(state.dailyCompleted).filter(k=>k.startsWith(oldDay + ':')).length;
    state.lastDaySummary = {
      day:oldDay,
      worked,
      routines,
      reputation:state.reputation
    };
    state.day += 1;
    state.time = 360;
    state.energy = 100;
    state.hunger = Math.max(52,state.hunger - 8);
    state.dailyTask = null;
    state.workProgress = null;
    save();
    refreshHud();
    const tomorrow = isShabbat() ? ' Hoje é Shabat: não haverá turno regular de trabalho.' : '';
    dialogue('Amanhecer',`Dia ${oldDay} encerrado. Trabalho: ${worked ? 'concluído' : 'não realizado'} • rotinas comunitárias: ${routines}. Começa o Dia ${state.day} com a energia restaurada.${tomorrow}`,'Levantar');
  }

  function saveTimeLabel() {
    if (!state.lastSavedAt) return 'Ainda não salvo nesta sessão.';
    const d = new Date(state.lastSavedAt);
    return 'Último save: ' + d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }

  function refreshSaveStatus() {
    if (saveStatusText) saveStatusText.textContent = saveTimeLabel();
  }

  function manualSave() {
    save();
    refreshSaveStatus();
    dialogue('Jogo salvo','Seu progresso foi gravado neste navegador.');
  }

  function exportSave() {
    save();
    const payload = {
      game:'cronicas-da-promessa',
      format:1,
      exportedAt:new Date().toISOString(),
      state
    };
    const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName=(state.profile?.name || 'jornada').replace(/[^a-z0-9_-]+/gi,'_');
    link.href=url;
    link.download=`cronicas-da-promessa_${safeName}_dia-${state.day}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    refreshSaveStatus();
  }

  function importSaveFile(file) {
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const payload=JSON.parse(String(reader.result||''));
        const incoming=payload?.game==='cronicas-da-promessa' ? payload.state : payload;
        if(!incoming?.profile?.name || !Number.isFinite(Number(incoming.day))) throw new Error('Arquivo incompatível');
        state=incoming;
        normalizeState();
        save();
        gameMenuOverlay.classList.add('hidden');
        dialogue('Save importado',`Progresso de ${state.profile.name}, Dia ${state.day}, carregado com sucesso.`,'Continuar');
        setTimeout(()=>game(),0);
      }catch(error){
        console.warn('Falha ao importar save:',error);
        dialogue('Não foi possível importar','O arquivo selecionado não parece ser um save válido de Crônicas da Promessa.');
      }finally{
        saveFileInput.value='';
      }
    };
    reader.readAsText(file);
  }

  function toggleGameMenu(force) {
    const open=force ?? gameMenuOverlay.classList.contains('hidden');
    gameMenuOverlay.classList.toggle('hidden',!open);
    if(open){
      mapOverlay.classList.add('hidden');
      inventoryOverlay.classList.add('hidden');
      cancelClickMove();
      save();
      refreshSaveStatus();
    } else keys.clear();
  }

  function interact() {
    if (!$('#dialogue').classList.contains('hidden') || !mapOverlay.classList.contains('hidden') || !inventoryOverlay.classList.contains('hidden') || !gameMenuOverlay.classList.contains('hidden')) return;
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

    const destination = questDestination();
    worldQuest.classList.toggle('hidden', !destination || currentScene !== 'outdoor');
    if (destination) {
      worldQuest.style.left = `${destination.x}px`;
      worldQuest.style.top = `${destination.y - 58}px`;
      $('#worldQuestLabel').textContent = destination.label;
    }

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
    const key=event.key.toLowerCase();
    if (['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown'].includes(key)) cancelClickMove();
    if (key === 'i' && !event.repeat) {
      if ($('#dialogue').classList.contains('hidden') && gameMenuOverlay.classList.contains('hidden')) toggleInventory();
      return;
    }
    if (key === 'm' && !event.repeat) {
      if ($('#dialogue').classList.contains('hidden') && inventoryOverlay.classList.contains('hidden') && gameMenuOverlay.classList.contains('hidden')) toggleMap();
      return;
    }
    if (!gameMenuOverlay.classList.contains('hidden')) {
      if (event.key === 'Escape') toggleGameMenu(false);
      return;
    }
    if (!inventoryOverlay.classList.contains('hidden')) {
      if (event.key === 'Escape') toggleInventory(false);
      return;
    }
    if (!mapOverlay.classList.contains('hidden')) {
      if (event.key === 'Escape') toggleMap(false);
      return;
    }
    keys.add(key);
    if (key === 'e' && !event.repeat) interact();
    if (event.key === 'Escape') {
      const modal = $('#dialogue');
      if (!modal.classList.contains('hidden')) modal.classList.add('hidden');
      else toggleGameMenu(true);
    }
  }
  function onKeyUp(event) { keys.delete(event.key.toLowerCase()); }

  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  actionButton.addEventListener('click', interact);
  inventoryButton.addEventListener('click', () => toggleInventory());
  $('#closeInventory').addEventListener('click', () => toggleInventory(false));
  mapButton.addEventListener('click', () => toggleMap());
  $('#closeMap').addEventListener('click', () => toggleMap(false));
  menuButton.addEventListener('click', () => toggleGameMenu());
  $('#closeGameMenu').addEventListener('click', () => toggleGameMenu(false));
  $('#saveNowButton').addEventListener('click', manualSave);
  $('#exportSaveButton').addEventListener('click', exportSave);
  $('#importSaveButton').addEventListener('click', () => saveFileInput.click());
  saveFileInput.addEventListener('change', () => importSaveFile(saveFileInput.files?.[0]));
  $('#returnMainMenuButton').addEventListener('click', () => { save(); menu(); });

  world.addEventListener('pointerdown',handleScenePointer);
  standardInterior.addEventListener('pointerdown',handleScenePointer);
  workshopInterior.addEventListener('pointerdown',handleScenePointer);
  playerInterior.addEventListener('pointerdown',handleScenePointer);

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
    // Usa o sprite lateral já carregável e espelha a imagem no navegador.
    const mirrorLeft = playerSexSlug === 'female' && playerFacing === 'left';
    const spriteFacing = mirrorLeft ? 'right' : playerFacing;
    const src = `./assets/art/characters/${playerSexSlug}_${spriteFacing}_${playerFrame}.svg`;
    playerImg.classList.toggle('mirror-left', mirrorLeft);
    if (!playerImg.src.endsWith(src.replace('./','/'))) playerImg.setAttribute('src',src);
    player.dataset.facing = playerFacing;
  }

  let last = performance.now();
  let lastHudRefresh = 0;
  const persistOnLeave=()=>save();
  addEventListener('pagehide',persistOnLeave);
  document.addEventListener('visibilitychange',persistOnLeave);

  function tick(now) {
    if (!document.body.contains(player)) {
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      removeEventListener('resize', sortScenery);
      removeEventListener('pagehide',persistOnLeave);
      document.removeEventListener('visibilitychange',persistOnLeave);
      return;
    }
    const dt = Math.min((now-last)/16.67,2); last = now;
    const dialogOpen = !$('#dialogue').classList.contains('hidden') || !mapOverlay.classList.contains('hidden') || !inventoryOverlay.classList.contains('hidden') || !gameMenuOverlay.classList.contains('hidden');
    let dx=0,dy=0;
    if (!dialogOpen) {
      if (keys.has('a')||keys.has('arrowleft')) dx--;
      if (keys.has('d')||keys.has('arrowright')) dx++;
      if (keys.has('w')||keys.has('arrowup')) dy--;
      if (keys.has('s')||keys.has('arrowdown')) dy++;
      if (!dx && !dy && clickPath.length) {
        const pos=currentPosition();
        while(clickPath.length && Math.hypot(clickPath[0].x-pos.x,clickPath[0].y-pos.y)<8) clickPath.shift();
        if(clickPath.length){
          dx=clickPath[0].x-pos.x;
          dy=clickPath[0].y-pos.y;
        } else cancelClickMove();
      }
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
        state.dailyTask = null;
        state.workProgress = null;
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
    if (now - lastAutoSave > 8000) {
      save();
      lastAutoSave = now;
    }
    draw();
    requestAnimationFrame(tick);
  }

  draw();
  requestAnimationFrame(tick);
}

load();
try { menu(); } catch (error) { renderFatal(error); }
