'use strict';
/* Iqra extras: the adhan at prayer time, and a Qibla compass driven by the phone's sensor. Loads after features.js. */

/* ---------- Adhan ---------- */
if(ST.adhan===undefined) ST.adhan=true;
const AD=new Audio(); AD.preload='none'; AD.src='data/adhan.mp3'; let adReady=false;
const adStop=document.createElement('button'); adStop.className='adstop'; adStop.textContent='Stop adhan'; phone.appendChild(adStop);
const adShow=on=>{adStop.classList.toggle('show',on);const b=$('#adprev');if(b)b.textContent=on?'Stop the adhan':'Preview the adhan'};
AD.addEventListener('playing',()=>{if(!AD.muted)adShow(true)}); AD.addEventListener('pause',()=>adShow(false)); AD.addEventListener('ended',()=>adShow(false));
adStop.addEventListener('click',()=>{AD.pause();AD.currentTime=0});
/* Phones only let a page play sound it has already played during a tap, so prime the adhan silently on the first touch. */
addEventListener('pointerdown',function prime(){
  removeEventListener('pointerdown',prime,true); if(!ST.adhan) return;
  AD.muted=true; const p=AD.play(); if(p&&p.then) p.then(()=>{AD.pause();AD.currentTime=0;AD.muted=false;adReady=true}).catch(()=>{AD.muted=false});
},true);
const chime=()=>[392,523,587,523,659,587,523].forEach((f,k)=>setTimeout(()=>blip(f,1.1,.06),k*520));
function playAdhan(){
  AD.muted=false; AD.currentTime=0; const p=AD.play();
  if(p&&p.then) p.catch(()=>{chime();toast('The adhan couldn’t play. Tap anywhere in Iqra once so it can sound next time.',5000)});
}
function adhan(i){
  toast('It’s time for '+P[i][0],7000); buzz([60,80,60]);
  if(ST.adhan&&ST.bells[i]===2) playAdhan(); else chime();
  try{ if(window.Notification&&Notification.permission==='granted') new Notification('Iqra',{body:'It’s time for '+P[i][0]+' in '+loc().name+'.'}) }catch(e){}
}

/* Wudu reminder while Iqra is open; the store apps schedule it as a real notification instead (native.js). */
function preAlert(from,to){
  if(NATIVE||ST.wudu===false) return;
  P.forEach((p,i)=>{ const t=p[1]-5; if(ST.bells[i]&&from<t&&to>=t&&to-from<5){
    toast('Time for wudu: '+p[0]+' is in 5 minutes',7000); buzz(40);
    try{ if(window.Notification&&Notification.permission==='granted') new Notification('Iqra',{body:'Time for wudu. '+p[0]+' is in 5 minutes.'}) }catch(e){}
  }});
}

