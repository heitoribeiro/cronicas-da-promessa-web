const DEFAULT_MANIFEST = {
  "schema": 1,
  "project": "Crônicas da Promessa",
  "version": "0.25",
  "architecture": "RO-inspired sprite/action metadata with original artwork",
  "directionOrder8": [
    "s",
    "sw",
    "w",
    "nw",
    "n",
    "ne",
    "e",
    "se"
  ],
  "directionOrder4": [
    "s",
    "w",
    "n",
    "e"
  ],
  "defaults": {
    "adult": {
      "canvas": {
        "width": 64,
        "height": 88
      },
      "pivot": {
        "x": 32,
        "y": 84
      },
      "collisionRadius": 24,
      "ySortAnchor": "feet",
      "actions": {
        "idle": {
          "frames": 3,
          "frameMs": 240
        },
        "walk": {
          "frames": 8,
          "frameMs": 115
        },
        "interact": {
          "frames": 3,
          "frameMs": 180
        },
        "work": {
          "frames": 6,
          "frameMs": 130
        },
        "hurt": {
          "frames": 3,
          "frameMs": 150
        }
      }
    },
    "child": {
      "canvas": {
        "width": 64,
        "height": 88
      },
      "pivot": {
        "x": 32,
        "y": 80
      },
      "collisionRadius": 18,
      "ySortAnchor": "feet",
      "visualHeightRatio": 0.78,
      "actions": {
        "idle": {
          "frames": 3,
          "frameMs": 260
        },
        "walk": {
          "frames": 8,
          "frameMs": 125
        },
        "interact": {
          "frames": 3,
          "frameMs": 190
        }
      }
    }
  },
  "players": {
    "male": {
      "mode": "legacy_sheet",
      "source": "./assets/art/pixel/characters/male_sheet.png",
      "frame": {
        "width": 64,
        "height": 88
      },
      "sheet": {
        "columns": 2,
        "rows": 4
      },
      "legacyDirectionRows": {
        "s": 0,
        "w": 1,
        "e": 2,
        "n": 3
      },
      "targetDirections": 8,
      "targetActions": [
        "idle",
        "walk",
        "interact",
        "work",
        "hurt"
      ]
    },
    "female": {
      "mode": "legacy_sheet",
      "source": "./assets/art/pixel/characters/female_sheet.png",
      "frame": {
        "width": 64,
        "height": 88
      },
      "sheet": {
        "columns": 2,
        "rows": 4
      },
      "legacyDirectionRows": {
        "s": 0,
        "w": 1,
        "e": 2,
        "n": 3
      },
      "targetDirections": 8,
      "targetActions": [
        "idle",
        "walk",
        "interact",
        "work",
        "hurt"
      ]
    }
  },
  "npcs": {
    "elder": {
      "name": "Ancião",
      "archetype": "adult",
      "mode": "static_legacy",
      "source": "./assets/art/pixel/npcs/elder.png",
      "canvas": {
        "width": 64,
        "height": 88
      },
      "pivot": {
        "x": 32,
        "y": 84
      },
      "legacy": {
        "scale": 0.96,
        "shiftX": 0,
        "shiftY": 1
      },
      "target": {
        "directions": 8,
        "actions": [
          "idle",
          "walk",
          "talk"
        ]
      }
    },
    "eliabe": {
      "name": "Eliabe",
      "archetype": "adult",
      "mode": "static_legacy",
      "source": "./assets/art/pixel/npcs/eliabe.png",
      "canvas": {
        "width": 64,
        "height": 88
      },
      "pivot": {
        "x": 32,
        "y": 84
      },
      "legacy": {
        "scale": 1,
        "shiftX": 0,
        "shiftY": 0
      },
      "target": {
        "directions": 8,
        "actions": [
          "idle",
          "walk",
          "talk",
          "work"
        ],
        "pathPattern": "./assets/art/pixel/npcs/eliabe/{action}/{direction}/{frame}.png"
      }
    },
    "miria": {
      "name": "Miriã",
      "archetype": "adult",
      "mode": "static_legacy",
      "source": "./assets/art/pixel/npcs/miria.png",
      "canvas": {
        "width": 64,
        "height": 88
      },
      "pivot": {
        "x": 32,
        "y": 84
      },
      "legacy": {
        "scale": 1.1,
        "shiftX": 0,
        "shiftY": 0
      },
      "target": {
        "directions": 8,
        "actions": [
          "idle",
          "walk",
          "talk"
        ]
      }
    },
    "hanan": {
      "name": "Hanan",
      "archetype": "adult",
      "mode": "static_legacy",
      "source": "./assets/art/pixel/npcs/hanan.png",
      "canvas": {
        "width": 64,
        "height": 88
      },
      "pivot": {
        "x": 32,
        "y": 84
      },
      "legacy": {
        "scale": 1,
        "shiftX": 0,
        "shiftY": 0
      },
      "target": {
        "directions": 8,
        "actions": [
          "idle",
          "walk",
          "talk",
          "work"
        ]
      }
    },
    "guard": {
      "name": "Guarda de Judá",
      "archetype": "adult",
      "mode": "static_legacy",
      "source": "./assets/art/pixel/npcs/guard.png",
      "canvas": {
        "width": 64,
        "height": 88
      },
      "pivot": {
        "x": 32,
        "y": 84
      },
      "accessoryCanvasTarget": {
        "width": 96,
        "height": 112
      },
      "legacy": {
        "scale": 0.88,
        "shiftX": 0,
        "shiftY": 3
      },
      "target": {
        "directions": 8,
        "actions": [
          "idle",
          "walk",
          "talk",
          "ready"
        ]
      }
    },
    "child": {
      "name": "Criança do Rebanho",
      "archetype": "child",
      "mode": "static_legacy",
      "source": "./assets/art/npcs/herd_child.svg",
      "canvas": {
        "width": 48,
        "height": 66
      },
      "pivot": {
        "x": 24,
        "y": 62
      },
      "legacy": {
        "scale": 1,
        "shiftX": 0,
        "shiftY": 0
      },
      "target": {
        "directions": 4,
        "actions": [
          "idle",
          "walk",
          "talk"
        ]
      }
    }
  }
};

