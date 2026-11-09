'use strict';
const $=s=>document.querySelector(s), clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const canvas=$('#film'),ctx=canvas.getContext('2d',{alpha:false}),stage=$('#stage'),journey=$('#journey');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const supportedLanguages = ['en', 'it', 'de', 'es', 'fr', 'ru'];
const languageParam = new URL(location.href).searchParams.get('lang');
const language = supportedLanguages.includes(languageParam) ? languageParam : 'en';
let translations = {};
document.documentElement.lang = language;
$('#language-select').value = language;
$('#language-select').addEventListener('change', (event) => {
  const url = new URL(location.href);
  if (event.target.value === 'en') url.searchParams.delete('lang');
  else url.searchParams.set('lang', event.target.value);
  location.assign(url);
});

function applyTranslations(root) {
  for (const node of root.querySelectorAll('[data-i18n]')) {
    const value = translations[node.dataset.i18n];
    if (typeof value === 'string') node.textContent = value;
  }
  for (const node of root.querySelectorAll('[data-i18n-placeholder]')) {
    const value = translations[node.dataset.i18nPlaceholder];
    if (typeof value === 'string') node.placeholder = value;
  }
  for (const link of root.querySelectorAll('a[href^="https://signup.duevio.com/"]')) {
    const url = new URL(link.href);
    url.searchParams.set('lang', language);
    link.href = url.href;
  }
}

async function loadTranslations() {
  if (language === 'en') return;
  try {
    const response = await fetch(`assets/i18n/${language}.json?v=arrows`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw Error('Translation unavailable');
    translations = await response.json();
  } catch (error) {
    document.documentElement.lang = 'en';
    $('#language-select').value = 'en';
  }
}

const anchor = new Image();
anchor.onload = () => { dirty = true; };
if (!reducedMotion) anchor.src = 'assets/anchor-detail.webp';
const cache = new Map(), pending = new Set(), unavailable = new Set();
let requestedFrame = 0;
let frameDirection = 1;
let paintedImage;
const transitionFrames = [149, 150, 299, 300];
const sceneVeil = $('#scene-veil');
function fadeBetween(progress, center, width) {
  const t = clamp(1 - Math.abs(progress - center) / width);
  return t * t * (3 - 2 * t);
}
let ready=false,progress=0,lastFrame=-1,lastWidth=0,lastHeight=0,home=true,dirty=true,lenis=null,pages={};
const clips=['drop','arrival','luminescence'];
const setLoad=n=>{$('#load-number').textContent=n+'%';$('.load-line i').style.width=n+'%'};
function sceneAt(p){if(p<.28)return {clip:0,t:p/.28};if(p<.72)return {clip:1,t:clamp((p-.28)/.396)};return {clip:2,t:(p-.72)/.28}}
function startSmoothScroll() {
  if (ready && !reducedMotion && !lenis && window.Lenis) {
    lenis = new Lenis({ lerp: .085, smoothWheel: true, syncTouch: false });
  }
}
$('#lenis-script').addEventListener('load', startSmoothScroll);

function unlock() {
  setLoad(100);
  ready = true;
  document.body.classList.remove('loading');
  $('#loader').classList.add('done');
  observeHeroLanding();
  dirty = true;
  startSmoothScroll();
}

function loadNearbyFrames() {
  if (!home || reducedMotion) return;
  const nearby = [0, 1, 3, 6, 10, -1, 2, 4, 5, -2]
    .map(offset => requestedFrame + offset * frameDirection);
  const upcomingCut = transitionFrames.filter(index => Math.abs(index - requestedFrame) <= 22);
  const candidates = [nearby[0], ...upcomingCut, ...nearby.slice(1)];
  for (const index of candidates) {
    if (pending.size >= 6) break;
    if (index < 0 || index >= 450 || cache.has(index) ||
        pending.has(index) || unavailable.has(index)) continue;

    const image = new Image();
    pending.add(index);
    image.onload = () => {
      pending.delete(index);
      cache.set(index, image);
      if (cache.size > 32) {
        const farthest = [...cache.keys()].reduce((a, b) =>
          Math.abs(a - requestedFrame) > Math.abs(b - requestedFrame) ? a : b);
        cache.delete(farthest);
      }
      dirty = true;
      loadNearbyFrames();
    };
    image.onerror = () => {
      pending.delete(index);
      unavailable.add(index);
      loadNearbyFrames();
    };
    const clip = clips[Math.floor(index / 150)];
    const number = String(index % 150 + 1).padStart(4, '0');
    image.src = `frames/${clip}/frame_${number}.jpg?v=20261109-flow`;
  }
}

async function preload() {
  try {
    const [response] = await Promise.all([
      fetch('content.json?v=20261109-screens', { signal: AbortSignal.timeout(15000) }),
      loadTranslations()
    ]);
    if (!response.ok) throw Error('Page content unavailable.');
    pages = await response.json();
    $('#home-content').innerHTML = pages.home;
    applyTranslations(document);
    revealEditorialMedia();
    route();
    unlock();
  } catch (error) {
    $('#load-error').hidden = false;
    $('#load-error').textContent = 'Page content unavailable. Please reload to retry.';
    $('#load-number').textContent = 'RETRY';
    $('#load-number').style.cursor = 'pointer';
    $('#load-number').onclick = () => location.reload();
  }
}
function cover(im){const scale=Math.max(canvas.width/im.naturalWidth,canvas.height/im.naturalHeight);ctx.drawImage(im,(canvas.width-im.naturalWidth*scale)/2,(canvas.height-im.naturalHeight*scale)/2,im.naturalWidth*scale,im.naturalHeight*scale)}
function mix(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*t))}function rgb(v){return `rgb(${v.join(',')})`}
// Match the altitude to the shot: skyline, between buildings, then street level.
const descentWaypoints = [[0, 20000], [.35, 8500], [.55, 2600], [.68, 800], [.8, 280], [.9, 110], [1, 0]];
function descentAltitude(progress) {
  for (let index = 1; index < descentWaypoints.length; index++) {
    const [end, altitude] = descentWaypoints[index];
    if (progress > end) continue;
    const [start, previous] = descentWaypoints[index - 1];
    const fraction = (progress - start) / (end - start);
    return Math.round(previous + (altitude - previous) * fraction);
  }
  return 0;
}

