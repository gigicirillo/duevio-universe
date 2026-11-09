'use strict';
const $=s=>document.querySelector(s), clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const canvas=$('#film'),ctx=canvas.getContext('2d',{alpha:false}),stage=$('#stage'),journey=$('#journey');
const fallback=matchMedia('(max-width:850px), (prefers-reduced-motion:reduce)').matches;
const anchor=new Image();anchor.src='assets/anchor.png';
const frames=[],cache=new Map(),pending=new Set();let ready=false,progress=0,lastFrame=-1,lastWidth=0,lastHeight=0,home=true,dirty=true,lenis=null,pages={};
const clips=['drop','arrival','luminescence'];
const setLoad=n=>{$('#load-number').textContent=n+'%';$('.load-line i').style.width=n+'%'};
function sceneAt(p){if(p<.28)return {clip:0,t:p/.28};if(p<.72)return {clip:1,t:clamp((p-.28)/.396)};return {clip:2,t:(p-.72)/.28}}
function unlock(){setLoad(100);ready=true;document.body.classList.remove('loading');$('#loader').classList.add('done');observeHeroLanding();dirty=true;if(fallback)$('#fallback').play().catch(()=>{});if(!fallback&&!matchMedia('(prefers-reduced-motion:reduce)').matches&&window.Lenis)lenis=new Lenis({lerp:.085,smoothWheel:true});}
function decode(i){if(cache.has(i)||pending.has(i)||!frames[i])return;pending.add(i);const im=new Image();im.onload=()=>{pending.delete(i);cache.set(i,im);if(cache.size>24){const far=[...cache.keys()].sort((a,b)=>Math.abs(b-i)-Math.abs(a-i));cache.delete(far[0]);}dirty=true};im.onerror=()=>pending.delete(i);im.src=frames[i];}
async function preload(){try{const response=await fetch('content.json?v=20261109-led');if(!response.ok)throw Error('Page content unavailable.');pages=await response.json();$('#home-content').innerHTML=pages.home;route();if(fallback){const v=$('#fallback');await new Promise((resolve,reject)=>{v.addEventListener('loadeddata',resolve,{once:true});v.addEventListener('error',()=>reject(Error('Video could not be loaded.')),{once:true});v.load();if(v.readyState>=2)resolve()});unlock();return;}
let completed=0,next=0;async function worker(){while(next<450){const i=next++,clip=Math.floor(i/150),num=i%150+1,path=`frames/${clips[clip]}/frame_${String(num).padStart(4,'0')}.jpg`;const r=await fetch(path);if(!r.ok)throw Error('A sequence frame could not be loaded.');frames[i]=URL.createObjectURL(await r.blob());completed++;setLoad(Math.floor(completed/450*99));}}
await Promise.all(Array.from({length:8},worker));await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{cache.set(0,im);resolve()};im.onerror=reject;im.src=frames[0]});unlock();}catch(e){$('#load-error').hidden=false;$('#load-error').textContent=e.message+' Please reload to retry.';$('#load-number').textContent='RETRY';$('#load-number').style.cursor='pointer';$('#load-number').onclick=()=>location.reload();}}
function cover(im){const scale=Math.max(canvas.width/im.naturalWidth,canvas.height/im.naturalHeight);ctx.drawImage(im,(canvas.width-im.naturalWidth*scale)/2,(canvas.height-im.naturalHeight*scale)/2,im.naturalWidth*scale,im.naturalHeight*scale)}
function mix(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*t))}function rgb(v){return `rgb(${v.join(',')})`}
function render(p){const scene=sceneAt(p),index=scene.clip*150+Math.min(149,Math.floor(clamp(scene.t)*149));const w=stage.clientWidth,h=stage.clientHeight,dpr=Math.min(devicePixelRatio||1,1.5);const resize=w!==lastWidth||h!==lastHeight;if(resize){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);lastWidth=w;lastHeight=h;}if(!dirty&&index===lastFrame&&!resize)return;lastFrame=index;dirty=false;
if(!fallback){decode(index);for(let off=1;off<=4;off++){decode(clamp(index+off,0,449));decode(clamp(index-off,0,449));}const im=cache.get(index);if(p<.003&&anchor.complete&&anchor.naturalWidth)cover(anchor);else if(im)cover(im);else{const nearest=[...cache.keys()].sort((a,b)=>Math.abs(a-index)-Math.abs(b-index))[0];if(nearest!==undefined)cover(cache.get(nearest));}}
let color=[5,9,16],fg='#e9edea';if(scene.clip===1){color=scene.t<.7?mix([0,0,0],[210,242,247],scene.t/.7):mix([210,242,247],[255,255,255],(scene.t-.7)/.3);if(scene.t>.45)fg='#12232c';}if(scene.clip===2){color=mix([11,20,39],[0,0,0],scene.t);}
if(fallback){color=[5,13,30];fg='#e9edea';}stage.style.background=rgb(color);document.body.style.background=rgb(color);stage.style.color=fg;document.body.classList.toggle("bright-stage",!fallback&&scene.clip===1&&scene.t>.45);canvas.style.opacity=scene.clip===1?String(.95-.25*scene.t):'1';$('.film-shade').style.background=scene.clip===1?`linear-gradient(180deg,${rgb(color)} 0%,transparent 38%,transparent 65%,${rgb(color)} 100%)`:'linear-gradient(180deg,#05091055,transparent 45%,#05091010 70%,#050910cc)';
const heroOpacity=clamp(1-p/.16);$('.hero-title').style.opacity=heroOpacity;$('.hero-title').style.transform=`translateY(${-p*140}px)`;
const desc=scene.clip===1?Math.min(clamp(scene.t/.12),clamp((1-scene.t)/.16)):0;$('#descent-copy').style.opacity=desc;$('#descent-copy').style.transform=`translateY(${(1-desc)*25}px)`;$('#light-copy').style.opacity=scene.clip===2?clamp(scene.t/.15):0;
const altitude=scene.clip===0?20000:scene.clip===1?Math.round(20000*(1-scene.t)):0;$('#altitude').textContent=altitude.toLocaleString('en-US');$('#distance').textContent='DISTANCE '+String(20000-altitude).padStart(5,'0')+' m';$('.alt-track i').style.transform=`scaleX(${1-altitude/20000})`;$('#zone').textContent=scene.clip===2?'LUMINESCENCE':altitude>3000?'ATMOSPHERIC DESCENT':altitude>1000?'LANDING ZONE':altitude>200?'TWILIGHT ZONE':altitude>0?'END OF SUNLIGHT':'GROUND / CONNECTED';
$('#chapter').textContent=['00 — FROM THE UNIVERSE','01 — THE DESCENT','02 — LUMINESCENCE'][scene.clip];const marks=[{a:3000,text:'LANDING ZONE / GROUND'},{a:1000,text:'TWILIGHT ZONE'},{a:200,text:'END OF SUNLIGHT'}];const mark=marks.find(m=>Math.abs(altitude-m.a)<(m.a===3000?1800:500));$('#marker').style.opacity=scene.clip===1&&mark?'1':'0';if(mark){$('#marker-alt').textContent=mark.a.toLocaleString()+' m';$('#marker-text').textContent=mark.text;}}
function tick(time){if(lenis)lenis.raf(time);if(ready&&home){const max=journey.offsetHeight-innerHeight,target=clamp(scrollY/Math.max(1,max));progress=fallback?target:progress+(target-progress)*.12;if(Math.abs(target-progress)<.00001)progress=target;render(progress);}requestAnimationFrame(tick)}
const heroLandingObserver = new IntersectionObserver((entries, observer) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.replace('awaiting-landing', 'is-landing');
    observer.unobserve(entry.target);
  }
}, { threshold: 0.18 });

