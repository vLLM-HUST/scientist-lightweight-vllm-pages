// Equal-area slots keep dense families from collapsing into latitude bands.
// Swapping slots brings code-sharing neighbours closer without changing spacing.
export function sphereLayout(models, edges) {
 const count=models.length,golden=Math.PI*(3-Math.sqrt(5));
 const slots=models.map((_,i)=>{const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y);return [Math.cos(i*golden)*r,y,Math.sin(i*golden)*r];});
 const indices=new Map(models.map((m,i)=>[m.id,i]));
 const weights=Array.from({length:count},()=>Array(count).fill(0));
 edges.forEach(e=>{const a=indices.get(e.a),b=indices.get(e.b);weights[a][b]=weights[b][a]=e.type==='shared'?3:.25;});
 const distance=slots.map(a=>slots.map(b=>a.reduce((sum,v,i)=>sum+(v-b[i])**2,0)));
 const order=models.map((_,i)=>i);
 for(let pass=0;pass<4;pass++)for(let a=0;a<count;a++)for(let b=a+1;b<count;b++){
  let delta=0;
  for(let k=0;k<count;k++)if(k!==a&&k!==b)delta+=(weights[a][k]-weights[b][k])*(distance[order[b]][order[k]]-distance[order[a]][order[k]]);
  if(delta<-.00001)[order[a],order[b]]=[order[b],order[a]];
 }
 return new Map(models.map((m,i)=>[m.id,slots[order[i]]]));
}

export function labelRails(points,width,height) {
 // Each connected label gets a slot; no collision-based hiding or truncation.
 const sorted=[...points].sort((a,b)=>a.x-b.x||a.id.localeCompare(b.id));
 const split=Math.ceil(sorted.length/2),out=[];
 for(const [side,list] of [['left',sorted.slice(0,split)],['right',sorted.slice(split)]]){
  list.sort((a,b)=>a.y-b.y||a.id.localeCompare(b.id));
  const gap=36,start=Math.max(90,(height-65-(list.length-1)*gap)/2);
  list.forEach((p,i)=>out.push({...p,labelX:side==='left'?8:width-8,labelY:start+i*gap,side}));
 }
 return out;
}
