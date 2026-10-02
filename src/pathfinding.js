const SQRT2 = Math.SQRT2;
const DIRS = [
  [1,0],[-1,0],[0,1],[0,-1],
  [1,1],[1,-1],[-1,1],[-1,-1]
];

class MinHeap {
  constructor(){ this.items=[]; }
  get size(){ return this.items.length; }
  clear(){ this.items.length=0; }
  push(node){
    const a=this.items;
    let i=a.length;
    a.push(node);
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
    const n=a.length;
    if(!n) return null;
    const root=a[0];
    const last=a.pop();
    if(n>1 && last){
      let i=0;
      while(true){
        const l=i*2+1;
        if(l>=a.length) break;
        const r=l+1;
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
  while(k>=0){
    path.push({gx:k%width,gy:(k/width)|0});
    k=came[k];
  }
  path.reverse();
  path.shift();
  return path;
}

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
 * A* 8-way otimizado para browser.
 * Usa TypedArrays em vez de Map/Set para reduzir GC e pausas em mapas grandes.
 */
export function findGridPath(grid,start,goal,maxNodes=32000){
  const width=grid?.width|0;
  const height=grid?.height|0;
  if(!grid?.isWalkable || width<=0 || height<=0) return [];
  if(goal.gx<0||goal.gy<0||goal.gx>=width||goal.gy>=height) return [];
  if(!grid.isWalkable(goal.gx,goal.gy)) return [];
  if(start.gx===goal.gx&&start.gy===goal.gy) return [];

  const total=width*height;
  const came=new Int32Array(total);
  came.fill(-1);
  const gScore=new Float64Array(total);
  gScore.fill(Infinity);
  const closed=new Uint8Array(total);

  const open=new MinHeap();
  const startKey=key(start.gx,start.gy,width);
  gScore[startKey]=0;
  open.push({x:start.gx,y:start.gy,g:0,f:octile(start.gx,start.gy,goal.gx,goal.gy)});

  let visited=0;
  while(open.size && visited++<maxNodes){
    const cur=open.pop();
    if(!cur) break;
    const ck=key(cur.x,cur.y,width);
    if(closed[ck]) continue;
    closed[ck]=1;

    if(cur.x===goal.gx&&cur.y===goal.gy){
      return groupDiagonals(grid,start,reconstruct(came,ck,width));
    }

    for(let i=0;i<DIRS.length;i++){
      const dx=DIRS[i][0],dy=DIRS[i][1];
      const nx=cur.x+dx,ny=cur.y+dy;
      if(nx<0||ny<0||nx>=width||ny>=height) continue;
      if(!grid.isWalkable(nx,ny)) continue;
      if(dx&&dy){
        if(!grid.isWalkable(cur.x+dx,cur.y)||!grid.isWalkable(cur.x,cur.y+dy)) continue;
      }
      const nk=key(nx,ny,width);
      if(closed[nk]) continue;
      const ng=cur.g+(dx&&dy?SQRT2:1);
      if(ng>=gScore[nk]) continue;
      came[nk]=ck;
      gScore[nk]=ng;
      open.push({
        x:nx,y:ny,g:ng,
        f:ng+octile(nx,ny,goal.gx,goal.gy)
      });
    }
  }
  return [];
}