export const DIRECTION_ORDER_8 = ['s','sw','w','nw','n','ne','e','se'];
export const DIRECTION_ORDER_4 = ['s','w','n','e'];

export async function loadSpriteManifest(url = './assets/art/pixel/metadata/sprite_manifest.json') {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('manifest ' + response.status);
    const parsed = await response.json();
    return parsed?.npcs ? parsed : DEFAULT_MANIFEST;
  } catch (error) {
    console.warn('[sprites] usando manifesto interno de contingência', error);
    return DEFAULT_MANIFEST;
  }
}

export function directionFromVector(dx, dy, eightWay = false) {
  if (!dx && !dy) return 's';
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (!eightWay) {
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'w' : 'e';
    return dy < 0 ? 'n' : 's';
  }
  if (angle >= -22.5 && angle < 22.5) return 'e';
  if (angle >= 22.5 && angle < 67.5) return 'se';
  if (angle >= 67.5 && angle < 112.5) return 's';
  if (angle >= 112.5 && angle < 157.5) return 'sw';
  if (angle >= 157.5 || angle < -157.5) return 'w';
  if (angle >= -157.5 && angle < -112.5) return 'nw';
  if (angle >= -112.5 && angle < -67.5) return 'n';
  return 'ne';
}

function framePath(pattern, action, direction, frame) {
  return pattern
    .replace('{action}', action)
    .replace('{direction}', direction)
    .replace('{frame}', String(frame).padStart(2,'0'));
}

export class NpcSpriteController {
  constructor(element, id, manifest) {
    this.element = element;
    this.image = element?.querySelector('img') || null;
    this.id = id;
    this.manifest = manifest || DEFAULT_MANIFEST;
    this.meta = this.manifest.npcs?.[id] || null;
    this.action = 'idle';
    this.direction = 's';
    this.frame = 0;
    this.frameStartedAt = 0;
    this.lastSrc = '';
    this.viewport = null;
    this.applyLayout();
  }

  ensureViewport() {
    if (!this.image || !this.element) return null;
    let viewport = this.image.closest('.sprite-viewport');
    if (!viewport) {
      viewport = document.createElement('span');
      viewport.className = 'sprite-viewport';
      this.image.parentNode.insertBefore(viewport, this.image);
      viewport.appendChild(this.image);
    }
    this.image.classList.add('sprite-sheet-image');
    this.viewport = viewport;
    return viewport;
  }

  getActionConfig(action = this.action) {
    const atlasCfg = this.meta?.atlas?.actions?.[action];
    if (atlasCfg) return atlasCfg;
    const defaults = this.manifest.defaults?.[this.meta?.archetype || 'adult']?.actions || {};
    return this.meta?.actions?.[action] || defaults[action] || null;
  }

  renderCurrentFrame() {
    if (!this.image || !this.meta) return;
    const mode = this.meta.mode || 'static_legacy';

    if (mode === 'atlas') {
      const cfg = this.getActionConfig(this.action);
      const atlas = this.meta.atlas || {};
      if (!cfg?.source) return;
      const frameW = Number(atlas.frame?.width || this.meta.canvas?.width || 96);
      const frameH = Number(atlas.frame?.height || this.meta.canvas?.height || 112);
      const frameCount = Math.max(1, Number(cfg.frames) || 1);
      const directionOrder = atlas.directionOrder || this.manifest.directionOrder8 || DIRECTION_ORDER_8;
      const row = Math.max(0, directionOrder.indexOf(this.direction));
      const sheetW = frameW * frameCount;
      const sheetH = frameH * directionOrder.length;

      if (cfg.source !== this.lastSrc) {
        this.lastSrc = cfg.source;
        this.image.src = cfg.source;
      }
      this.element.style.setProperty('--sprite-sheet-w', sheetW + 'px');
      this.element.style.setProperty('--sprite-sheet-h', sheetH + 'px');
      this.element.style.setProperty('--atlas-x', (-this.frame * frameW) + 'px');
      this.element.style.setProperty('--atlas-y', (-row * frameH) + 'px');
      return;
    }

    if (mode === 'sequence' && this.meta.target?.pathPattern) {
      const src = framePath(this.meta.target.pathPattern, this.action, this.direction, this.frame);
      if (src !== this.lastSrc) {
        this.lastSrc = src;
        this.image.src = src;
      }
    }
  }

