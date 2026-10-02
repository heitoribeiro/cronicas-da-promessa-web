export const DIR_INDEX = Object.freeze({s:0,sw:1,w:2,nw:3,n:4,ne:5,e:6,se:7});
export const DIR_ORDER = Object.freeze(['s','sw','w','nw','n','ne','e','se']);

const TOP_LEFT = new Set(['w','nw','n','ne']);
const GARMENT_ON_TOP = new Set(['w','nw','n','ne','e']);

export function normalizeDirection(direction='s'){
  return DIR_INDEX[direction] === undefined ? 's' : direction;
}

export function directionIndex(direction='s'){
  return DIR_INDEX[normalizeDirection(direction)];
}

export function isTopLeftDirection(direction='s'){
  return TOP_LEFT.has(normalizeDirection(direction));
}

/**
 * Resolve a layer's local draw priority.
 * This mirrors the *concept* of Ragnarok's per-direction layer ordering while
 * remaining an original implementation for Crônicas da Promessa.
 */
export function resolveCharacterLayerZ(layer, direction='s', options={}){
  const dir=normalizeDirection(direction);
  const topLeft=TOP_LEFT.has(dir);
  const type=layer?.type || layer?.id || 'generic';
  const slot=Number(layer?.slot || 0);
  const behind=Boolean(options.behind ?? layer?.behind);
  const headBeforeBody=Boolean(options.headBeforeBody);
  const topGarment=Boolean(options.topGarment ?? layer?.topGarment);

  if(type==='shadow') return -1;
  if(type==='effect') return 35 + slot;

  if(type==='accessory' && behind) return 1 + slot;

  if(type==='garment'){
    if(!GARMENT_ON_TOP.has(dir)) return 5;
    if(topGarment) return 25;
    return topLeft ? 16 : 11;
  }

  if(topLeft){
    if(type==='shield') return 10;
    if(type==='body') return 15;
    if(type==='outfit') return 17;
    if(type==='head') return headBeforeBody ? 14 : 20;
    if(type==='accessory') return 22 + slot;
    if(type==='weapon') return 28 + slot;
    return 0;
  }

  if(type==='body') return 10;
  if(type==='outfit') return 12;
  if(type==='head') return headBeforeBody ? 9 : 15;
  if(type==='accessory') return 17 + slot;
  if(type==='weapon') return 23 + slot;
  if(type==='shield') return 30;
  return 0;
}

export function sortCharacterLayers(layers,direction='s',optionsById={}){
  return [...(layers || [])]
    .map((layer,index)=>({
      layer,
      index,
      z:resolveCharacterLayerZ(layer,direction,optionsById[layer.id] || {})
    }))
    .sort((a,b)=>a.z-b.z || a.index-b.index)
    .map(entry=>entry.layer);
}

export function resolveAttachOffset(parentPoint,childPoint={x:0,y:0},extra={x:0,y:0}){
  return {
    x:(parentPoint?.x || 0) - (childPoint?.x || 0) + (extra?.x || 0),
    y:(parentPoint?.y || 0) - (childPoint?.y || 0) + (extra?.y || 0)
  };
}

export function composeViewPlan(view,direction='s'){
  const layers=(view?.layers || []).filter(layer=>layer.enabled !== false);
  const options={};
  for(const layer of layers){
    options[layer.id]={
      behind:Boolean(layer.behindByDirection?.[direction] ?? layer.behind),
      headBeforeBody:Boolean(layer.headBeforeBodyByDirection?.[direction] ?? layer.headBeforeBody),
      topGarment:Boolean(layer.topGarment)
    };
  }
  return sortCharacterLayers(layers,direction,options).map(layer=>({
    ...layer,
    direction:normalizeDirection(direction),
    z:resolveCharacterLayerZ(layer,direction,options[layer.id])
  }));
}
