const app = document.querySelector('#app');
const SAVE = 'cronicas-promessa-save-v2';
const tribes = ['Rúben','Simeão','Levi','Judá','Dã','Naftali','Gade','Aser','Issacar','Zebulom','José','Benjamim'];
const vocations = ['Pastor','Agricultor','Coletor','Levita'];

let state = {
  profile: null,
  x: 900,
  y: 980,
  day: 1,
  time: 480,
  inventory: {},
  reputation: 0
};

function $(selector) {
  return document.querySelector(selector);
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch (error) {
    console.warn('Falha ao carregar save local:', error);
  }
}

function save() {
  try {
    localStorage.setItem(SAVE, JSON.stringify(state));
  } catch (error) {
    console.warn('Falha ao salvar progresso:', error);
  }
}

function isTouch() {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function renderFatal(error) {
  console.error(error);
  app.innerHTML = `
    <main class="screen">
      <section class="panel">
        <h1 class="title" style="font-size:36px">CRÔNICAS DA PROMESSA</h1>
        <p class="subtitle">O jogo encontrou um erro de inicialização.</p>
        <div class="menu">
          <button class="btn" id="reloadGame">RECARREGAR</button>
        </div>
        <p class="subtitle" style="font-size:13px">Web Alpha 0.2.1</p>
      </section>
    </main>`;
  const reload = $('#reloadGame');
  if (reload) reload.addEventListener('click', () => location.reload());
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
        <p class="subtitle">Web Alpha 0.2.1 • Judá jogável</p>
      </section>
    </main>`;

  $('#newGame').addEventListener('click', createCharacter);
  const continueButton = $('#continueGame');
  if (state.profile) continueButton.addEventListener('click', game);
}

function createCharacter() {
  app.innerHTML = `
    <main class="screen">
      <section class="panel">
        <h2 class="title" style="font-size:36px">SUA JORNADA COMEÇA AQUI</h2>
        <div class="form">
          <label>NOME
            <input id="characterName" maxlength="22" placeholder="Seu nome" autocomplete="off"/>
          </label>
          <div class="row">
            <label>PERSONAGEM
              <select id="characterSex">
                <option>Masculino</option>
                <option>Feminino</option>
              </select>
            </label>
            <label>TRIBO DE ISRAEL
              <select id="characterTribe">
                ${tribes.map(t => `<option ${t === 'Judá' ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </label>
          </div>
          <label>VOCAÇÃO
            <select id="characterVocation">
              ${vocations.map(v => `<option>${v}</option>`).join('')}
            </select>
          </label>
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
    if (!value) {
      nameInput.focus();
      return;
    }

    state = {
      profile: {
        name: value,
        sex: $('#characterSex').value,
        tribe: $('#characterTribe').value,
        vocation: $('#characterVocation').value
      },
      x: 900,
      y: 980,
      day: 1,
      time: 480,
      inventory: {},
      reputation: 0
    };

    save();
    game();
  });
}

function game() {
  if (!state.profile) {
    createCharacter();
    return;
  }

  app.innerHTML = `
    <main class="game">
      <div class="world" id="world">
        <div class="zone standard-zone">TENDA DO ESTANDARTE</div>
        <div class="zone council-zone">CONSELHO</div>
        <div class="zone family-zone">TENDAS FAMILIARES</div>
        <div class="zone corral-zone">CURRAIS</div>
        <div class="zone workshop-zone">OFICINAS</div>

        <div class="path main-v"></div>
        <div class="path main-h"></div>
        <div class="court"></div>

        <div class="tent standard" style="left:780px;top:105px"></div>
        <div class="tent" style="left:350px;top:270px"></div>
        <div class="tent" style="left:1190px;top:250px"></div>
        <div class="tent" style="left:1370px;top:360px"></div>

        <div class="fire" style="left:875px;top:555px"></div>
        <div class="well" style="left:855px;top:790px"></div>
        <div class="prop" style="left:290px;top:700px">🐑</div>
        <div class="prop" style="left:390px;top:740px">🐐</div>
        <div class="prop" style="left:1280px;top:720px">⚒</div>

        <div class="player" id="player"></div>
      </div>

      <div class="hud">
        <b>${state.profile.name}</b> • Tribo de ${state.profile.tribe} • ${state.profile.vocation}<br>
        Dia ${state.day} • <span id="clock"></span> • Rep. <span id="rep">${state.reputation}</span>
      </div>

      <div class="objective" id="objective">Objetivo: vá até a fogueira central.</div>
      <div class="prompt hidden" id="prompt"></div>
      <button class="game-menu" id="gameMenu">☰</button>

      <div class="touch hidden" id="touchControls">
        <button data-k="w">▲</button>
        <div>
          <button data-k="a">◀</button>
          <button data-k="s">▼</button>
          <button data-k="d">▶</button>
        </div>
      </div>

      <button class="action hidden" id="actionButton">AÇÃO</button>
      <div class="badge">Web Alpha 0.2.1</div>
    </main>`;

  const world = $('#world');
  const player = $('#player');
  const prompt = $('#prompt');
  const touchControls = $('#touchControls');
  const actionButton = $('#actionButton');
  const clock = $('#clock');
  const rep = $('#rep');
  const objective = $('#objective');
  const menuButton = $('#gameMenu');
  const keys = new Set();

  if (isTouch()) touchControls.classList.remove('hidden');

  let near = false;
  let completed = false;

  function interact() {
    if (!near) return;

    if (!completed) {
      completed = true;
      state.reputation += 2;
      state.inventory.lenha = (state.inventory.lenha || 0) + 1;
      save();
      rep.textContent = state.reputation;
      objective.textContent = 'Objetivo concluído: você conheceu o pátio central.';
      prompt.textContent = '+1 Lenha • Reputação +2';
    } else {
      prompt.textContent = 'A fogueira aquece o pátio de Judá.';
    }
  }

  function draw() {
    player.style.left = state.x + 'px';
    player.style.top = state.y + 'px';

    world.style.transform = `translate(${innerWidth / 2 - state.x}px,${innerHeight / 2 - state.y}px)`;

    near = Math.hypot(state.x - 900, state.y - 590) < 105;
    prompt.classList.toggle('hidden', !near);
    actionButton.classList.toggle('hidden', !near || !isTouch());

    if (near && !completed) {
      prompt.textContent = isTouch() ? 'AÇÃO — Examinar fogueira' : 'E — Examinar fogueira';
    }

    const h = Math.floor(state.time / 60) % 24;
    const m = Math.floor(state.time % 60);
    clock.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function onKeyDown(event) {
    keys.add(event.key.toLowerCase());
    if (event.key.toLowerCase() === 'e') interact();
    if (event.key === 'Escape') {
      save();
      menu();
    }
  }

  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);

  actionButton.addEventListener('click', interact);
  menuButton.addEventListener('click', () => {
    save();
    menu();
  });

  touchControls.querySelectorAll('button').forEach(button => {
    const key = button.dataset.k;
    const press = event => {
      event.preventDefault();
      keys.add(key);
    };
    const release = event => {
      event.preventDefault();
      keys.delete(key);
    };

    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
  });

  let last = performance.now();

  function tick(now) {
    if (!document.body.contains(player)) {
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      return;
    }

    const dt = Math.min((now - last) / 16.67, 2);
    last = now;

    let dx = 0;
    let dy = 0;

    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;
    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;

    if (dx || dy) {
      const length = Math.hypot(dx, dy);
      state.x = Math.max(70, Math.min(1690, state.x + (dx / length) * 4.2 * dt));
      state.y = Math.max(70, Math.min(1090, state.y + (dy / length) * 4.2 * dt));
      state.time += 0.04 * dt;
    }

    draw();
    requestAnimationFrame(tick);
  }

  draw();
  requestAnimationFrame(tick);
}

load();

try {
  menu();
} catch (error) {
  renderFatal(error);
}