  setAction(action, now = performance.now()) {
    if (!action || action === this.action) return;
    this.action = action;
    this.frame = 0;
    this.frameStartedAt = now;
    this.element.dataset.action = action;
    this.renderCurrentFrame();
  }

  applyLayout() {
    if (!this.element || !this.meta) return;
    const canvas = this.meta.canvas || this.manifest.defaults?.adult?.canvas || {width:64,height:88};
    const pivot = this.meta.pivot || {x:Math.round(canvas.width/2),y:canvas.height-4};
    const legacy = this.meta.legacy || {};
    this.element.dataset.spriteId = this.id;
    this.element.dataset.spriteMode = this.meta.mode || 'static_legacy';
    this.element.dataset.direction = this.direction;
    this.element.dataset.action = this.action;
    this.element.style.setProperty('--sprite-frame-w', canvas.width + 'px');
    this.element.style.setProperty('--sprite-frame-h', canvas.height + 'px');
    this.element.style.setProperty('--sprite-pivot-x', pivot.x + 'px');
    this.element.style.setProperty('--sprite-pivot-y', pivot.y + 'px');
    this.element.style.setProperty('--sprite-pivot-neg-y', (-pivot.y) + 'px');
    this.element.style.setProperty('--sprite-legacy-scale', legacy.scale ?? 1);
    this.element.style.setProperty('--sprite-shift-x', (legacy.shiftX ?? 0) + 'px');
    this.element.style.setProperty('--sprite-shift-y', (legacy.shiftY ?? 0) + 'px');
    if (this.meta.mode === 'atlas') {
      const viewport = this.ensureViewport();
      if (viewport) {
        viewport.style.width = canvas.width + 'px';
        viewport.style.height = canvas.height + 'px';
      }
      this.renderCurrentFrame();
    } else if (this.image && this.meta.source && !this.image.getAttribute('src')) {
      this.image.src = this.meta.source;
    }
  }

  setMotion(dx, dy, now = performance.now(), moving = Boolean(dx || dy)) {
    if (!this.element || !this.meta) return;
    const targetDirections = this.meta.target?.directions || 4;
    if (moving) this.direction = directionFromVector(dx, dy, targetDirections >= 8);
    const nextAction = moving ? 'walk' : 'idle';
    if (nextAction !== this.action) {
      this.action = nextAction;
      this.frame = 0;
      this.frameStartedAt = now;
    }

    this.element.dataset.direction = this.direction;
    this.element.dataset.action = this.action;
    this.element.classList.toggle('npc-walking', moving);
    this.element.classList.toggle('face-left', this.direction === 'w' || this.direction === 'sw' || this.direction === 'nw');
    this.element.classList.toggle('face-right', this.direction === 'e' || this.direction === 'se' || this.direction === 'ne');
    this.element.classList.toggle('face-up', this.direction === 'n' || this.direction === 'ne' || this.direction === 'nw');
    this.element.classList.toggle('face-down', this.direction === 's' || this.direction === 'se' || this.direction === 'sw');

    const animatedMode = this.meta.mode === 'sequence' || this.meta.mode === 'atlas';
    if (!animatedMode || !this.image) return;

    const cfg = this.getActionConfig(this.action);
    if (!cfg) return;
    const frameMs = Math.max(40, Number(cfg.frameMs) || 120);
    const frameCount = Math.max(1, Number(cfg.frames) || 1);
    if (!this.frameStartedAt) this.frameStartedAt = now;
    if (now - this.frameStartedAt >= frameMs) {
      const steps = Math.floor((now - this.frameStartedAt) / frameMs);
      this.frame = (this.frame + steps) % frameCount;
      this.frameStartedAt += steps * frameMs;
    }
    this.renderCurrentFrame();
  }
}

export function createNpcSpriteControllers(agents, manifest) {
  const controllers = {};
  Object.entries(agents || {}).forEach(([id, agent]) => {
    if (!agent?.el) return;
    const controller = new NpcSpriteController(agent.el, id, manifest || DEFAULT_MANIFEST);
    controller.setMotion(0,0,performance.now(),false);
    controllers[id] = controller;
  });
  return controllers;
}