function observeHeroLanding() {
  heroLandingObserver.disconnect();
  const scene = $('#detail .hero-screens');
  if (!ready || !scene || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  scene.classList.add('awaiting-landing');
  heroLandingObserver.observe(scene);
}

function route(){const key=location.hash.slice(1)||'home';if(!pages.home)return;if(key==='experience-end'){if(!home){location.hash='home';return}$('#experience-end').scrollIntoView({behavior:'smooth'});return;}if(!pages[key]){const el=document.getElementById(key);if(el){el.scrollIntoView({behavior:'smooth'});return;}return;}
home=key==='home';if(!home)document.body.classList.remove("bright-stage");document.body.classList.toggle('detail-mode',!home);$('#detail').hidden=home;$('#homepage').hidden=!home;if(!home)$('#detail').innerHTML=pages[key];observeHeroLanding();document.querySelectorAll('header nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+key));$('header').classList.remove('menu-open');$('#menu-toggle').setAttribute('aria-expanded','false');if(lenis)lenis.scrollTo(0,{immediate:true});window.scrollTo(0,0);progress=0;lastFrame=-1;dirty=true;document.title=home?'Duevio — The ideal compliance platform is not science fiction.':`Duevio — ${$('#detail h1')?.textContent.trim()||key}`;if(!home)$('#fallback').pause();else if(fallback&&ready)$('#fallback').play().catch(()=>{});}
$('#menu-toggle').onclick=()=>{const open=$('header').classList.toggle('menu-open');$('#menu-toggle').setAttribute('aria-expanded',String(open));};window.addEventListener('hashchange',route);window.addEventListener('resize',()=>{dirty=true});
const shots=['Dashboard scura Duevio frontale-6.png','Schermata Duevio della coda KYC-11.png','Schermata Duevio frontale su sfondo trasparente-3.png','Schermata riepilogo cliente Duevio-12.png'];document.querySelectorAll('[data-shot]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-shot]').forEach(a=>a.classList.remove('selected'));b.classList.add('selected');$('.gallery-main img').src='assets/'+shots[Number(b.dataset.shot)];$('.gallery-main img').alt=b.textContent.replace(/^\d+ \/ /,'')+' — Duevio platform';});
document.addEventListener('click',e=>{const a=e.target.closest('a');if(a?.getAttribute('href')==='#cookies'&&document.body.classList.contains('detail-mode')&&location.hash==='#cookies')return;});
preload();requestAnimationFrame(tick);

let consentTrigger=null;document.addEventListener('click',e=>{if(e.target.closest('#openCookieSettings')){consentTrigger=e.target;$('#cookieModal').hidden=false;$('#cookieModal .modal-close').focus();}if(e.target.closest('#cookieModal .modal-close')){$('#cookieModal').hidden=true;consentTrigger?.focus();}if(e.target.closest('#saveCookieSettings')){localStorage.setItem('duevio_privacy_preferences_v1',JSON.stringify({analytics:$('#analyticsConsent').checked,marketing:$('#marketingConsent').checked,updatedAt:new Date().toISOString()}));$('#cookieModal').hidden=true;consentTrigger?.focus();}});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#cookieModal').hidden){$('#cookieModal').hidden=true;consentTrigger?.focus();}});
