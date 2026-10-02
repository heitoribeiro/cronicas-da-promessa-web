#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const file=process.argv[2] || 'assets/maps/judah/ro25d_world.json';
const path=resolve(process.cwd(),file);
const data=JSON.parse(await readFile(path,'utf8'));
const errors=[];
const warnings=[];

const finite=(v)=>Number.isFinite(Number(v));
const requireFinite=(label,v)=>{if(!finite(v)) errors.push(label+' deve ser numérico')};

if(!data.id) errors.push('id ausente');
if(!data.terrain) errors.push('terrain ausente');
if(!Array.isArray(data.models)) errors.push('models deve ser array');
if(!Array.isArray(data.actors)) errors.push('actors deve ser array');

if(data.terrain){
  requireFinite('terrain.cols',data.terrain.cols);
  requireFinite('terrain.rows',data.terrain.rows);
  if(Number(data.terrain.cols)<4||Number(data.terrain.rows)<4) errors.push('terrain muito pequeno');
}

const ids=new Set();
for(const model of data.models||[]){
  if(!model.id) errors.push('modelo sem id');
  if(ids.has(model.id)) errors.push('id duplicado: '+model.id);
  ids.add(model.id);
  for(const k of ['x','z','w','d','h']) requireFinite('modelo '+(model.id||'?')+'.'+k,model[k]);
  if(!model.type) errors.push('modelo '+(model.id||'?')+' sem type');
}

for(const actor of data.actors||[]){
  if(!actor.id) errors.push('actor sem id');
  requireFinite('actor '+(actor.id||'?')+'.x',actor.x);
  requireFinite('actor '+(actor.id||'?')+'.z',actor.z);
  requireFinite('actor '+(actor.id||'?')+'.dir',actor.dir);
  if(Number(actor.dir)<0||Number(actor.dir)>7) errors.push('actor '+actor.id+' dir deve ser 0..7');
}

if(data.playerSpawn){
  requireFinite('playerSpawn.x',data.playerSpawn.x);
  requireFinite('playerSpawn.z',data.playerSpawn.z);
  requireFinite('playerSpawn.dir',data.playerSpawn.dir);
}else errors.push('playerSpawn ausente');

if(data.camera){
  requireFinite('camera.pitchDeg',data.camera.pitchDeg);
  requireFinite('camera.zoom',data.camera.zoom);
}else errors.push('camera ausente');

if(data.lighting){
  requireFinite('lighting.longitudeDeg',data.lighting.longitudeDeg);
  requireFinite('lighting.latitudeDeg',data.lighting.latitudeDeg);
  requireFinite('lighting.ambient',data.lighting.ambient);
  requireFinite('lighting.diffuse',data.lighting.diffuse);
}else warnings.push('lighting ausente');

console.log('World:',data.name||data.id);
console.log('Terrain:',data.terrain?.cols+'x'+data.terrain?.rows);
console.log('Models:',data.models?.length||0);
console.log('Actors:',data.actors?.length||0);

if(warnings.length){
  console.log('Avisos:',warnings.length);
  for(const w of warnings) console.log('  ! '+w);
}
if(errors.length){
  console.error('Erros:',errors.length);
  for(const e of errors) console.error('  x '+e);
  process.exit(1);
}
console.log('OK — manifesto 2.5D consistente.');
