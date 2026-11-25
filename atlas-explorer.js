import {createUniverse} from './universe.js?v=20261125-presentation';
import {groupsFor,sharedPeers,modelNotes} from './model-relations.js?v=20261125-audit';

const root=document.getElementById('atlas');
const models=JSON.parse(document.getElementById('atlas-model-data').textContent);
const byId=new Map(models.map(model=>[model.id,model]));
const choices=[...root.querySelectorAll('.atlas-model-choice')];
const panels=[...root.querySelectorAll('.atlas-model')];
const search=document.getElementById('model-search');
const category=document.getElementById('model-group-filter');
const picker=document.getElementById('atlas-picker-disclosure');
const narrow=matchMedia('(max-width:760px)');
let selected='caduceus',sphere=null;
const sourceBase='https://github.com/vLLM-HUST/scientist-lightweight-vllm/blob/45996ee994c00ad43975affb3b987acd20afebfd/';

function filter(){
 const query=search.value.trim().toLocaleLowerCase();let count=0;
 for(const choice of choices){
  choice.hidden=Boolean((category.value&&choice.dataset.group!==category.value)||!choice.dataset.search.toLocaleLowerCase().includes(query));
  if(!choice.hidden)count++;
 }
 document.getElementById('match-count').textContent=`${count} 条匹配记录 / 68 条原目录 + 2 项扩展`;
 document.getElementById('atlas-empty').hidden=count>0;
}
search.addEventListener('input',filter);
category.addEventListener('change',filter);

function sharedContent(id){
 const target=root.querySelector(`[data-shared-for="${id}"]`);
 if(target.dataset.ready)return;
 target.dataset.ready='true';
 const groups=groupsFor(id);
 if(!groups.length){
  const note=modelNotes[id];
  const text=document.createElement('p');text.textContent=note?.text||'此项尚待源码核对。';target.append(text);
  if(note){const link=document.createElement('a');link.textContent='查看核对源码';link.href=sourceBase+note.source;link.target='_blank';link.rel='noreferrer';target.append(link);}
  return;
 }
 for(const group of groups){
  const block=document.createElement('div');block.className='atlas-shared-group';
  const link=document.createElement('a');link.textContent=group.label+' · 实现源码';link.href=sourceBase+group.source;link.target='_blank';link.rel='noreferrer';block.append(link);
  const scope=document.createElement('p');scope.textContent=group.scope;block.append(scope);
  for(const peer of group.members.filter(peer=>peer!==id&&byId.has(peer))){
   const button=document.createElement('button');button.type='button';button.className='atlas-peer';button.textContent=byId.get(peer).name;
   button.addEventListener('click',()=>select(peer,{address:true,focus:true}));block.append(button);
  }
  const proof=document.createElement('details');proof.className='atlas-shared-evidence';
  const summary=document.createElement('summary');summary.textContent='源码依据';proof.append(summary);
  for(const item of group.evidence){const a=document.createElement('a');a.textContent=item.path+':'+item.line;a.href=sourceBase+item.path+'#L'+item.line;a.target='_blank';a.rel='noreferrer';proof.append(a);}
  block.append(proof);
  target.append(block);
 }
}

function select(id,{address=false,focus=false,clearFilter=false}={}){
 const model=byId.get(id);if(!model)return;
 selected=id;
 if(clearFilter){search.value='';category.value='';filter();}
 for(const panel of panels)panel.hidden=panel.dataset.modelId!==id;
 for(const choice of choices)choice.setAttribute('aria-pressed',String(choice.dataset.modelId===id));
 sharedContent(id);
 document.getElementById('atlas-picker-current').textContent=model.name;
 document.getElementById('sphere-selected-name').textContent=model.name;
 document.getElementById('sphere-selected-description').textContent=model.architecture;
 document.getElementById('sphere-open-model').href='#model-'+id;
 document.getElementById('atlas-announcer').textContent='已选择 '+model.name;
 sphere?.select(id);
 if(address)history.replaceState(null,'','#model-'+id);
 if(focus){
  if(narrow.matches){picker.open=false;document.getElementById('model-'+id).scrollIntoView({block:'start'});}
  const heading=document.getElementById('atlas-name-'+id);heading.tabIndex=-1;heading.focus({preventScroll:true});
 }
}
for(const choice of choices)choice.addEventListener('click',()=>select(choice.dataset.modelId,{address:true,focus:true}));

for(const panel of panels){
 const tabs=[...panel.querySelectorAll('[role="tab"]')];
 function read(tab,focus=false){
  tabs.forEach(item=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!active;});
  if(focus)tab.focus();
 }
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>read(tab));
  tab.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const i=event.key==='Home'?0:event.key==='End'?1:1-index;read(tabs[i],true);
  });
 });
}

const sphereSearch=document.getElementById('sphere-search');
const sphereResults=document.getElementById('sphere-results');
function chooseSearch(id){select(id,{clearFilter:true});sphereSearch.value=byId.get(id).name;sphereResults.hidden=true;}
sphereSearch.addEventListener('input',()=>{
 const q=sphereSearch.value.trim().toLowerCase();sphereResults.replaceChildren();sphereResults.hidden=!q;if(!q)return;
 const found=models.filter(model=>(model.name+' '+model.architecture).toLowerCase().includes(q)).slice(0,8);
 if(!found.length){const p=document.createElement('p');p.textContent='没有找到模型';sphereResults.append(p);}
 for(const model of found){const button=document.createElement('button');button.type='button';button.textContent=model.name;button.dataset.sphereModel=model.id;button.addEventListener('click',()=>chooseSearch(model.id));sphereResults.append(button);}
});
sphereSearch.addEventListener('keydown',event=>{
 if(event.key==='Escape'){sphereResults.hidden=true;return;}
 const first=sphereResults.querySelector('button');
 if(!first||sphereResults.hidden)return;
 if(event.key==='Enter'){event.preventDefault();chooseSearch(first.dataset.sphereModel);}
 if(event.key==='ArrowDown'){event.preventDefault();first.focus();}
});
document.addEventListener('click',event=>{if(!event.target.closest('.atlas-sphere-search,.atlas-sphere-results'))sphereResults.hidden=true;});

function ensureSphere(){
 if(sphere||root.hidden)return;
 sphere=createUniverse(models,document.getElementById('universe-stage'),sharedPeers,id=>select(id,{clearFilter:true}));sphere.select(selected);
}
function fromHash(){
 let hash;try{hash=decodeURIComponent(location.hash.slice(1));}catch{return;}
 if(hash.startsWith('model-')&&byId.has(hash.slice(6)))select(hash.slice(6),{clearFilter:true});
 ensureSphere();
}
window.addEventListener('atlas:model-route',event=>select(event.detail.id,{clearFilter:true}));
window.addEventListener('hashchange',fromHash);
picker.open=!narrow.matches;
narrow.addEventListener('change',()=>{picker.open=!narrow.matches;});
filter();select(selected);fromHash();
if(location.hash.startsWith('#model-')&&location.hash!=='#model-browser')requestAnimationFrame(()=>document.getElementById('model-'+selected).scrollIntoView({block:'start'}));
