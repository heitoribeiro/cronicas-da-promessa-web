import { shadeColor, mixColor, fogFactor } from './ro-world-system.js?v=0.33';

export async function loadModelLibrary(url='./assets/art/ro25d/model_library.json?v=0.33'){
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok) throw new Error(`Falha ao carregar model library (${response.status})`);
  return response.json();
}

export function rotateY(x,z,rad){
  const c=Math.cos(rad),s=Math.sin(rad);
  return {x:x*c-z*s,z:x*s+z*c};
}

export function transformVertex(vertex,model,heightAt){
  const sx=Number(model.w||1),sy=Number(model.h||1),sz=Number(model.d||1);
  const scale=model.scale||{};
  const x=vertex[0]*sx*Number(scale.x??1);
  const y=vertex[1]*sy*Number(scale.y??1);
  const z=vertex[2]*sz*Number(scale.z??1);
  const r=rotateY(x,z,(Number(model.rotationY||0))*Math.PI/180);
  return {
    x:Number(model.x||0)+r.x,
    y:heightAt(Number(model.x||0),Number(model.z||0))+y,
    z:Number(model.z||0)+r.z
  };
}

export function faceNormal3D(vertices){
  if(!vertices||vertices.length<3) return {x:0,y:1,z:0};
  const a=vertices[0],b=vertices[1],c=vertices[2];
  const ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z;
  const vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  const len=Math.hypot(nx,ny,nz)||1;
  nx/=len;ny/=len;nz/=len;
  return {x:nx,y:ny,z:nz};
}

export function resolveMaterial(library,model,slot){
  const override=model.materials?.[slot]||model.materialOverrides?.[slot];
  const id=override||slot;
  return library?.materials?.[id]||library?.materials?.[slot]||{color:'#a08060'};
}

export function buildMeshFaces(library,model,heightAt,project,lightFactor,lighting,sun,fog,showLighting=true,showFog=true){
  const mesh=library?.meshes?.[model.meshId];
  if(!mesh) return [];
  const worldVertices=mesh.vertices.map(v=>transformVertex(v,model,heightAt));
  const projected=worldVertices.map(v=>project(v.x,v.y,v.z));
  return mesh.faces.map((face,index)=>{
    const verts3=face.v.map(i=>worldVertices[i]);
    const points=face.v.map(i=>projected[i]);
    const normal=faceNormal3D(verts3);
    const depth=points.reduce((s,p)=>s+p.depth,0)/Math.max(1,points.length);
    const material=resolveMaterial(library,model,face.m);
    const lf=showLighting?lightFactor(normal,lighting,sun):1;
    const ff=showFog?fogFactor(depth,fog):0;
    const color=shadeColor(material.color,lf);
    return {index,points,verts3,normal,depth,material,color,light:lf,fog:ff};
  });
}

export function modelShadowSize(model){
  return {w:Number(model.w||1),d:Number(model.d||1)};
}
