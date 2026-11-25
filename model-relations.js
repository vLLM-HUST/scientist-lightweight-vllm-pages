// Source-audited relationships; built from shared-relations.json.
import {sharedGroups,modelNotes} from './model-relations-data.js?v=20261125-audit';
export {sharedGroups,modelNotes};
export const groupsFor = id => sharedGroups.filter(g=>g.members.includes(id));
export const sharedPeers = id => [...new Set(groupsFor(id).flatMap(g=>g.members))];
export function categoryFor(m){
 if(['prothyena','lorna'].includes(m.id))return '状态空间、长卷积与混合架构';
 if(['amplify','rinalmo'].includes(m.id))return '序列编码与任务头';
 if(m.id==='prollama')return '因果序列生成与评分';
 return m.group;
}
export function buildRelations(models){
 const edges=[];
 for(let i=0;i<models.length;i++)for(let j=i+1;j<models.length;j++){
  const a=models[i],b=models[j],shared=sharedGroups.filter(g=>g.members.includes(a.id)&&g.members.includes(b.id));
  const same=categoryFor(a)===categoryFor(b);
  if(same||shared.length)edges.push({a:a.id,b:b.id,type:shared.length?'shared':'category',sameCategory:same,groups:shared.map(g=>g.id)});
 }
 return edges;
}
