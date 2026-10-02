#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const manifestArg=process.argv[2];
if(!manifestArg){
  console.error('Uso: node tools/validate-sprite-pack.mjs <manifest.sprite.json>');
  process.exit(2);
}

const manifestPath=resolve(process.cwd(),manifestArg);
const root=dirname(manifestPath);

function pngInfo(buffer){
  if(buffer.length<33 || buffer.toString('ascii',1,4)!=='PNG'){
    throw new Error('arquivo não é PNG válido');
  }
  const width=buffer.readUInt32BE(16);
  const height=buffer.readUInt32BE(20);
  const colorType=buffer[25];
  let hasTRNS=false;
  let o=8;
  while(o+12<=buffer.length){
    const len=buffer.readUInt32BE(o);
    const type=buffer.toString('ascii',o+4,o+8);
    if(type==='tRNS') hasTRNS=true;
    o+=12+len;
    if(type==='IEND') break;
  }
  const alpha=colorType===4 || colorType===6 || hasTRNS;
  return {width,height,colorType,alpha};
}

const data=JSON.parse(await readFile(manifestPath,'utf8'));
const directions=data.directions || [];
const actions=data.actions || {};
const canvas=data.exportCanvas;
const pattern=data.naming?.pattern || '{action}/{direction}/{frame}.png';
const pad=data.naming?.framePad ?? 2;
const errors=[];
const warnings=[];
let files=0;

if(!canvas?.width || !canvas?.height) errors.push('exportCanvas inválido');
if(!directions.length) errors.push('directions vazio');

for(const [action,cfg] of Object.entries(actions)){
  const count=Number(cfg.frames)||0;
  if(count<1){errors.push(`${action}: quantidade de frames inválida`);continue;}
  for(const direction of directions){
    for(let frame=0;frame<count;frame++){
      const rel=pattern
        .replace('{action}',action)
        .replace('{direction}',direction)
        .replace('{frame}',String(frame).padStart(pad,'0'));
      const path=resolve(root,rel);
      try{
        await access(path);
        const buf=await readFile(path);
        const info=pngInfo(buf);
        files++;
        if(canvas && (info.width!==canvas.width || info.height!==canvas.height)){
          errors.push(`${rel}: ${info.width}x${info.height}; esperado ${canvas.width}x${canvas.height}`);
        }
        if(!info.alpha) warnings.push(`${rel}: PNG sem canal/transparência detectável`);
      }catch(error){
        errors.push(`${rel}: ausente ou inválido (${error.message})`);
      }
    }
  }
}

console.log(`Sprite pack: ${data.displayName || data.id || manifestArg}`);
console.log(`Arquivos validados: ${files}`);
if(warnings.length){
  console.log(`Avisos: ${warnings.length}`);
  for(const w of warnings.slice(0,30)) console.log('  ! '+w);
}
if(errors.length){
  console.error(`Erros: ${errors.length}`);
  for(const e of errors.slice(0,60)) console.error('  x '+e);
  if(errors.length>60) console.error(`  ... +${errors.length-60} erros`);
  process.exit(1);
}
console.log('OK — pacote compatível com o manifesto.');
