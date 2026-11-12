/* Store apps only (iOS and Android via Capacitor). Loaded after extras.js; does nothing in a browser.
   Schedules real prayer and wudu notifications that fire with the app closed, and wires the
   Android back button. */
(function(){
if(!NATIVE) return;
const C=window.Capacitor.Plugins, LN=C.LocalNotifications, App=C.App;
const DAYS=6; // 6 days x (5 prayers + 5 wudu) = 60, under iOS's limit of 64 pending notifications
const IDX=[0,2,3,4,5]; // calcTimes order: fajr, rise, dhuhr, asr, set, isha
const ANDROID=window.Capacitor.getPlatform()==='android';

/* Android 12+ needs "Alarms & reminders" for on-the-minute delivery. Without it the plugin would open
   that settings page on every schedule() call, so we ask for exact alarms only when we have it. */
let exact=true;
async function exactOK(){
  if(!ANDROID) return true;
  try{ return (await LN.checkExactNotificationSetting()).exact_alarm==='granted' }catch(e){ return true }
}
async function askExact(){
  toast('One more step: allow Alarms & reminders so reminders arrive on the minute.',6000);
  await new Promise(r=>setTimeout(r,2800));
  try{ await LN.changeExactNotificationSetting() }catch(e){}
  schedule(true);
}

function plan(){
  const L=loc(), out=[], now=Date.now();
  for(let off=0;off<DAYS;off++){
    const di=dayInfo(off), base=Date.UTC(di.y,di.m-1,di.d), o=offAt(L.tz,base+12*36e5);
    const tm=calcTimes(di.y,di.m,di.d,L.lat,L.lng,o,ST.method,ST.asr);
    IDX.forEach((k,i)=>{
      if(!ST.bells[i]) return;
      const at=base+tm[k]*60e3-o*36e5, id=off*100+i*2+1;
      if(at>now) out.push({id,title:NAMES[i],body:'It’s time for '+NAMES[i]+' in '+L.name+'.',isExactNotification:exact,schedule:{at:new Date(at),allowWhileIdle:true}});
      if(ST.wudu!==false&&at-3e5>now) out.push({id:id+1,title:'Time for wudu',body:NAMES[i]+' is in 5 minutes.',isExactNotification:exact,schedule:{at:new Date(at-3e5),allowWhileIdle:true}});
    });
  }
  return out;
}

let sig='', busy=false;
async function schedule(force){
  const s=JSON.stringify([ST,new Date().toDateString()]);
  if(busy||(!force&&s===sig)) return; busy=true;
  try{
    const p=await LN.checkPermissions();
    if(p.display!=='granted') return;
    exact=await exactOK();
    const pend=await LN.getPending();
    if(pend.notifications.length) await LN.cancel({notifications:pend.notifications.map(n=>({id:n.id}))});
    const list=plan(); if(list.length) await LN.schedule({notifications:list});
    sig=s;
  }catch(e){ console.warn('Iqra notifications',e) }
  finally{ busy=false }
}

async function askPermission(){
  try{
    const r=await LN.requestPermissions();
    if(r.display==='granted'){
      await schedule(true);
      if(!(await exactOK())&&!store.get('exactAsked',false)){ store.set('exactAsked',true); askExact() }
      else toast('Prayer notifications are on, even when Iqra is closed.');
    }
    else toast('Notifications are off. You can turn them on in your phone’s Settings.',5000);
  }catch(e){ toast('Notifications aren’t available on this phone.') }
}

// The settings sheet's notification button asks the OS instead of the browser.
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-act="notif"]'); if(!a) return;
  e.stopPropagation(); e.preventDefault();
  // A deliberate tap may reopen the Alarms & reminders page; the automatic ask happens only once.
  LN.checkPermissions().then(async p=>{ if(p.display==='granted'&&!(await exactOK())) askExact(); else askPermission() }).catch(askPermission);
},true);

// First launch after onboarding: ask once, then keep the schedule in step with settings.
setTimeout(async()=>{
  try{ const p=await LN.checkPermissions(); if(p.display==='prompt'||p.display==='prompt-with-rationale') await askPermission(); else schedule(true) }catch(e){}
},2500);
setInterval(()=>schedule(false),4000);
App.addListener('appStateChange',s=>{ if(s.isActive) schedule(true) });

// Android back: close an open sheet first, otherwise leave the app running.
App.addListener('backButton',()=>{ if(phone.classList.contains('sheeted')) closeSheet(); else App.minimizeApp() });
// Status bar style and edge-to-edge insets are set in capacitor.config.json (SystemBars).
})();