function revealEditorialMedia() {
  if (reducedMotion || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.replace('editorial-pending', 'editorial-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: .12 });
  for (const item of document.querySelectorAll('[data-editorial-reveal]')) {
    item.classList.add('editorial-pending');
    observer.observe(item);
  }
}

function updateSceneVeil(p) {
  if (reducedMotion) return;
  const cloud = fadeBetween(p, .28, .043);
  const city = fadeBetween(p, .72, .035);
  sceneVeil.classList.toggle('city-veil', city > 0);
  sceneVeil.style.opacity = Math.max(cloud, city);
}
function render(p){updateSceneVeil(p);const scene=sceneAt(p),index=scene.clip*150+Math.min(149,Math.floor(clamp(scene.t)*149));const w=stage.clientWidth,h=stage.clientHeight,dpr=Math.min(devicePixelRatio||1,2);const resize=w!==lastWidth||h!==lastHeight;if(resize){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.imageSmoothingQuality='high';lastWidth=w;lastHeight=h;}if(!dirty&&index===lastFrame&&!resize)return;lastFrame=index;dirty=false;
if (!reducedMotion) {
  frameDirection = Math.sign(index - requestedFrame) || frameDirection;
  requestedFrame = index;
  loadNearbyFrames();
  const nearest = [...cache.keys()].reduce((best, frame) =>
    best === undefined || Math.abs(frame - index) < Math.abs(best - index)
      ? frame : best, undefined);
  const posterReady = anchor.complete && anchor.naturalWidth;
  const image = (p < .003 || nearest === undefined) && posterReady ? anchor : cache.get(nearest);
  if (image && (resize || image !== paintedImage)) {
    cover(image);
    paintedImage = image;
  }
}
let color=[5,9,16],fg='#e9edea';if(scene.clip===1){color=scene.t<.7?mix([0,0,0],[210,242,247],scene.t/.7):mix([210,242,247],[255,255,255],(scene.t-.7)/.3);if(scene.t>.45)fg='#12232c';}if(scene.clip===2){color=mix([11,20,39],[0,0,0],scene.t);}
if(reducedMotion){color=[5,13,30];fg='#e9edea';}stage.style.background=rgb(color);document.body.style.background=rgb(color);stage.style.color=fg;document.body.classList.toggle("bright-stage",!reducedMotion&&scene.clip===1&&scene.t>.45);canvas.style.opacity=scene.clip===1?String(.95-.25*scene.t):'1';$('.film-shade').style.background=scene.clip===1?`linear-gradient(180deg,${rgb(color)} 0%,transparent 38%,transparent 65%,${rgb(color)} 100%)`:'linear-gradient(180deg,#05091055,transparent 45%,#05091010 70%,#050910cc)';
const heroOpacity=clamp(1-p/.16);$('.hero-title').style.opacity=heroOpacity;$('.hero-title').style.transform=`translateY(${-p*140}px)`;
const desc=scene.clip===1?Math.min(clamp((scene.t-.07)/.13),clamp((1-scene.t)/.16)):0;$('#descent-copy').style.opacity=desc;$('#descent-copy').style.transform=`translateY(${(1-desc)*25}px)`;$('#light-copy').style.opacity=scene.clip===2?clamp((scene.t-.07)/.16):0;
const altitude = scene.clip === 0 ? 20000 :
  scene.clip === 1 ? descentAltitude(scene.t) : 0;
const grounded = altitude === 0;
for (const selector of ['#altimeter', '#distance', '#marker']) {
  $(selector).hidden = grounded;
}
$('#altitude').textContent = altitude.toLocaleString(language);
$('#distance').textContent = 'DISTANCE ' + String(20000 - altitude).padStart(5, '0') + ' m';
$('.alt-track i').style.transform = `scaleX(${1 - altitude / 20000})`;
$('#zone').textContent = altitude > 3000 ? 'ATMOSPHERIC DESCENT' :
  altitude > 1000 ? 'LANDING ZONE' : altitude > 200 ? 'TWILIGHT ZONE' : 'END OF SUNLIGHT';
$('#chapter').textContent=['00 — FROM THE UNIVERSE','01 — THE DESCENT','02 — LUMINESCENCE'][scene.clip];const marks=[{a:3000,text:'LANDING ZONE / GROUND'},{a:1000,text:'TWILIGHT ZONE'},{a:200,text:'END OF SUNLIGHT'}];const mark=marks.find(m=>Math.abs(altitude-m.a)<(m.a===3000?1800:500));$('#marker').style.opacity=scene.clip===1&&mark?'1':'0';if(mark){$('#marker-alt').textContent=mark.a.toLocaleString()+' m';$('#marker-text').textContent=mark.text;}}
function tick(time){if(lenis)lenis.raf(time);if(ready&&home){const max=journey.offsetHeight-stage.clientHeight,target=clamp(scrollY/Math.max(1,max));progress=reducedMotion?target:progress+(target-progress)*.12;if(Math.abs(target-progress)<.00001)progress=target;render(progress);}requestAnimationFrame(tick)}
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
home=key==='home';if(!home)document.body.classList.remove("bright-stage");document.body.classList.toggle('detail-mode',!home);$('#detail').hidden=home;$('#homepage').hidden=!home;if(!home){$('#detail').innerHTML=pages[key];applyTranslations($('#detail'));}observeHeroLanding();document.querySelectorAll('header nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+key));$('header').classList.remove('menu-open');$('#menu-toggle').setAttribute('aria-expanded','false');if(lenis)lenis.scrollTo(0,{immediate:true});window.scrollTo(0,0);progress=0;lastFrame=-1;dirty=true;document.title=home?'Duevio — The ideal compliance platform is not science fiction.':`Duevio — ${$('#detail h1')?.textContent.trim()||key}`;}
$('#menu-toggle').onclick=()=>{const open=$('header').classList.toggle('menu-open');$('#menu-toggle').setAttribute('aria-expanded',String(open));};window.addEventListener('hashchange',route);window.addEventListener('resize',()=>{dirty=true});
const shots=['Dashboard scura Duevio frontale-6.png','Schermata Duevio della coda KYC-11.png','Schermata Duevio frontale su sfondo trasparente-3.png','Schermata riepilogo cliente Duevio-12.png'];document.querySelectorAll('[data-shot]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-shot]').forEach(a=>a.classList.remove('selected'));b.classList.add('selected');$('.gallery-main img').src='assets/'+shots[Number(b.dataset.shot)];$('.gallery-main img').alt=b.textContent.replace(/^\d+ \/ /,'')+' — Duevio platform';});
document.addEventListener('click',e=>{const a=e.target.closest('a');if(a?.getAttribute('href')==='#cookies'&&document.body.classList.contains('detail-mode')&&location.hash==='#cookies')return;});
preload();requestAnimationFrame(tick);

let consentTrigger=null;document.addEventListener('click',e=>{if(e.target.closest('#openCookieSettings')){consentTrigger=e.target;$('#cookieModal').hidden=false;$('#cookieModal .modal-close').focus();}if(e.target.closest('#cookieModal .modal-close')){$('#cookieModal').hidden=true;consentTrigger?.focus();}if(e.target.closest('#saveCookieSettings')){localStorage.setItem('duevio_privacy_preferences_v1',JSON.stringify({analytics:$('#analyticsConsent').checked,marketing:$('#marketingConsent').checked,updatedAt:new Date().toISOString()}));$('#cookieModal').hidden=true;consentTrigger?.focus();}});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#cookieModal').hidden){$('#cookieModal').hidden=true;consentTrigger?.focus();}});
