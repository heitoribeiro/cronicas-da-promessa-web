import { directionFromVector } from './sprite-system.js?v=0.30';
import { resolveCharacterLayerZ } from './character-layers.js?v=0.30';

const DIRS=['s','sw','w','nw','n','ne','e','se'];

function makeLayerNode(layer){
  const viewport=document.createElement('span');
  viewport.className='player-layer-viewport';
  viewport.dataset.layer=layer.id;

  const img=document.createElement('img');
  img.className='player-layer-sheet';
  img.alt='';
  img.draggable=false;

  viewport.appendChild(img);
  return {viewport,img};
}

export class LayeredPlayerController {
  constructor(root,profile,playerMeta){
    this.root=root;
    this.profile=profile;
    this.meta=playerMeta;
    this.direction='s';
    this.action='idle';
    this.frame=0;
    this.frameStartedAt=0;
    this.layers=new Map();
    this.build();
  }

  build(){
    if(!this.root || !this.meta) return;
    this.root.innerHTML='';
    this.root.classList.add('layered-player');
    this.root.dataset.spriteMode='layered-atlas';
    const canvas=this.meta.canvas || {width:96,height:112};
    const pivot=this.meta.pivot || {x:48,y:108};
    this.root.style.setProperty('--player-frame-w',canvas.width+'px');
    this.root.style.setProperty('--player-frame-h',canvas.height+'px');
    this.root.style.setProperty('--player-pivot-y',pivot.y+'px');
    this.root.style.setProperty('--player-pivot-neg-y',(-pivot.y)+'px');

    for(const layer of this.meta.layers || []){
      const node=makeLayerNode(layer);
      this.root.appendChild(node.viewport);
      this.layers.set(layer.id,{...node,layer,lastSrc:''});
    }
    this.render();
  }

  getActionConfig(action=this.action){
    return this.meta.actions?.[action] || null;
  }

  setAction(action,now=performance.now()){
    if(!this.meta.actions?.[action]) return;
    if(action!==this.action){
      this.action=action;
      this.frame=0;
      this.frameStartedAt=now;
    }
  }

  setDirection(direction){
    if(DIRS.includes(direction)) this.direction=direction;
  }

  setMotion(dx,dy,now=performance.now()){
    const moving=Boolean(dx||dy);
    if(moving) this.setDirection(directionFromVector(dx,dy,true));
    this.setAction(moving?'walk':'idle',now);
    this.tick(now);
  }

  tick(now=performance.now()){
    const cfg=this.getActionConfig();
    if(!cfg) return;
    const frameMs=Math.max(40,Number(cfg.frameMs)||120);
    const frames=Math.max(1,Number(cfg.frames)||1);
    if(!this.frameStartedAt) this.frameStartedAt=now;
    if(now-this.frameStartedAt>=frameMs){
      const steps=Math.floor((now-this.frameStartedAt)/frameMs);
      this.frame=(this.frame+steps)%frames;
      this.frameStartedAt+=steps*frameMs;
    }
    this.render();
  }

  render(){
    const cfg=this.getActionConfig();
    if(!cfg) return;
    const canvas=this.meta.canvas;
    const frameW=canvas.width;
    const frameH=canvas.height;
    const row=Math.max(0,(this.meta.directionOrder || DIRS).indexOf(this.direction));
    const sheetW=frameW*cfg.frames;
    const sheetH=frameH*(this.meta.directionOrder || DIRS).length;

    this.root.dataset.direction=this.direction;
    this.root.dataset.action=this.action;

    for(const entry of this.layers.values()){
      const src=entry.layer.actions?.[this.action];
      if(!src) continue;
      const url=src.includes('?') ? src : src+'?v=0.30';
      if(entry.lastSrc!==url){
        entry.lastSrc=url;
        entry.img.src=url;
      }
      entry.viewport.style.zIndex=String(resolveCharacterLayerZ(entry.layer,this.direction,{
        topGarment:entry.layer.id==='garment' && this.direction==='n'
      }));
      entry.img.style.width=sheetW+'px';
      entry.img.style.height=sheetH+'px';
      entry.img.style.transform=`translate(${-this.frame*frameW}px,${-row*frameH}px)`;
    }
  }
}

export function createLayeredPlayerController(root,sex,manifest){
  const meta=manifest?.players?.[sex];
  if(!root || !meta || meta.mode!=='layered_atlas') return null;
  return new LayeredPlayerController(root,{sex},meta);
}