/* ---------- Magnetic declination (World Magnetic Model 2025, 10° grid): turns the sensor's magnetic north into true north ---------- */
const DECL=[[128.4,116.2,105.2,95.1,85.7,76.9,68.6,60.5,52.6,44.9,37.3,29.8,22.3,14.8,7.3,-0.2,-7.9,-15.8,-23.9,-32.2,-40.8,-49.7,-58.8,-68.1,-77.7,-87.5,-97.8,-108.6,-120,-132.2,-145.3,-159.3,-174.1,170.9,155.9,141.6,128.4],[85.9,77.9,71.3,65.8,60.7,55.9,51,45.9,40.4,34.5,28.4,22.2,16,10,4.2,-1.6,-7.5,-13.9,-20.9,-28.4,-36.4,-44.7,-53.1,-61.4,-69.6,-77.7,-86,-94.6,-104,-115.2,-130,-152.4,173.5,137.1,112.1,96.5,85.9],[48.9,47.4,45.6,43.9,42.4,40.8,39,36.4,32.8,28,22.2,15.9,9.5,3.8,-1.1,-5.4,-9.5,-14.4,-20.3,-27.4,-35.2,-43.2,-50.8,-57.8,-63.8,-69,-73,-75.8,-76.7,-74,-61.5,-17.3,30.6,45.3,49.3,49.8,48.9],[31.9,32.1,31.7,31.1,30.6,30.3,30,29.2,27.1,23.2,17.3,10,2.4,-4.1,-8.8,-11.8,-13.9,-16.6,-20.9,-27.2,-34.7,-42.2,-48.7,-53.7,-57,-58.1,-56.8,-52.1,-43.2,-29.4,-12.7,3,14.9,23,28,30.7,31.9],[23,23.5,23.5,23.2,22.8,22.6,22.6,22.4,21.3,18,12,3.6,-5.2,-12.4,-16.9,-19.1,-19.9,-20.3,-21.8,-25.9,-32.1,-38.4,-43.3,-46,-46.3,-43.7,-38.3,-30.1,-20.3,-10.7,-2.5,4.4,10.3,15.3,19.1,21.6,23],[17.3,17.8,17.9,17.8,17.4,17,16.6,16.4,15.5,12.5,6.3,-2.5,-11.6,-18.4,-22.2,-23.8,-24,-22.6,-20.5,-20.3,-23.2,-27.6,-31.2,-32.7,-31.5,-27.7,-22,-15.1,-8.4,-3.2,0.6,3.9,7.5,11,14,16.1,17.3],[13.5,13.8,13.9,13.8,13.6,13,12.4,12,11,7.8,1.5,-7.2,-15.5,-21.2,-23.8,-24,-22.6,-19.3,-14.6,-10.7,-9.9,-12.2,-15.7,-17.9,-17.7,-15.3,-11.5,-6.9,-2.6,0,1.3,2.9,5.4,8.3,10.8,12.6,13.5],[11.2,11.2,11,11,10.8,10.3,9.7,9.2,8,4.5,-1.9,-9.9,-17,-21.3,-22.3,-20.6,-17.1,-12.7,-8,-4.1,-1.8,-2.3,-5,-7.7,-8.6,-7.9,-5.9,-3.1,-0.4,0.8,0.9,1.7,3.8,6.4,8.8,10.5,11.2],[10,9.7,9.4,9.3,9.3,8.9,8.3,7.6,6,2.2,-4.1,-11.1,-16.9,-19.8,-19.3,-16.1,-11.6,-7.3,-3.8,-0.9,1.3,1.7,-0.1,-2.4,-3.6,-3.8,-3.1,-1.6,0,0.3,-0.2,0.1,2.1,4.8,7.4,9.3,10],[9.1,9.1,8.9,8.9,9.1,8.8,8.1,7.1,4.8,0.4,-5.6,-11.7,-16.2,-17.7,-16.1,-12.4,-8,-4.1,-1.3,0.7,2.5,3.2,2.1,0.3,-0.9,-1.4,-1.5,-1,-0.4,-0.8,-1.8,-1.8,-0.1,2.7,5.6,8,9.1],[8,8.8,9.1,9.6,10.1,10,9.1,7.4,4.2,-0.8,-6.9,-12.2,-15.3,-15.6,-13.4,-9.9,-5.8,-2.2,0.2,1.9,3.3,4,3.3,1.9,0.9,0.3,-0.2,-0.5,-1,-2.2,-3.7,-4.2,-2.8,-0.2,3,6,8],[6.1,8.2,9.6,10.9,11.8,11.9,10.9,8.5,4.3,-1.6,-8,-12.8,-14.9,-14.3,-11.9,-8.5,-4.7,-1.3,1.2,2.8,4,4.7,4.5,3.7,2.9,2.2,1.3,0.1,-1.5,-3.8,-6,-7,-6,-3.6,-0.3,3.2,6.1],[3.9,7.2,10,12.2,13.7,14,12.8,9.8,4.7,-2.3,-9.2,-13.9,-15.5,-14.5,-11.8,-8.4,-4.7,-1.2,1.6,3.5,5,6,6.5,6.4,6,5.1,3.5,1.2,-2,-5.5,-8.5,-9.9,-9.2,-6.9,-3.5,0.2,3.9],[2,6.2,10.1,13.3,15.4,16.1,14.9,11.3,4.9,-3.4,-11.2,-16.2,-17.7,-16.5,-13.7,-10,-6,-2,1.4,4.1,6.4,8.3,9.8,10.8,10.8,9.7,7,2.9,-2.3,-7.5,-11.3,-12.9,-12.2,-9.7,-6.2,-2.2,2],[0.6,5.3,9.9,13.9,16.8,18.1,17.1,12.7,4.5,-6.1,-15.4,-20.8,-22.2,-20.7,-17.5,-13.3,-8.7,-3.9,0.6,4.8,8.6,12.2,15.2,17.3,18.1,16.9,13,6.4,-1.8,-9.2,-14.1,-15.8,-14.9,-12.2,-8.5,-4.1,0.6],[-1.5,3.7,8.8,13.3,16.9,18.6,17.4,11.6,0.2,-13.9,-24.4,-29.2,-29.5,-27,-22.7,-17.5,-11.8,-5.8,0.2,6.2,12,17.5,22.3,26.3,28.7,28.7,24.9,16,3.1,-9.1,-16.4,-19,-18.2,-15.4,-11.3,-6.6,-1.5],[-8,-2.9,1.9,5.7,7.8,7.1,1.7,-9.6,-23.9,-34.8,-39.6,-39.6,-36.7,-32,-26.1,-19.6,-12.5,-5.2,2.3,9.8,17.3,24.6,31.6,38.2,44,48.5,50.6,48.1,36,10.8,-12.4,-22.4,-24.1,-22,-18.1,-13.2,-8]];
function declAt(lat,lng){
  const y=clamp((lat+80)/10,0,16), x=clamp((fix(lng+180,360))/10,0,36), y0=Math.min(15,Math.floor(y)), x0=Math.min(35,Math.floor(x)), fy=y-y0, fx=x-x0;
  const a=DECL[y0][x0], b=DECL[y0][x0+1], c=DECL[y0+1][x0], d=DECL[y0+1][x0+1];
  return (a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;
}

/* ---------- Qibla with the phone's compass ---------- */
let sens=false, sensH=null, sensAcc=null, sensId=0;
const sensBtn=$('#sensbtn');
function onOri(e){
  let h=null;
  if(typeof e.webkitCompassHeading==='number'&&!isNaN(e.webkitCompassHeading)){h=e.webkitCompassHeading;sensAcc=e.webkitCompassAccuracy}
  else if(e.absolute&&typeof e.alpha==='number') h=360-e.alpha;
  if(h===null) return;
  const so=(screen.orientation&&screen.orientation.angle)||0, L=loc();
  sensH=fix(h+so+declAt(L.lat,L.lng),360);
}
function stopSensor(){
  sens=false; sensId++; sensH=null; removeEventListener('deviceorientationabsolute',onOri,true); removeEventListener('deviceorientation',onOri,true);
  sensBtn.textContent='Use my phone’s compass'; sensBtn.setAttribute('aria-pressed','false'); $('#find').hidden=false; phone.classList.remove('sensing');
}
function sensFail(){
  stopSensor();
  toast('Your phone’s compass can’t be read in this view. Open Iqra as its own website or installed app to use it. You can still spin the dial by hand.',8000);
}
async function startSensor(){
  try{
    if(!window.DeviceOrientationEvent) throw new Error('none');
    if(typeof DeviceOrientationEvent.requestPermission==='function'){const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted')throw new Error('denied')}
  }catch(e){return sensFail()}
  sens=true; sensH=null; const id=++sensId; addEventListener('deviceorientationabsolute',onOri,true); addEventListener('deviceorientation',onOri,true);
  sensBtn.textContent='Finding north…'; sensBtn.setAttribute('aria-pressed','true'); $('#find').hidden=true; phone.classList.add('sensing');
  setTimeout(()=>{ if(id!==sensId||!sens) return; if(sensH===null) sensFail(); else {sensBtn.textContent='Stop using the compass';toast('Hold your phone flat and turn slowly.',3500)} },2500);
}
sensBtn.addEventListener('click',()=>{ if(sens) stopSensor(); else startSensor(); blip(520,.1,.04) });

/* Replaces the hand-spun dial's update: follows the sensor when it is on, otherwise keeps the weighted spin. */
function qibla(){
  const live=sens&&sensH!==null;
  if(live){ hd+=wrap(sensH-hd)*.2; hv=0; grabA=null; seek=false }
  else if(grabA===null){
    const off=wrap(hd-bearing);
    if(calm&&seek){hd=bearing;hv=0;seek=false}
    else if(seek){hv+=-off*.022;hv*=.87;if(Math.abs(off)<.05&&Math.abs(hv)<.02){hd=bearing;hv=0;seek=false}}
    else{if(Math.abs(off)<12)hv+=-off*.016;hv*=.95}
    hd+=hv;
  }
  const step=Math.floor(hd/6); if(step!==tickA){tickA=step;if(!live&&(Math.abs(hv)>.3||grabA!==null))blip(1800,.015,.012,'square')}
  $('#dial').style.transform='rotate('+(-hd)+'deg)';
  comp.style.transform='perspective(900px) rotateX('+(-par.y*10)+'deg) rotateY('+(par.x*10)+'deg)';
  const off=wrap(bearing-hd), ok=Math.abs(off)<(live?4:2.5)&&Math.abs(hv)<.6;
  $('#deg').textContent=Math.round(((hd%360)+360)%360)+'°';
  const was=phone.classList.contains('aligned');
  if(ok!==was){phone.classList.toggle('aligned',ok);if(ok){const p=at(comp);burst(p[0],p[1]-comp.offsetHeight/2,28,'#FFD98A',4);chord();buzz([10,40,20])}}
  // Only the live compass can say the person is facing Makkah; a hand-spun dial only shows the bearing.
  const txt=ok?(live?'You’re facing the Qibla':'The dial points to the Qibla'):live?'Turn '+(off>0?'right':'left')+' '+Math.round(Math.abs(off))+'°':'Spin to find the Qibla';
  const st=$('#qstat'); if(st.textContent!==txt) st.textContent=txt;
}

/* ---------- Opening: the scene settles, the wordmark is written in, then stars and dust keep it alive (timings in iqra.html).
   First visit then offers Begin; returning visits play it in about a third of the time and hand over to Today at 1s. ---------- */
(function(){
  const sp=$('#splash'), art=sp.querySelector('.sp-art'), first=!store.get('onb',false);
  // Stars in the arch's sky [x%, y%, size, period s, delay s] and dust rising off the page [x%, size, drift, period s, delay s].
  const STARS=[[50,9.2,.5,3.4,0],[38,13.4,.42,4.1,1.2],[63,14.1,.55,3.7,.5],[30,19.2,.4,4.6,2.1],[71,20.3,.46,3.2,1.7],[44,18.1,.36,5,.9],[58,21.4,.4,4.3,2.6],[24,27.4,.44,3.9,.3],[77,28.2,.5,4.8,1.4],[36,31,.36,3.5,2.9],[66,31.6,.42,4.4,.7],[19,35,.38,5.2,1.9],[82,36.2,.4,3.8,2.3]];
  const MOTES=[[42,.55,-3,7.2,0],[55,.7,2.5,8.4,.8],[48,.45,1,6.6,1.9],[61,.5,4,7.8,2.7],[37,.6,-1.5,9,3.6],[52,.4,-2,6.9,4.4],[45,.65,3,8.1,5.3],[58,.45,-3.5,7.5,6.1],[50,.55,1.5,9.4,7]];
  $('#spfx').insertAdjacentHTML('beforeend',STARS.map(s=>'<i class="sp-star" style="--x:'+s[0]+'%;--y:'+s[1]+'%;--s:'+s[2]+'cqw;--t:'+s[3]+'s;--d:'+s[4]+'s"></i>').join('')
    +MOTES.map(m=>'<i class="sp-mote" style="--x:'+m[0]+'%;--s:'+m[1]+'cqw;--dx:'+m[2]+'cqw;--t:'+m[3]+'s;--d:'+m[4]+'s"></i>').join(''));
  const done=()=>{ if(sp.classList.contains('out')) return; sp.classList.add('out'); today.classList.add('enter'); setTimeout(()=>sp.hidden=true,calm?150:620) };
  if(first){
    sp.setAttribute('role','dialog'); sp.setAttribute('aria-modal','true'); sp.setAttribute('aria-labelledby','spword'); sp.removeAttribute('aria-hidden'); sp.classList.add('first');
    // An unrecognised time zone falls back to Makkah, so say so and lead with choosing a city.
    if(GUESS.miss){ $('#spnote').innerHTML='Showing <b>Makkah</b> until you choose your city'; $('#spchoose').className='btn gold press'; $('#spbegin').className='btn ghost press' }
    else $('#spcity').textContent=loc().name;
    $('#spbegin').addEventListener('click',()=>{store.set('onb',true);done();blip(660,.2,.04)});
    $('#spchoose').addEventListener('click',()=>{store.set('onb',true);done();setTimeout(setSheet,calm?0:320)});
  }else{ sp.classList.add('quick'); sp.addEventListener('pointerdown',done) }
  // Start once the artwork is in, or after 1.2s on a slow connection.
  let began=false;
  function begin(){
    if(began) return; began=true; sp.classList.add('go');
    if(first) setTimeout(()=>{$('#spgo').hidden=false;if(matchMedia('(hover:hover)').matches)$(GUESS.miss?'#spchoose':'#spbegin').focus({preventScroll:true})},calm?0:2500);
    else setTimeout(done,calm?350:1000);
  }
  if(art.complete&&art.naturalWidth) begin(); else { art.addEventListener('load',begin); art.addEventListener('error',begin); setTimeout(begin,1200) }
})();

/* ---------- Settings actions ---------- */
phone.addEventListener('click',e=>{
  const a=e.target.closest('[data-act]'); if(!a) return; const act=a.dataset.act;
  if(act==='wudu'){ ST.wudu=!ST.wudu; saveST(); a.setAttribute('aria-checked',ST.wudu); blip(880,.08,.04) }
  else if(act==='adhan'){ ST.adhan=!ST.adhan; saveST(); a.setAttribute('aria-checked',ST.adhan); if(!ST.adhan){AD.pause();AD.currentTime=0} blip(880,.08,.04) }
  else if(act==='adprev'){ if(AD.paused||AD.muted) playAdhan(); else {AD.pause();AD.currentTime=0} }
  else if(act==='notif'){
    if(!window.Notification) return toast('Notifications aren’t available in this view.');
    try{ Promise.resolve(Notification.requestPermission()).then(r=>toast(r==='granted'?'Notifications are on while Iqra is open.':'Notifications are blocked in this view.')).catch(()=>toast('Notifications are blocked in this view.')) }
    catch(err){ toast('Notifications are blocked in this view.') }
  }
});
