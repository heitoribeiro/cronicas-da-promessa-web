const FALLBACK = {
  "schema": 1,
  "id": "judah",
  "name": "Acampamento de Judá",
  "status": "prototype-active",
  "prototype": {
    "world": {
      "width": 1800,
      "height": 1200
    },
    "visualTilePx": 16,
    "navCellPx": 8,
    "playableBounds": {
      "minX": 135,
      "maxX": 1665,
      "minY": 95,
      "maxY": 1085
    },
    "cameraBase": {
      "width": 1280,
      "height": 720
    },
    "ySortAnchor": "feet"
  },
  "productionTarget": {
    "world": {
      "width": 3072,
      "height": 1536
    },
    "visualTilePx": 16,
    "navCellPx": 8,
    "terrainTiles": {
      "columns": 192,
      "rows": 96
    },
    "navCells": {
      "columns": 384,
      "rows": 192
    },
    "cameraBase": {
      "width": 1280,
      "height": 720
    }
  },
  "layers": [
    {
      "id": "terrain_base",
      "kind": "tile",
      "role": "solo base"
    },
    {
      "id": "terrain_overlay",
      "kind": "tile",
      "role": "caminhos, manchas, pedras e vegetacao baixa"
    },
    {
      "id": "objects_back",
      "kind": "objects",
      "role": "elementos sempre atras"
    },
    {
      "id": "world_ysort",
      "kind": "ysort",
      "role": "jogador, npcs, animais e props ordenados pela base"
    },
    {
      "id": "objects_front",
      "kind": "objects",
      "role": "copas, toldos e elementos sempre a frente"
    },
    {
      "id": "collision",
      "kind": "nav",
      "role": "bloqueios e tipos de terreno"
    },
    {
      "id": "interactions",
      "kind": "areas",
      "role": "missoes, coleta, portas e dialogos"
    },
    {
      "id": "effects",
      "kind": "effects",
      "role": "fogo, poeira, particulas e clima"
    },
    {
      "id": "audio",
      "kind": "audio",
      "role": "ambiente e pontos sonoros"
    },
    {
      "id": "transitions",
      "kind": "areas",
      "role": "saidas para outros mapas"
    }
  ],
  "districts": [
    {
      "id": "council",
      "label": "Conselho",
      "center": {
        "x": 430,
        "y": 360
      }
    },
    {
      "id": "family",
      "label": "Tendas familiares",
      "center": {
        "x": 1350,
        "y": 360
      }
    },
    {
      "id": "corral",
      "label": "Currais",
      "center": {
        "x": 430,
        "y": 820
      }
    },
    {
      "id": "workshop",
      "label": "Oficinas",
      "center": {
        "x": 1360,
        "y": 820
      }
    },
    {
      "id": "center",
      "label": "Praca central",
      "center": {
        "x": 900,
        "y": 590
      }
    }
  ],
  "exits": [
    {
      "id": "south",
      "direction": "s",
      "status": "planned",
      "x": 900,
      "y": 1100,
      "target": "camp_general"
    },
    {
      "id": "west",
      "direction": "w",
      "status": "planned",
      "x": 145,
      "y": 600,
      "target": "camp_general"
    },
    {
      "id": "east",
      "direction": "e",
      "status": "planned",
      "x": 1655,
      "y": 600,
      "target": "camp_general"
    }
  ],
  "spawnPoints": {
    "player": {
      "x": 900,
      "y": 980
    },
    "elder": {
      "x": 890,
      "y": 292
    },
    "eliabe": {
      "x": 1325,
      "y": 890
    },
    "child": {
      "x": 445,
      "y": 780
    },
    "miria": {
      "x": 1245,
      "y": 420
    },
    "hanan": {
      "x": 520,
      "y": 715
    },
    "guard": {
      "x": 820,
      "y": 1015
    }
  }
};

export async function loadMapManifest(url='./assets/maps/judah/map_manifest.json'){
  try{
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok) throw new Error('map manifest '+response.status);
    const parsed=await response.json();
    return parsed?.prototype?.world ? parsed : FALLBACK;
  }catch(error){
    console.warn('[map] usando manifesto interno de contingência',error);
    return FALLBACK;
  }
}

export function prototypeBounds(manifest){
  const p=manifest?.prototype||FALLBACK.prototype;
  return {
    ...p.playableBounds,
    step:p.navCellPx||8
  };
}

export function worldToNav(manifest,x,y){
  const p=manifest?.prototype||FALLBACK.prototype;
  const b=p.playableBounds;
  const cell=p.navCellPx||8;
  return {
    gx:Math.round((x-b.minX)/cell),
    gy:Math.round((y-b.minY)/cell)
  };
}

export function navToWorld(manifest,gx,gy){
  const p=manifest?.prototype||FALLBACK.prototype;
  const b=p.playableBounds;
  const cell=p.navCellPx||8;
  return {
    x:b.minX+gx*cell,
    y:b.minY+gy*cell
  };
}

export function clampWorldToPlayable(manifest,x,y){
  const b=(manifest?.prototype||FALLBACK.prototype).playableBounds;
  return {
    x:Math.max(b.minX,Math.min(b.maxX,x)),
    y:Math.max(b.minY,Math.min(b.maxY,y))
  };
}

export function ySortFromFeet(y,base=100){
  return String(base+Math.floor(y));
}
