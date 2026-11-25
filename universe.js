import {buildRelations,sharedPeers,groupsFor} from './model-relations.js?v=20261125-audit';
import {sphereLayout,labelRails} from './sphere-layout.js?v=20261125-presentation';
import * as THREE from './vendor/three.module.js';
export function createUniverse(models,stage,peers,onSelect){
 const canvas=stage.querySelector('canvas'),labels=stage.querySelector('.sphere-labels');let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});}catch{const el=document.createElement('p');el.className='no-webgl';el.textContent='当前设备未启用 WebGL。使用上方搜索或下方目录，同样可以探索模型与共享关系。';stage.append(el);return {select(){},dispose(){}};}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xffffff,0);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(0,.05,8.3);const group=new THREE.Group();scene.add(group);
 scene.add(new THREE.AmbientLight(0xffffff,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,4,6);scene.add(light);
 const sphereGeo=new THREE.SphereGeometry(2.1,32,20);const grid=new THREE.Mesh(sphereGeo,new THREE.MeshBasicMaterial({color:0x93b3a9,wireframe:true,transparent:true,opacity:.025}));group.add(grid);
 const core=new THREE.Mesh(new THREE.SphereGeometry(2.07,40,24),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.73,depthWrite:false}));group.add(core);
 const nodes=[],pick=[],geometry=new THREE.SphereGeometry(.046,12,10);
 const relationData=buildRelations(models),positions=sphereLayout(models,relationData);
 const guides=document.createElementNS('http://www.w3.org/2000/svg','svg');guides.classList.add('sphere-guides');stage.insertBefore(guides,labels);
 models.forEach((m,i)=>{const point=new THREE.Vector3(...positions.get(m.id)).multiplyScalar(2.13);const material=new THREE.MeshStandardMaterial({color:m.pending?0xb9c3c0:0x526f69,roughness:.45,metalness:.12,transparent:true});const mesh=new THREE.Mesh(geometry,material);mesh.position.copy(point);mesh.userData.id=m.id;group.add(mesh);pick.push(mesh);const label=document.createElement('button');label.type='button';label.className='sphere-label';label.textContent=m.name;label.setAttribute('aria-label','选择模型 '+m.name);label.onclick=()=>onSelect(m.id);labels.append(label);const guide=document.createElementNS('http://www.w3.org/2000/svg','line');guides.append(guide);nodes.push({m,mesh,label,guide,index:i});});
 const relations=new THREE.Group();group.add(relations);const hub=new THREE.Mesh(new THREE.SphereGeometry(.078,16,12),new THREE.MeshStandardMaterial({color:0x146b61,roughness:.4}));hub.position.set(.2,.1,0);relations.add(hub);
 hub.userData.id='shared-component';pick.push(hub);
 const tooltip=document.createElement('div');tooltip.className='sphere-tooltip';tooltip.hidden=true;stage.append(tooltip);
 const hubLabel=document.createElement('span');hubLabel.className='sphere-label shared';labels.append(hubLabel);let selected='caduceus',related=[],connected=[],showRelations=false,rotating=false,disposed=false,visible=true,target=null,hover=null,frame=0,last=0;
 const motion=stage.querySelector('#sphere-motion'),relationButton=stage.querySelector('#sphere-relations');motion.textContent=rotating?'暂停旋转':'开始旋转';
 const edges=relationData.map(edge=>{
  const a=nodes.find(n=>n.m.id===edge.a).mesh.position,b=nodes.find(n=>n.m.id===edge.b).mesh.position;
  const geometry=new THREE.BufferGeometry().setFromPoints([a,b]);
  const material=new THREE.LineBasicMaterial({color:edge.type==='shared'?0xe6ad00:0x8faaa2,transparent:true,opacity:edge.type==='shared'?.45:.10,depthWrite:false,depthTest:edge.type!=='shared'});
  const line=new THREE.Line(geometry,material);line.renderOrder=2;relations.add(line);return {...edge,line};
 });
 stage.dataset.relationCount=edges.length;stage.dataset.sharedRelationCount=edges.filter(e=>e.type==='shared').length;
 function lines(){
  related=sharedPeers(selected);const same=edges.filter(e=>e.a===selected||e.b===selected).map(e=>e.a===selected?e.b:e.a);connected=same;stage.style.height=Math.max(420,Math.ceil(connected.length/2)*36+130)+'px';stage.dataset.connectedCount=connected.length;
  hub.visible=false;hubLabel.hidden=true;relations.visible=true;
  hubLabel.textContent=groupsFor(selected).map(g=>g.label).join(' / ');
  edges.forEach(e=>{const active=e.a===selected||e.b===selected;e.line.visible=showRelations||active;e.line.material.opacity=e.type==='shared'?(active?1:.45):(active?.38:.09);e.line.material.color.set(e.type==='shared'?0xe6ad00:0x8faaa2);});
  nodes.forEach(n=>{const active=n.m.id===selected,shared=related.includes(n.m.id),sameCategory=same.includes(n.m.id);n.mesh.material.color.set(active?0xb3762c:shared?0x167664:sameCategory?0x78958b:n.m.pending?0xb7c2bf:0x526568);n.mesh.scale.setScalar(active?2.1:shared?1.55:sameCategory?1.25:1);n.mesh.renderOrder=active||sameCategory?4:0;n.mesh.material.depthTest=!(active||sameCategory);n.label.className='sphere-label'+(active?' active':shared?' shared connected':sameCategory?' connected':'');});
 }

 function select(id){selected=id;lines();const n=nodes.find(n=>n.m.id===id);if(n){target=new THREE.Quaternion().setFromUnitVectors(n.mesh.position.clone().normalize(),new THREE.Vector3(.35,0,1).normalize());if(matchMedia('(prefers-reduced-motion: reduce)').matches){group.quaternion.copy(target);target=null;}}}

 const hint=stage.querySelector('#sphere-gesture'),restHint='按住旋转 · 拖动改变方向 · 轻点选择';
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let gesture=null,vx=0,vy=0;
 const turn=new THREE.Quaternion(),axis=new THREE.Vector3();
 function rotate(dx,dy){const angle=Math.hypot(dx,dy);if(!angle)return;axis.set(dy,dx,0).normalize();turn.setFromAxisAngle(axis,angle);group.quaternion.premultiply(turn).normalize();}
 function stopMotion(){rotating=false;target=null;vx=vy=0;motion.textContent='开始旋转';}
 function rest(){canvas.style.cursor='grab';if(hint)hint.textContent=restHint;}
 function cancel(){const active=gesture;gesture=null;vx=vy=0;if(active&&canvas.hasPointerCapture(active.id))canvas.releasePointerCapture(active.id);rest();}
 motion.onclick=()=>{cancel();rotating=!rotating;target=null;motion.textContent=rotating?'暂停旋转':'开始旋转';};
 relationButton.onclick=()=>{showRelations=!showRelations;relationButton.setAttribute('aria-pressed',String(showRelations));relationButton.textContent=showRelations?'仅看当前关联':'显示全量连线';lines();};
 stage.querySelector('#sphere-reset').onclick=()=>{cancel();stopMotion();target=new THREE.Quaternion();};
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function hit(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);group.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pick.filter(o=>o.visible))[0]?.object;}
 const down=e=>{if(e.button!==0||gesture||e.isPrimary===false)return;e.preventDefault();stopMotion();hover=null;tooltip.hidden=true;canvas.focus({preventScroll:true});gesture={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,start:performance.now(),time:performance.now(),dragged:false,held:false};canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';};
 const move=e=>{if(gesture){if(e.pointerId!==gesture.id)return;const now=performance.now(),dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!gesture.dragged&&Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>5){gesture.dragged=true;if(hint)hint.textContent='正在拖动 · 松开后缓缓停下';}if(gesture.dragged){const scale=Math.PI/Math.max(stage.clientHeight,240),dt=Math.max((now-gesture.time)/1000,.008);rotate(dx*scale,dy*scale);vx=THREE.MathUtils.clamp(dx*scale/dt,-2.5,2.5);vy=THREE.MathUtils.clamp(dy*scale/dt,-2.5,2.5);}gesture.x=e.clientX;gesture.y=e.clientY;gesture.time=now;return;}hover=hit(e)?.userData.id||null;canvas.style.cursor=hover?'pointer':'grab';const m=models.find(m=>m.id===hover);tooltip.hidden=!hover;tooltip.textContent=m?m.name+' · '+m.architecture:'共享组件 · 点击查看结构与源码';};
 const up=e=>{if(!gesture||e.pointerId!==gesture.id)return;const active=gesture,now=performance.now(),tap=!active.dragged&&!active.held&&now-active.start<260;gesture=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(reducedMotion.matches||(active.dragged&&now-active.time>90))vx=vy=0;rest();if(tap){const h=hit(e);if(h===hub){location.hash='#model/'+selected;return;}if(h)onSelect(h.userData.id);}};
 const leave=()=>{if(gesture)return;hover=null;tooltip.hidden=true;};
 const lost=()=>{if(gesture)cancel();};
 const key=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(e.key)){e.preventDefault();cancel();stopMotion();if(e.key==='ArrowLeft')rotate(-.15,0);if(e.key==='ArrowRight')rotate(.15,0);if(e.key==='ArrowUp')rotate(0,-.15);if(e.key==='ArrowDown')rotate(0,.15);}};
 const hidden=()=>{if(document.hidden)cancel();};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',lost);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('keydown',key);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',hidden);rest();
 function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}const ro=new ResizeObserver(resize);ro.observe(stage);resize();const observer=new IntersectionObserver(entries=>visible=entries[0].isIntersecting);observer.observe(stage);
 const projected=new THREE.Vector3();function draw(t){if(disposed)return;frame=requestAnimationFrame(draw);if(!visible||document.hidden)return;const dt=Math.min((t-last)/1000,.05);last=t;if(gesture){if(!gesture.dragged&&t-gesture.start>=260){if(!gesture.held){gesture.held=true;if(hint)hint.textContent='持续旋转中 · 拖动可改变方向';}vx=.55;vy=0;rotate(vx*dt,0);}}else if(target){vx=vy=0;group.quaternion.slerp(target,1-Math.exp(-5*dt));if(group.quaternion.angleTo(target)<.001)target=null;}else if(Math.hypot(vx,vy)>.008){rotate(vx*dt,vy*dt);const friction=Math.exp(-4.8*dt);vx*=friction;vy*=friction;}else if(rotating)rotate(dt*.08,0);group.updateMatrixWorld();const w=stage.clientWidth,hgt=stage.clientHeight;
 const points=nodes.map(n=>{const p=n.mesh.getWorldPosition(projected).clone(),front=p.z>-.1;p.project(camera);return {id:n.m.id,n,front,x:(p.x+1)/2*w,y:(1-p.y)/2*hgt};});
 const rails=new Map(labelRails(points.filter(p=>connected.includes(p.id)),w,hgt).map(p=>[p.id,p]));
 for(const p of points){const n=p.n,active=p.id===selected,rail=rails.get(p.id),important=active||Boolean(rail);
  const show=important||p.id===hover||(showRelations&&p.front&&n.index%5===0);
  n.label.hidden=!show;n.guide.style.display=important?'':'none';
  let x=p.x,y=p.y-16;
  n.label.style.maxWidth=Math.min(158,(w-30)/2)+'px';n.label.style.textAlign='center';n.label.style.transform='translate(-50%,-50%)';
  if(active){x=w/2;y=48;}else if(rail){x=rail.labelX;y=rail.labelY;n.label.style.transform=rail.side==='left'?'translate(0,-50%)':'translate(-100%,-50%)';n.label.style.textAlign=rail.side;}
  else{x=Math.max(55,Math.min(w-55,x));y=Math.max(70,Math.min(hgt-85,y));}
  n.label.style.left=x+'px';n.label.style.top=y+'px';
  if(important){n.guide.setAttribute('x1',p.x);n.guide.setAttribute('y1',p.y);n.guide.setAttribute('x2',x);n.guide.setAttribute('y2',y);n.guide.setAttribute('stroke',active?'#a7712e':related.includes(p.id)?'#d6a51b':'#9aada7');}
  n.mesh.material.opacity=important?1:hover&&p.id!==hover?.35:.75;
 }
 const h=hub.getWorldPosition(new THREE.Vector3()).project(camera);hubLabel.hidden=true;hubLabel.style.left=(h.x+1)/2*stage.clientWidth+'px';hubLabel.style.top=(1-h.y)/2*stage.clientHeight+18+'px';renderer.render(scene,camera);}
 select(selected);frame=requestAnimationFrame(draw);return {select,dispose(){disposed=true;cancelAnimationFrame(frame);ro.disconnect();observer.disconnect();cancel();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',lost);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('keydown',key);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',hidden);scene.traverse(x=>{x.geometry?.dispose();if(x.material)x.material.dispose();});guides.remove();renderer.dispose();}};
}
