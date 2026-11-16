'use strict';
// Image coordinates stay independent of the camera and of completion state.
const atlas = {key:'',floor:'',zoom:1,x:0,y:0,width:1920,height:1400,base:1,markers:[],selected:null,pointers:new Map()};
function areaName(id){return regions.find(r=>r.id===id)?.name||'Hyrule';}
function pointFor(id){return ATLAS_LOCATIONS.locations[id];}
function atlasViewport(){return document.querySelector('.map-frame');}
function atlasFit(){atlas.zoom=1;atlas.x=0;atlas.y=0;atlasDraw();}
function atlasDraw(){
 const frame=atlasViewport(),w=frame.clientWidth,h=frame.clientHeight;if(!w||!h)return;
 atlas.base=Math.min(w/atlas.width,h/atlas.height);
 const width=atlas.width*atlas.base*atlas.zoom,height=atlas.height*atlas.base*atlas.zoom;
 const clamp=(v,max)=>Math.max(-max,Math.min(max,v));
 atlas.x=clamp(atlas.x,Math.max(0,(width-w)/2));atlas.y=clamp(atlas.y,Math.max(0,(height-h)/2));
 const left=(w-width)/2+atlas.x,top=(h-height)/2+atlas.y;
 const scene=$('map');scene.style.width=atlas.width+'px';scene.style.height=atlas.height+'px';
 scene.style.transform=`translate(${left}px,${top}px) scale(${atlas.base*atlas.zoom})`;
 for(const el of $('pins').children){
  const x=left+Number(el.dataset.x)/100*width,y=top+Number(el.dataset.y)/100*height;
  el.style.left=x+'px';el.style.top=y+'px';el.hidden=x<0||y<0||x>w||y>h;
 }
 $('zoomOut').disabled=atlas.zoom<=1;$('zoomIn').disabled=atlas.zoom>=8;
 $('zoomValue').textContent=Math.round(atlas.zoom*100)+'%';
}
function atlasZoom(factor,anchor){
 const frame=atlasViewport(),w=frame.clientWidth,h=frame.clientHeight;
 const z=Math.max(1,Math.min(8,atlas.zoom*factor)),ratio=z/atlas.zoom;
 const a=anchor||{x:w/2,y:h/2};
 atlas.x=(atlas.x+w/2-a.x)*ratio-w/2+a.x;atlas.y=(atlas.y+h/2-a.y)*ratio-h/2+a.y;atlas.zoom=z;atlasDraw();
}
function atlasFocus(location){
 atlas.zoom=3;const frame=atlasViewport();
 const scale=Math.min(frame.clientWidth/atlas.width,frame.clientHeight/atlas.height)*atlas.zoom;
 atlas.x=(.5-location.x/100)*atlas.width*scale;atlas.y=(.5-location.y/100)*atlas.height*scale;atlasDraw();
}
function selectArea(id){activeRegion=id;atlas.selected=null;atlas.floor='';render();$('items').scrollTop=0;setView('map');requestAnimationFrame(atlasDraw);}
function renderAtlasMap(eligible){
 const area=ATLAS_LOCATIONS.areas[activeRegion];
 const floors=area?Object.keys(area.floors):[];
 if(area&&!floors.includes(atlas.floor)){
  const first=filtered().map(d=>pointFor(d.id)).find(p=>p&&floors.includes(p.floor));atlas.floor=first?.floor||floors[0];
 }
 const map=area?area.floors[atlas.floor]:{image:'hyrule-map.webp',width:1920,height:1400};
 const key=activeRegion+':'+(area?atlas.floor:'world'),changed=key!==atlas.key;
 atlas.width=map.width;atlas.height=map.height;
 $('mapTitle').textContent=area?areaName(activeRegion):'O reino de Hyrule';
 $('mapEyebrow').textContent=area?'MAPA DA REGIÃO':'ESCOLHA UMA REGIÃO';
 $('allRegions').textContent=area?'← Hyrule':'Todas as regiões';
 $('mapHelp').textContent=area?'Toque em um ponto para ver o objetivo. Arraste para mover; use + / − ou dois dedos para ampliar.':'Toque em uma região para abrir seu mapa detalhado. Arraste para mover e amplie com + / −.';
 $('floorLabel').hidden=floors.length<=1;
 $('floorSelect').innerHTML=floors.map(f=>`<option value="${f}" ${f===atlas.floor?'selected':''}>${f.startsWith('B')?'Subsolo '+f.slice(1):f==='Área'?'Área':f.replace('F','º andar')}</option>`).join('');
 $('areaSource').hidden=!area;if(area)$('areaSource').href=area.source;
 if(changed){
  atlas.key=key;atlas.zoom=1;atlas.x=atlas.y=0;
  const img=document.querySelector('.real-map');$('mapLoading').hidden=false;img.alt=area?'Mapa de '+areaName(activeRegion)+' · '+atlas.floor:'Mapa original de Hyrule';
  img.onload=()=>{$('mapLoading').hidden=true;atlasDraw();};img.onerror=()=>{$('mapLoading').hidden=false;$('mapLoading').textContent='O mapa não carregou. Recarregue a página.';};
  $('mapLoading').textContent='Carregando mapa…';img.src=map.image;
  if(img.complete&&img.naturalWidth)$('mapLoading').hidden=true;
 }
 if(!area){
  $('pins').innerHTML=regions.map(r=>{const list=eligible.filter(d=>d.region===r.id),n=list.filter(d=>state.done.includes(d.id)).length;return `<button class="atlas-pin world-pin ${list.length&&n===list.length?'complete':''}" data-region="${r.id}" data-x="${r.x}" data-y="${r.y}" aria-label="Abrir ${r.name}, ${list.length-n} objetivos pendentes"><span class="orb">${list.length&&n===list.length?'✓':list.length-n}</span><span class="name">${r.name}</span></button>`;}).join('');
  $('mapCoverage').textContent='Escolha uma das 22 regiões. Os números mostram objetivos pendentes.';
 }else{
  const items=filtered(),mapped=items.filter(d=>pointFor(d.id)),onFloor=mapped.filter(d=>pointFor(d.id).floor===atlas.floor);
  const groups=new Map();for(const d of onFloor){const p=pointFor(d.id),k=p.x+':'+p.y;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(d);}
  $('pins').innerHTML=[...groups.values()].map(group=>{const d=group[0],p=pointFor(d.id),allDone=group.every(d=>state.done.includes(d.id)),label=group.map(d=>d.title).join(' / ');return `<button class="atlas-pin objective-pin ${d.type} ${allDone?'complete':''} ${group.some(d=>d.id===atlas.selected)?'selected':''}" data-objectives="${group.map(d=>d.id).join(',')}" data-x="${p.x}" data-y="${p.y}" aria-label="${escapeHTML(label)}${allDone?', concluído':''}" title="${escapeHTML(label)}"><span class="orb">${allDone?'✓':group.length>1?group.length:d.type==='skull'?'S':d.type==='heart'?'♥':'!'}<span class="sr-only"> ${escapeHTML(label)}</span></span></button>`;}).join('');
  const missing=items.length-mapped.length;
  $('mapCoverage').textContent=`${onFloor.length} objetivos neste ${floors.length>1?'andar':'mapa'} · ${mapped.length}/${items.length} com ponto localizado${missing?' · '+missing+' ainda sem coordenada conferida':''}`;
 }
 atlasDraw();
}
function showObjective(id){
 const d=data.find(d=>d.id===id);if(!d)return;atlas.selected=id;const p=pointFor(id);
 openModal(`<p class="eyebrow">${escapeHTML(areaName(d.region))}${p&&p.floor!=='Área'?' · '+p.floor:''}</p><h2>${escapeHTML(d.title)}</h2><p>${escapeHTML(d.desc)}</p><div class="meta">${d.tags.map(t=>`<span class="tag">${escapeHTML(t)}</span>`).join('')}</div><p class="point-note">${p?escapeHTML(p.note):'A coordenada deste objetivo ainda não foi conferida. Consulte as instruções e o guia.'}</p>${d.review?'<p class="point-note">Há divergência de localização nos guias. Confira no jogo.</p>':''}<div class="actions"><button id="pointToggle">${state.done.includes(id)?'✓ Concluído — desmarcar':'Marcar como concluído'}</button><button id="pointLocate">${p?'Centralizar no mapa':'Ver mapa da região'}</button></div><p><a href="${p?p.source:sources[d.source]}" target="_blank" rel="noopener noreferrer">Conferir no mapa de referência ↗</a> · <a href="${sources[d.source]}" target="_blank" rel="noopener noreferrer">Guia do objetivo ↗</a></p>`);
 $('pointToggle').onclick=()=>{state.done=state.done.includes(id)?state.done.filter(x=>x!==id):[...state.done,id];save();render();showObjective(id);};
 $('pointLocate').onclick=()=>{$('modal').close();locateObjective(id);};
}
function locateObjective(id){
 const d=data.find(d=>d.id===id),p=pointFor(id);if(!d)return;
 activeRegion=d.region;atlas.selected=id;if(p)atlas.floor=p.floor;
 setView('map');render();requestAnimationFrame(()=>{if(p)atlasFocus(p);else atlasFit();});
 document.querySelector('.map-panel').scrollIntoView({block:'nearest',behavior:'auto'});
}
function initAtlas(){
 const frame=atlasViewport();
 $('zoomIn').onclick=()=>atlasZoom(1.4);$('zoomOut').onclick=()=>atlasZoom(1/1.4);$('zoomReset').onclick=atlasFit;
 $('floorSelect').onchange=()=>{atlas.floor=$('floorSelect').value;render();};
 $('allRegions').onclick=()=>selectArea('all');
 $('pins').onclick=e=>{const pin=e.target.closest('button');if(!pin)return;if(pin.dataset.region){selectArea(pin.dataset.region);return;}const ids=pin.dataset.objectives.split(',');if(ids.length===1){showObjective(ids[0]);return;}openModal('<h2>Objetivos neste ponto</h2><div class="actions">'+ids.map(id=>`<button data-open-objective="${id}">${escapeHTML(data.find(d=>d.id===id).title)}</button>`).join('')+'</div>');};
 $('modalBody').addEventListener('click',e=>{const b=e.target.closest('[data-open-objective]');if(b)showObjective(b.dataset.openObjective);});
 $('items').addEventListener('click',e=>{const b=e.target.closest('[data-locate]');if(b)locateObjective(b.dataset.locate);});
 frame.addEventListener('wheel',e=>{e.preventDefault();const r=frame.getBoundingClientRect();atlasZoom(Math.exp(-e.deltaY*.0015),{x:e.clientX-r.left,y:e.clientY-r.top});},{passive:false});
 const distance=()=>{const pts=[...atlas.pointers.values()];return pts.length===2?Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y):0;};
 frame.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;atlas.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});frame.setPointerCapture(e.pointerId);});
 frame.addEventListener('pointermove',e=>{const prev=atlas.pointers.get(e.pointerId);if(!prev)return;const before=distance();atlas.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(atlas.pointers.size===2){const after=distance(),pts=[...atlas.pointers.values()],r=frame.getBoundingClientRect();if(before)atlasZoom(after/before,{x:(pts[0].x+pts[1].x)/2-r.left,y:(pts[0].y+pts[1].y)/2-r.top});}else{atlas.x+=e.clientX-prev.x;atlas.y+=e.clientY-prev.y;atlasDraw();}});
 ['pointerup','pointercancel','lostpointercapture'].forEach(event=>frame.addEventListener(event,e=>atlas.pointers.delete(e.pointerId)));
 frame.addEventListener('keydown',e=>{if(e.target!==frame)return;const delta={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]}[e.key];if(delta){e.preventDefault();atlas.x+=delta[0];atlas.y+=delta[1];atlasDraw();}else if(e.key==='+'||e.key==='='){e.preventDefault();atlasZoom(1.4);}else if(e.key==='-'){e.preventDefault();atlasZoom(1/1.4);}else if(e.key==='Home'){e.preventDefault();atlasFit();}});
 document.querySelectorAll('[data-pan]').forEach(b=>b.onclick=()=>{const d={left:[80,0],right:[-80,0],up:[0,80],down:[0,-80]}[b.dataset.pan];atlas.x+=d[0];atlas.y+=d[1];atlasDraw();});
 new ResizeObserver(atlasDraw).observe(frame);
 $('mapFullscreen').onclick=()=>{const panel=document.querySelector('.map-panel');panel.classList.toggle('expanded');$('mapFullscreen').textContent=panel.classList.contains('expanded')?'Fechar tela cheia':'Tela cheia';document.body.classList.toggle('map-expanded',panel.classList.contains('expanded'));requestAnimationFrame(atlasDraw);};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.map-panel.expanded'))$('mapFullscreen').click();});
}