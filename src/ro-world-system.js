export function clamp(value,min,max){
  return Math.max(min,Math.min(max,value));
}

export function degToRad(value){
  return Number(value||0)*Math.PI/180;
}

export function createHeightSampler(terrain){
  const features=terrain?.heightFeatures||[];
  return function heightAt(x,z){
    let y=0;
    for(const f of features){
      if(f.type!=='gaussian') continue;
      const rx=Math.max(.001,Number(f.rx)||1);
      const rz=Math.max(.001,Number(f.rz)||1);
      const dx=(x-Number(f.x||0))/rx;
      const dz=(z-Number(f.z||0))/rz;
      y+=Math.exp(-(dx*dx+dz*dz))*Number(f.height||0);
    }
    return y*Number(terrain?.heightScale||1);
  };
}

function pointSegmentDistance(px,pz,x1,z1,x2,z2){
  const vx=x2-x1,vz=z2-z1;
  const wx=px-x1,wz=pz-z1;
  const len2=vx*vx+vz*vz;
  if(!len2) return Math.hypot(wx,wz);
  const t=clamp((wx*vx+wz*vz)/len2,0,1);
  return Math.hypot(px-(x1+vx*t),pz-(z1+vz*t));
}

export function isPathAt(terrain,x,z){
  for(const p of terrain?.paths||[]){
    if(p.type==='strip'){
      if(p.axis==='z' && Math.abs(x-Number(p.center||0))<=Number(p.width||1)/2) return true;
      if(p.axis==='x' && Math.abs(z-Number(p.center||0))<=Number(p.width||1)/2) return true;
    }
    if(p.type==='segment'){
      if(pointSegmentDistance(x,z,p.x1,p.z1,p.x2,p.z2)<=Number(p.width||1)/2) return true;
    }
  }
  return false;
}

export function sunDirection(lighting){
  const lon=degToRad(lighting?.longitudeDeg??315);
  const lat=degToRad(lighting?.latitudeDeg??45);
  const x=Math.cos(lat)*Math.cos(lon);
  const y=Math.sin(lat);
  const z=Math.cos(lat)*Math.sin(lon);
  const len=Math.hypot(x,y,z)||1;
  return {x:x/len,y:y/len,z:z/len};
}

export function terrainNormal(heightAt,x,z,step=.15){
  const hL=heightAt(x-step,z),hR=heightAt(x+step,z);
  const hU=heightAt(x,z-step),hD=heightAt(x,z+step);
  const nx=hL-hR,ny=step*2,nz=hU-hD;
  const len=Math.hypot(nx,ny,nz)||1;
  return {x:nx/len,y:ny/len,z:nz/len};
}

export function lightFactor(normal,lighting,sun=sunDirection(lighting)){
  const dot=Math.max(0,normal.x*sun.x+normal.y*sun.y+normal.z*sun.z);
  return clamp(Number(lighting?.ambient??.5)+dot*Number(lighting?.diffuse??.5),0,1.35);
}

export function parseHex(hex){
  const raw=String(hex||'#000000').trim();
  const rgb=raw.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if(rgb) return {r:Number(rgb[1])||0,g:Number(rgb[2])||0,b:Number(rgb[3])||0};
  const clean=raw.replace('#','');
  const full=clean.length===3?clean.split('').map(c=>c+c).join(''):clean.padEnd(6,'0').slice(0,6);
  const n=parseInt(full,16)||0;
  return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}

export function rgbString({r,g,b}){
  return `rgb(${Math.round(clamp(r,0,255))},${Math.round(clamp(g,0,255))},${Math.round(clamp(b,0,255))})`;
}

export function shadeColor(hex,factor=1){
  const c=parseHex(hex);
  return rgbString({r:c.r*factor,g:c.g*factor,b:c.b*factor});
}

export function mixColor(a,b,t){
  const ca=parseHex(a),cb=parseHex(b);
  t=clamp(t,0,1);
  return rgbString({
    r:ca.r+(cb.r-ca.r)*t,
    g:ca.g+(cb.g-ca.g)*t,
    b:ca.b+(cb.b-ca.b)*t
  });
}

export function fogFactor(depth,fog){
  if(!fog?.enabled) return 0;
  const near=Number(fog.near||0),far=Math.max(near+.001,Number(fog.far||near+1));
  return clamp((depth-near)/(far-near),0,1);
}

export function cameraOctant(yawRad){
  return ((Math.round(yawRad/(Math.PI/4))%8)+8)%8;
}

export function visibleDirectionIndex(worldDirection,yawRad){
  return ((Number(worldDirection||0)-cameraOctant(yawRad))%8+8)%8;
}

export async function loadRoWorld(url='./assets/maps/judah/ro25d_world.json?v=0.32'){
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok) throw new Error(`Falha ao carregar mundo 2.5D (${response.status})`);
  return response.json();
}


export function pointLightContribution(position,lights=[]){
  let total=0;
  let r=0,g=0,b=0;
  for(const light of lights||[]){
    const dx=(position?.x||0)-Number(light.x||0);
    const dy=(position?.y||0)-Number(light.y||0);
    const dz=(position?.z||0)-Number(light.z||0);
    const range=Math.max(.001,Number(light.range||1));
    const dist=Math.hypot(dx,dy,dz);
    if(dist>=range) continue;
    const t=1-dist/range;
    const power=t*t*Number(light.intensity??1);
    const color=parseHex(light.color||'#ffffff');
    total+=power;
    r+=color.r*power; g+=color.g*power; b+=color.b*power;
  }
  if(total<=0) return {intensity:0,color:'#ffffff'};
  return {
    intensity:clamp(total,0,1.5),
    color:rgbString({r:r/total,g:g/total,b:b/total})
  };
}
