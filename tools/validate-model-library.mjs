#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const libraryPath=resolve(process.cwd(),process.argv[2]||'assets/art/ro25d/model_library.json');
const worldPath=resolve(process.cwd(),process.argv[3]||'assets/maps/judah/ro25d_world.json');

const library=JSON.parse(await readFile(libraryPath,'utf8'));
const world=JSON.parse(await readFile(worldPath,'utf8'));
const errors=[];
const warnings=[];

const materials=library.materials||{};
const meshes=library.meshes||{};

for(const [matId,mat] of Object.entries(materials)){
  if(!mat.color) errors.push('material '+matId+' sem color');
  if(mat.texture){
    const texturePath=resolve(process.cwd(),mat.texture.replace(/^\.\//,''));
    try{await access(texturePath)}catch{errors.push('textura ausente: '+mat.texture)}
  }
}

for(const [meshId,mesh] of Object.entries(meshes)){
  if(!Array.isArray(mesh.vertices)||mesh.vertices.length<3){
    errors.push('mesh '+meshId+' sem vértices suficientes');
    continue;
  }
  if(!Array.isArray(mesh.faces)||!mesh.faces.length){
    errors.push('mesh '+meshId+' sem faces');
    continue;
  }
  mesh.vertices.forEach((v,i)=>{
    if(!Array.isArray(v)||v.length!==3||v.some(n=>!Number.isFinite(Number(n)))){
      errors.push('mesh '+meshId+' vértice '+i+' inválido');
    }
  });
  mesh.faces.forEach((face,i)=>{
    if(!Array.isArray(face.v)||face.v.length<3) errors.push('mesh '+meshId+' face '+i+' inválida');
    for(const idx of face.v||[]){
      if(!Number.isInteger(idx)||idx<0||idx>=mesh.vertices.length) errors.push('mesh '+meshId+' face '+i+' índice '+idx+' inválido');
    }
    if(face.m && !materials[face.m]){
      const usedAsSlot=(world.models||[]).some(m=>m.meshId===meshId && (m.materials?.[face.m]||m.materialOverrides?.[face.m]));
      if(!usedAsSlot) warnings.push('slot/material '+face.m+' de '+meshId+' depende de override');
    }
  });
}

for(const model of world.models||[]){
  if(model.renderMode==='mesh'){
    if(!model.meshId) errors.push('modelo '+model.id+' em mesh sem meshId');
    else if(!meshes[model.meshId]) errors.push('modelo '+model.id+' referencia mesh inexistente '+model.meshId);
    for(const [slot,matId] of Object.entries(model.materials||{})){
      if(!materials[matId]) errors.push('modelo '+model.id+' material '+slot+' -> '+matId+' inexistente');
    }
  }
}

console.log('Model library:',library.version||'?');
console.log('Meshes:',Object.keys(meshes).length);
console.log('Materials:',Object.keys(materials).length);
console.log('World mesh instances:',(world.models||[]).filter(m=>m.renderMode==='mesh').length);

if(warnings.length){
  console.log('Avisos:',warnings.length);
  for(const w of warnings.slice(0,40)) console.log('  ! '+w);
}
if(errors.length){
  console.error('Erros:',errors.length);
  for(const e of errors.slice(0,80)) console.error('  x '+e);
  process.exit(1);
}
console.log('OK — biblioteca de modelos consistente.');
