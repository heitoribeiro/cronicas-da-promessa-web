const SQRT2 = Math.SQRT2;
const DIRS = [
  [1,0],[-1,0],[0,1],[0,-1],
  [1,1],[1,-1],[-1,1],[-1,-1]
];

class MinHeap {
  constructor(){ this.items=[]; }
  get size(){ return this.items.length; }
  push(node){
    const a=this.items;
    a.push(node);
    let i=a.length-1;
    while(i>0){
      const p=(i-1)>>1;
      if(a[p].f<=node.f) break;
      a[i]=a[p];
      i=p;
    }
    a[i]=node;
  }
  pop(){
    const a=this.items;
    if(!a.length) return null;
    const root=a[0];
    const last=a.pop();
    if(a.length && last){
      let i=0;
      while(true){
        const l=i*2+1,r=l+1;
        if(l>=a.length) break;
        let child=l;
        if(r<a.length && a[r].f<a[l].f) child=r;
        if(a[child].f>=last.f) break;
        a[i]=a[child];
        i=child;
      }
      a[i]=last;
    }
    return root;
  }
}

function octile(ax,ay,bx,by){
  const dx=Math.abs(ax-bx);
  const dy=Math.abs(ay-by);
  return Math.max(dx,dy)+(SQRT2-1)*Math.min(dx,dy);
}

function key(x,y,width){ return y*width+x; }

function reconstruct(came,goalKey,width){
  const path=[];
  let k=goalKey;
  while(k!==undefined){
    path.push({gx:k%width,gy:Math.floor(k/width)});
    k=came.get(k);
  }
  path.reverse();
  path.shift();
  return path;
}

// Reorganiza degraus equivalentes para priorizar diagonais contínuas.
// Isso reduz o "serrilhado" visual e evita trocar a direção do sprite a cada célula.
function groupDiagonals(grid,start,path){
  if(path.length<2) return path;
  const cells=[start,...path];
  const isDiag=(a,b)=>a.gx!==b.gx&&a.gy!==b.gy;
  let changed=true;
  let passes=0;
  while(changed && passes++<8){
    changed=false;
    for(let i=0;i+2<cells.length;i++){
      const a=cells[i],b=cells[i+1],c=cells[i+2];
      if(isDiag(a,b)||!isDiag(b,c)) continue;
      const bx=a.gx+(c.gx-b.gx);
      const by=a.gy+(c.gy-b.gy);
      if(!grid.isWalkable(bx,by)) continue;
      if(!grid.isWalkable(bx,a.gy)||!grid.isWalkable(a.gx,by)) continue;
      cells[i+1]={gx:bx,gy:by};
      changed=true;
    }
  }
  cells.shift();
  return cells;
}

/**
 * A* em oito direções para a grade de navegação do jogo.
 * - start é exclusivo;
 * - goal é inclusivo;
 * - diagonais não atravessam quinas bloqueadas;
 * - maxNodes impede travamento em áreas inalcançáveis.
 */
export function findGridPath(grid,start,goal,maxNodes=32000){
  if(!grid?.isWalkable || grid.width<=0 || grid.height<=0) return [];
  if(!grid.isWalkable(goal.gx,goal.gy)) return [];
  if(start.gx===goal.gx&&start.gy===goal.gy) return [];

  const open=new MinHeap();
  const came=new Map();
  const gScore=new Map();
  const closed=new Set();
  const startKey=key(start.gx,start.gy,grid.width);
  gScore.set(startKey,0);
  open.push({x:start.gx,y:start.gy,g:0,f:octile(start.gx,start.gy,goal.gx,goal.gy)});

  let visited=0;
  while(open.size && visited++<maxNodes){
    const cur=open.pop();
    if(!cur) break;
    const ck=key(cur.x,cur.y,grid.width);
    if(closed.has(ck)) continue;
    closed.add(ck);

    if(cur.x===goal.gx&&cur.y===goal.gy){
      return groupDiagonals(grid,start,reconstruct(came,ck,grid.width));
    }

    for(const [dx,dy] of DIRS){
      const nx=cur.x+dx,ny=cur.y+dy;
      if(nx<0||ny<0||nx>=grid.width||ny>=grid.height) continue;
      if(!grid.isWalkable(nx,ny)) continue;
      if(dx&&dy){
        if(!grid.isWalkable(cur.x+dx,cur.y)||!grid.isWalkable(cur.x,cur.y+dy)) continue;
      }
      const nk=key(nx,ny,grid.width);
      if(closed.has(nk)) continue;
      const ng=cur.g+(dx&&dy?SQRT2:1);
      if(ng>=(gScore.get(nk)??Infinity)) continue;
      came.set(nk,ck);
      gScore.set(nk,ng);
      open.push({
        x:nx,y:ny,g:ng,
        f:ng+octile(nx,ny,goal.gx,goal.gy)
      });
    }
  }
  return [];
}
