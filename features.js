'use strict';
/* Iqra features: sheets, the Quran, the 99 Names, and everything under More. Loads after core.js. */

/* ---------- Sheet with drag to dismiss ---------- */
const sheet=$('#sheet'), sbody=$('#sbody'); let sheetKind='', opener=null;
/* While a sheet is up the page behind it is inert, so keyboards and screen readers stay inside; focus returns to what opened it. */
const behind=on=>[$('.views'),$('.tabs'),$('#nowBtn')].forEach(el=>el.inert=on);
function openSheet(kind,html){
  stopFollow(); const fresh=!sheetKind; if(fresh){opener=document.activeElement;behind(true)}
  sheetKind=kind; sbody.className='sbody '+kind+(ST.tr?'':' notr'); sbody.innerHTML=html; sbody.style.setProperty('--az',ST.az);
  [...sbody.children].forEach((c,i)=>c.style.setProperty('--i',i)); sbody.scrollTop=0; sheet.style.transform=''; phone.classList.add('sheeted'); blip(600,.07,.03); buzz(6);
  if(fresh) $('#grab').focus({preventScroll:true});
}
function closeSheet(){
  stopFollow();if(askCtl)askCtl.abort();sheet.classList.remove('pull');sheet.style.transform='';phone.classList.remove('sheeted');sheetKind='';
  behind(false); if(opener&&opener.isConnected&&opener!==document.body) opener.focus({preventScroll:true}); opener=null;
}
$('#scrim').addEventListener('click',closeSheet);
addEventListener('keydown',e=>{if(e.key==='Escape'&&sheetKind)closeSheet()});
let pull=null; const grab=$('#grab');
grab.addEventListener('pointerdown',e=>{pull={y:e.clientY,t:performance.now(),d:0};sheet.classList.add('pull');grab.setPointerCapture(e.pointerId)});
grab.addEventListener('pointermove',e=>{if(!pull)return;pull.d=Math.max(0,e.clientY-pull.y);sheet.style.transform='translateY('+pull.d+'px)'});
grab.addEventListener('pointerup',()=>{if(!pull)return;const v=pull.d/(performance.now()-pull.t),d=pull.d;pull=null;sheet.classList.remove('pull');if(d<4||d>130||v>.6)closeSheet();else sheet.style.transform=''});
grab.addEventListener('pointercancel',()=>{pull=null;sheet.classList.remove('pull');sheet.style.transform=''});
grab.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')closeSheet()});

/* ---------- Quran data ---------- */
let QD=null, EN=null, qErr=false, segMode='all', curS=0;
const BM=store.get('bm',[]);
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[^a-z0-9 ]/g,'');
/* Display transliterations of the 114 surah names; search still matches Tanzil's plain spellings too. */
const TL='Al-Fātiḥa|Al-Baqara|Āl ʿImrān|An-Nisāʾ|Al-Māʾida|Al-Anʿām|Al-Aʿrāf|Al-Anfāl|At-Tawba|Yūnus|Hūd|Yūsuf|Ar-Raʿd|Ibrāhīm|Al-Ḥijr|An-Naḥl|Al-Isrāʾ|Al-Kahf|Maryam|Ṭā Hā|Al-Anbiyāʾ|Al-Ḥajj|Al-Muʾminūn|An-Nūr|Al-Furqān|Ash-Shuʿarāʾ|An-Naml|Al-Qaṣaṣ|Al-ʿAnkabūt|Ar-Rūm|Luqmān|As-Sajda|Al-Aḥzāb|Sabaʾ|Fāṭir|Yā Sīn|Aṣ-Ṣāffāt|Ṣād|Az-Zumar|Ghāfir|Fuṣṣilat|Ash-Shūrā|Az-Zukhruf|Ad-Dukhān|Al-Jāthiya|Al-Aḥqāf|Muḥammad|Al-Fatḥ|Al-Ḥujurāt|Qāf|Adh-Dhāriyāt|Aṭ-Ṭūr|An-Najm|Al-Qamar|Ar-Raḥmān|Al-Wāqiʿa|Al-Ḥadīd|Al-Mujādila|Al-Ḥashr|Al-Mumtaḥana|Aṣ-Ṣaff|Al-Jumuʿa|Al-Munāfiqūn|At-Taghābun|Aṭ-Ṭalāq|At-Taḥrīm|Al-Mulk|Al-Qalam|Al-Ḥāqqa|Al-Maʿārij|Nūḥ|Al-Jinn|Al-Muzzammil|Al-Muddaththir|Al-Qiyāma|Al-Insān|Al-Mursalāt|An-Nabaʾ|An-Nāziʿāt|ʿAbasa|At-Takwīr|Al-Infiṭār|Al-Muṭaffifīn|Al-Inshiqāq|Al-Burūj|Aṭ-Ṭāriq|Al-Aʿlā|Al-Ghāshiya|Al-Fajr|Al-Balad|Ash-Shams|Al-Layl|Aḍ-Ḍuḥā|Ash-Sharḥ|At-Tīn|Al-ʿAlaq|Al-Qadr|Al-Bayyina|Az-Zalzala|Al-ʿĀdiyāt|Al-Qāriʿa|At-Takāthur|Al-ʿAṣr|Al-Humaza|Al-Fīl|Quraysh|Al-Māʿūn|Al-Kawthar|Al-Kāfirūn|An-Naṣr|Al-Masad|Al-Ikhlāṣ|Al-Falaq|An-Nās'.split('|');
const sname=i=>TL[i];
async function loadQuran(){
  try{
    const get=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u);return r.json()});
    const r=await Promise.all([get('data/quran.json'),get('data/en.json')]); QD=r[0]; EN=r[1];
  }catch(e){qErr=true}
  listSurahs(); paintAyah(); paintCont();
}
const RIB='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v16l-5-4-5 4z"></path></svg>';
const CH='<svg class="ch" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg>';
function vrow(s,a,k){return '<button class="srow press" style="--k:'+k+'" data-surah="'+s+'" data-ayah="'+a+'"><span class="num">'+s+'</span><span class="m"><b>'+esc(sname(s-1))+' '+s+':'+a+'</b><span>'+esc(EN[s-1][a-1])+'</span></span></button>'}
/* Where each of the 30 ajza begins (surah, ayah), as in the Tanzil metadata. */
const JUZ=[[1,1],[2,142],[2,253],[3,93],[4,24],[4,148],[5,82],[6,111],[7,88],[8,41],[9,93],[11,6],[12,53],[15,1],[17,1],[18,75],[21,1],[23,1],[25,21],[27,56],[29,46],[33,31],[36,28],[39,32],[41,47],[46,1],[51,31],[58,1],[67,1],[78,1]];
const card=(k,n,ar,t,sub,attrs,on)=>'<button class="scard press'+(on?' cur':'')+'" style="--k:'+k+'" '+attrs+'><span class="num">'+n+'</span><span class="m"><b>'+esc(t)+'</b><span>'+esc(sub)+'</span></span><span class="sa" lang="ar" dir="rtl">'+ar+'</span></button>';
const sCard=(i,k,lr)=>{const m=QD.m[i],on=lr&&lr.s===i+1;return card(k,i+1,m[1],sname(i),on?'Last read · ayah '+lr.a+' of '+QD.a[i].length:m[2]+' · '+QD.a[i].length+' verses','data-surah="'+(i+1)+'"'+(on?' data-ayah="'+lr.a+'" aria-current="true"':''),on)};
const recents=()=>{let r=store.get('recent',null);if(!r){const lr=store.get('lr',null);r=lr?[{s:lr.s,a:lr.a,t:Date.now()}]:[]}return r};
function paintRecents(show){
  const box=$('#recents'), r=QD&&show?recents():[]; box.hidden=!r.length; if(!r.length) return;
  box.innerHTML='<span class="over">Recent</span>'+r.map(x=>'<button class="rc press" data-surah="'+x.s+'" data-ayah="'+x.a+'" aria-label="'+esc(sname(x.s-1))+', ayah '+x.a+'">'+esc(sname(x.s-1))+' <small>'+x.s+':'+x.a+'</small></button>').join('');
}
function listSurahs(){
  const box=$('#surahs');
  if(!QD){box.innerHTML='<div class="none">'+(qErr?'The Quran text could not be loaded. Check your connection and reopen Iqra.':'Loading the Quran…')+'</div>';return}
  const f=norm($('#q').value.trim()); let h='';
  paintRecents(segMode==='all'&&!f);
  if(segMode==='bm'){
    h=BM.length?BM.map((b,k)=>{const p=b.split(':');return vrow(+p[0],+p[1],k)}).join(''):'<div class="none">No bookmarks yet. Open a surah and tap the ribbon beside any ayah to keep it here.</div>';
  }else if(!f&&segMode==='juz'){
    h=JUZ.map((j,k)=>card(k,k+1,QD.a[j[0]-1][j[1]-1].replace(/^۞\s*/,'').split(' ').slice(0,2).join(' '),'Juz '+(k+1),'Begins at '+sname(j[0]-1)+' · '+j[0]+':'+j[1],'data-surah="'+j[0]+'" data-ayah="'+j[1]+'"')).join('');
  }else{
    const lr=f?null:store.get('lr',null);
    const list=QD.m.map((m,i)=>i).filter(i=>!f||norm(TL[i]+' '+QD.m[i][0]+' '+QD.m[i][2]).includes(f)||String(i+1)===f);
    h=list.map((i,k)=>sCard(i,k,lr)).join('');
    if(f.length>=3){
      const hits=[]; for(let s=0;s<114&&hits.length<30;s++) for(let a=0;a<EN[s].length&&hits.length<30;a++) if(norm(EN[s][a]).includes(f)) hits.push([s+1,a+1]);
      if(hits.length) h+='<div class="lbl">Verses mentioning “'+esc($('#q').value.trim())+'”'+(hits.length===30?' (first 30)':'')+'</div>'+hits.map((x,k)=>vrow(x[0],x[1],k)).join('');
    }
    if(!h) h='<div class="none">Nothing matches that search. Try a surah name like Yusuf, a number, or a word such as mercy.</div>';
  }
  box.innerHTML=h;
}
let qT=null; $('#q').addEventListener('input',()=>{clearTimeout(qT);qT=setTimeout(listSurahs,140)});
function setSeg(m){segMode=m;$$('#seg button').forEach(x=>x.setAttribute('aria-selected',x.dataset.seg===m));$('#qbmbtn').setAttribute('aria-pressed',m==='bm');listSurahs();blip(700,.05,.03)}
$('#seg').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setSeg(b.dataset.seg)});
$('#qbmbtn').addEventListener('click',()=>setSeg(segMode==='bm'?'all':'bm'));

/* ---------- Reader ---------- */
function openSurah(n,ay){
  if(!QD) return toast(qErr?'The Quran text could not be loaded.':'Still loading the Quran. One moment.');
  const i=n-1, m=QD.m[i], A=QD.a[i], E=EN[i]; curS=n;
  let h='<div class="shead"><div><h2>'+esc(sname(i))+'</h2><p>'+esc(m[2])+' · '+A.length+' ayahs · '+(m[3]==='M'?'Meccan':'Medinan')+'</p></div><div class="x" lang="ar" dir="rtl">'+m[1]+'</div></div>'
   +'<div class="tools"><button class="chip" id="follow" data-act="follow"><span class="eq">'+[0,1,2].map(d=>'<i style="--d:'+d+'"></i>').join('')+'</span><span>Follow</span></button>'
   +'<button class="chip" data-act="tr" aria-pressed="'+ST.tr+'">Translation</button><button class="chip" data-act="az" data-d="-2" aria-label="Smaller Arabic text">A−</button><button class="chip" data-act="az" data-d="2" aria-label="Larger Arabic text">A+</button></div>';
  if(n!==1&&n!==9) h+='<div class="bism" lang="ar" dir="rtl">'+QD.bis+'</div>';
  for(let k=0;k<A.length;k++) h+='<div class="vs" data-a="'+(k+1)+'"><div class="a" lang="ar" dir="rtl">'+A[k]+'</div><div class="e">'+esc(E[k])+'</div><footer><span class="vn">'+n+':'+(k+1)+'</span><button class="bm" data-act="bm" aria-pressed="'+BM.includes(n+':'+(k+1))+'" aria-label="Bookmark ayah '+(k+1)+'">'+RIB+'</button></footer></div>';
  openSheet('reader',h);
  setLast(n,ay||1);
  if(ay>1){const el=sbody.querySelector('.vs[data-a="'+ay+'"]');if(el)sbody.scrollTop=el.offsetTop-sbody.offsetTop-70}
}
function setLast(s,a){
  store.set('lr',{s,a}); const r=recents().filter(x=>x.s!==s); r.unshift({s,a,t:Date.now()}); store.set('recent',r.slice(0,8));
  paintCont(); if(cur!=='quran'||segMode!=='all') return; paintRecents(!$('#q').value.trim());
}
function firstVisible(){const vs=$$('.vs'),top=sbody.scrollTop+sbody.offsetTop+90;for(let i=0;i<vs.length;i++)if(vs[i].offsetTop+vs[i].offsetHeight>top)return i;return vs.length-1}
let scT=null;
sbody.addEventListener('scroll',()=>{ if(sheetKind!=='reader'||scT) return; scT=setTimeout(()=>{scT=null;if(sheetKind==='reader'&&curS)setLast(curS,firstVisible()+1)},400) },{passive:true});
let folT=null;
function stopFollow(){clearTimeout(folT);folT=null;const b=$('#follow');if(b){b.classList.remove('on');b.lastChild.textContent='Follow'}sbody.classList.remove('reading');$$('.vs.lit').forEach(v=>v.classList.remove('lit'))}
function startFollow(){
  const vs=$$('.vs'), b=$('#follow'); let i=firstVisible(); b.classList.add('on'); b.lastChild.textContent='Pause'; sbody.classList.add('reading');
  (function step(){
    if(i>=vs.length) return stopFollow();
    vs.forEach((v,k)=>v.classList.toggle('lit',k===i)); sbody.scrollTo({top:vs[i].offsetTop-sbody.offsetTop-90,behavior:calm?'auto':'smooth'});
    folT=setTimeout(step,1500+vs[i].firstChild.textContent.length*55); i++;
  })();
}

/* ---------- Today: daily ayah and continue reading ---------- */
const DAILY=[[94,6],[2,286],[2,152],[13,28],[3,139],[39,53],[65,3],[2,186],[94,5],[29,69],[16,128],[8,46],[20,114],[21,87],[40,60],[2,153],[3,159],[11,88],[93,5],[55,13],[49,13],[24,35],[59,22],[3,8],[14,7],[50,16],[57,4],[2,255]];
function paintAyah(){
  if(!QD) return; const c=cityNow(), doy=Math.floor((Date.UTC(c.y,c.m-1,c.d)-Date.UTC(c.y,0,0))/864e5), r=DAILY[doy%DAILY.length];
  $('.ayah').classList.toggle('long',QD.a[r[0]-1][r[1]-1].length>110);
  $('#ayahA').textContent=QD.a[r[0]-1][r[1]-1]; $('#ayahE').textContent=EN[r[0]-1][r[1]-1]; $('#ayahC').textContent=sname(r[0]-1)+' · '+r[0]+':'+r[1];
}
function paintCont(){
  const lr=store.get('lr',null); if(!QD||!lr) return; const n=QD.a[lr.s-1].length;
  $('#contT').textContent='Continue '+sname(lr.s-1); $('#contS').textContent='Ayah '+lr.a+' of '+n; $('#contBar').style.setProperty('--p',Math.max(.02,lr.a/n));
}
$('#cont').addEventListener('click',()=>{const lr=store.get('lr',{s:1,a:1});openSurah(lr.s,lr.a)});

/* ---------- The 99 Names ---------- */
const NM=[['الرَّحْمَٰن','Ar-Rahman','The Most Compassionate'],['الرَّحِيم','Ar-Rahim','The Most Merciful'],['الْمَلِك','Al-Malik','The King'],['الْقُدُّوس','Al-Quddus','The Most Holy'],['السَّلَام','As-Salam','The Source of Peace'],['الْمُؤْمِن','Al-Mu’min','The Giver of Security'],['الْمُهَيْمِن','Al-Muhaymin','The Guardian'],['الْعَزِيز','Al-‘Aziz','The Almighty'],['الْجَبَّار','Al-Jabbar','The Compeller'],['الْمُتَكَبِّر','Al-Mutakabbir','The Supreme'],
['الْخَالِق','Al-Khaliq','The Creator'],['الْبَارِئ','Al-Bari’','The Originator'],['الْمُصَوِّر','Al-Musawwir','The Fashioner'],['الْغَفَّار','Al-Ghaffar','The Ever-Forgiving'],['الْقَهَّار','Al-Qahhar','The Subduer'],['الْوَهَّاب','Al-Wahhab','The Bestower'],['الرَّزَّاق','Ar-Razzaq','The Provider'],['الْفَتَّاح','Al-Fattah','The Opener'],['الْعَلِيم','Al-‘Alim','The All-Knowing'],['الْقَابِض','Al-Qabid','The Withholder'],
['الْبَاسِط','Al-Basit','The Extender'],['الْخَافِض','Al-Khafid','The Abaser'],['الرَّافِع','Ar-Rafi‘','The Exalter'],['الْمُعِزّ','Al-Mu‘izz','The Giver of Honour'],['الْمُذِلّ','Al-Mudhill','The Humbler'],['السَّمِيع','As-Sami‘','The All-Hearing'],['الْبَصِير','Al-Basir','The All-Seeing'],['الْحَكَم','Al-Hakam','The Judge'],['الْعَدْل','Al-‘Adl','The Just'],['اللَّطِيف','Al-Latif','The Subtle, the Kind'],
['الْخَبِير','Al-Khabir','The All-Aware'],['الْحَلِيم','Al-Halim','The Forbearing'],['الْعَظِيم','Al-‘Azim','The Magnificent'],['الْغَفُور','Al-Ghafur','The Forgiving'],['الشَّكُور','Ash-Shakur','The Appreciative'],['الْعَلِيّ','Al-‘Ali','The Most High'],['الْكَبِير','Al-Kabir','The Great'],['الْحَفِيظ','Al-Hafiz','The Preserver'],['الْمُقِيت','Al-Muqit','The Sustainer'],['الْحَسِيب','Al-Hasib','The Reckoner'],
['الْجَلِيل','Al-Jalil','The Majestic'],['الْكَرِيم','Al-Karim','The Generous'],['الرَّقِيب','Ar-Raqib','The Watchful'],['الْمُجِيب','Al-Mujib','The Responsive'],['الْوَاسِع','Al-Wasi‘','The All-Encompassing'],['الْحَكِيم','Al-Hakim','The Wise'],['الْوَدُود','Al-Wadud','The Loving'],['الْمَجِيد','Al-Majid','The Glorious'],['الْبَاعِث','Al-Ba‘ith','The Resurrector'],['الشَّهِيد','Ash-Shahid','The Witness'],
['الْحَقّ','Al-Haqq','The Truth'],['الْوَكِيل','Al-Wakil','The Trustee'],['الْقَوِيّ','Al-Qawi','The Strong'],['الْمَتِين','Al-Matin','The Firm'],['الْوَلِيّ','Al-Wali','The Protecting Friend'],['الْحَمِيد','Al-Hamid','The Praiseworthy'],['الْمُحْصِي','Al-Muhsi','The Counter'],['الْمُبْدِئ','Al-Mubdi’','The Initiator'],['الْمُعِيد','Al-Mu‘id','The Restorer'],['الْمُحْيِي','Al-Muhyi','The Giver of Life'],
['الْمُمِيت','Al-Mumit','The Bringer of Death'],['الْحَيّ','Al-Hayy','The Ever-Living'],['الْقَيُّوم','Al-Qayyum','The Self-Sustaining'],['الْوَاجِد','Al-Wajid','The Finder'],['الْمَاجِد','Al-Majid','The Noble'],['الْوَاحِد','Al-Wahid','The One'],['الْأَحَد','Al-Ahad','The Unique'],['الصَّمَد','As-Samad','The Eternal Refuge'],['الْقَادِر','Al-Qadir','The Capable'],['الْمُقْتَدِر','Al-Muqtadir','The All-Powerful'],
['الْمُقَدِّم','Al-Muqaddim','The Expediter'],['الْمُؤَخِّر','Al-Mu’akhkhir','The Delayer'],['الْأَوَّل','Al-Awwal','The First'],['الْآخِر','Al-Akhir','The Last'],['الظَّاهِر','Az-Zahir','The Manifest'],['الْبَاطِن','Al-Batin','The Hidden'],['الْوَالِي','Al-Wali','The Governor'],['الْمُتَعَالِي','Al-Muta‘ali','The Most Exalted'],['الْبَرّ','Al-Barr','The Source of Goodness'],['التَّوَّاب','At-Tawwab','The Acceptor of Repentance'],
['الْمُنْتَقِم','Al-Muntaqim','The Avenger'],['الْعَفُوّ','Al-‘Afuw','The Pardoner'],['الرَّؤُوف','Ar-Ra’uf','The Most Kind'],['مَالِكُ الْمُلْك','Malik-ul-Mulk','Owner of All Sovereignty'],['ذُو الْجَلَالِ وَالْإِكْرَام','Dhul-Jalali wal-Ikram','Lord of Majesty and Honour'],['الْمُقْسِط','Al-Muqsit','The Equitable'],['الْجَامِع','Al-Jami‘','The Gatherer'],['الْغَنِيّ','Al-Ghani','The Self-Sufficient'],['الْمُغْنِي','Al-Mughni','The Enricher'],['الْمَانِع','Al-Mani‘','The Preventer'],
['الضَّارّ','Ad-Darr','The Distresser'],['النَّافِع','An-Nafi‘','The Benefactor'],['النُّور','An-Nur','The Light'],['الْهَادِي','Al-Hadi','The Guide'],['الْبَدِيع','Al-Badi‘','The Incomparable Originator'],['الْبَاقِي','Al-Baqi','The Everlasting'],['الْوَارِث','Al-Warith','The Inheritor'],['الرَّشِيد','Ar-Rashid','The Guide to the Right Path'],['الصَّبُور','As-Sabur','The Patient']];
/* The medallion on More shows one name at a time; a tap moves to the next, the sheet lists all 99. */
const medal=$('#medal'); let ni=clamp(store.get('nm',0),0,98);
function drawMedal(){const n=NM[ni];medal.setAttribute('aria-label',(ni+1)+' of 99: '+n[1]+', '+n[2]+'. Show the next name');
  $('#mdA').textContent=n[0]; $('#mdA').classList.toggle('long',n[0].length>12); $('#mdB').textContent=n[1]; $('#mdS').textContent=n[2]; $('#mdN').textContent=(ni+1)+' / 99'}
medal.addEventListener('click',()=>{ni=(ni+1)%NM.length;store.set('nm',ni);blip(740,.08,.04);buzz(6);
  if(calm) return drawMedal(); medal.classList.remove('turn'); void medal.offsetWidth; medal.classList.add('turn'); setTimeout(drawMedal,180)});
drawMedal();
function namesSheet(){
  openSheet('allnames','<div class="shead"><div><h2>The 99 Names</h2><p>Al-Asmāʾ al-Ḥusnā. Tap a name to show it on the medallion.</p></div><div class="x" lang="ar" dir="rtl">الأسماء الحسنى</div></div><div class="ngrid">'
    +NM.map((n,k)=>'<button class="nm press" data-nm="'+k+'"'+(k===ni?' aria-current="true"':'')+'><small>'+(k+1)+'</small><span class="a" lang="ar" dir="rtl">'+n[0]+'</span><b>'+n[1]+'</b><span>'+n[2]+'</span></button>').join('')+'</div>');
}
sbody.addEventListener('click',e=>{const b=e.target.closest('[data-nm]');if(!b)return;ni=+b.dataset.nm;store.set('nm',ni);drawMedal();closeSheet()});

/* ---------- More ---------- */
const MI={ask:'<path d="M12 6c-2-1.6-4.7-2-8-2v14c3.3 0 6 .4 8 2 2-1.6 4.7-2 8-2V4c-3.3 0-6 .4-8 2zM12 6v14"/>',
  duas:'<path d="M8 21v-6.5L5.5 9.8a1.3 1.3 0 0 1 2.2-1.3L10 12V5.5a1.2 1.2 0 0 1 2.4 0V12M16 21v-6.5l2.5-4.7a1.3 1.3 0 0 0-2.2-1.3L14 12V5.5a1.2 1.2 0 0 0-2.4 0"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
  zakat:'<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4M5 14v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4"/>',
  places:'<path d="M4 20V10.5L12 4l8 6.5V20M9.5 20v-4.5a2.5 2.5 0 0 1 5 0V20M3 20h18"/>',
  hajj:'<path d="M5 8l7-3 7 3v11l-7 2-7-2zM5 8l7 3 7-3M12 11v10M5 12.5l7 3 7-3"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'};
const MORE=[['ask','Ask Iqra','Questions about Islam, with sources'],['duas','Duas','From the Quran and authentic Sunnah'],['calendar','Hijri Calendar','This month and important dates'],['zakat','Zakat','Calculate and learn about giving'],['places','Mosques & Halal Food','Find nearby mosques and halal options'],['hajj','Hajj & Umrah','The rites, step by step'],['settings','Settings','City, calculation method, sounds']];
// Ask Iqra needs Claude, which the store apps don't have, so they leave it out.
$('#mrows').innerHTML=MORE.filter(r=>!(NATIVE&&r[0]==='ask')).map(r=>'<button class="drow press" data-sheet="'+r[0]+'"><svg class="mi" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+MI[r[0]]+'</svg><span class="m"><b>'+r[1]+'</b><span>'+r[2]+'</span></span>'+CH+'</button>').join('');
const num=n=>Math.round(n).toLocaleString('en-US');
const gdate=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});

/* Duas */
const DQ=[['For good in this life and the next',2,201],['For a steadfast heart',3,8],['For patience and firm footing',3,147],['A prayer of repentance',7,23],['For keeping up prayer',14,40],['For parents and all believers',14,41],['For mercy on parents',17,24],['For knowledge',20,114],['In hardship',21,87],['For forgiveness and mercy',23,118],['For family',25,74],['For relief from burdens',2,286]];
const DD=[['Before sleeping','بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا','In Your name, O Allah, I die and I live.','Sahih al-Bukhari'],['On waking','الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ','All praise is for Allah, who gave us life after He caused us to die, and to Him is the resurrection.','Sahih al-Bukhari'],
 ['Entering the mosque','اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ','O Allah, open for me the gates of Your mercy.','Sahih Muslim'],['Leaving the mosque','اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ','O Allah, I ask You of Your bounty.','Sahih Muslim'],
 ['Before eating','بِسْمِ اللَّهِ','In the name of Allah.','Sunan Abi Dawud, Jami‘ at-Tirmidhi'],['After eating','الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ','All praise is for Allah, who fed me this and provided it for me without any might or power from me.','Sunan Abi Dawud, Jami‘ at-Tirmidhi']];
function duaSheet(){
  const item=(t,a,e,src)=>'<div class="dua"><b>'+t+'</b><div class="a" lang="ar" dir="rtl">'+a+'</div><div class="e">'+esc(e)+'</div><small>'+src+'</small></div>';
  let h='<h2>Duas</h2><h3>Through the day</h3><div>'+DD.map(d=>item(d[0],d[1],d[2],d[3])).join('')+'</div><h3>From the Quran</h3>';
  h+=QD?'<div>'+DQ.map(d=>item(d[0],QD.a[d[1]-1][d[2]-1],EN[d[1]-1][d[2]-1],sname(d[1]-1)+' '+d[1]+':'+d[2])).join('')+'</div>':'<p>The Quranic duas appear once the Quran text has loaded.</p>';
  openSheet('duas',h);
}

/* Hijri calendar */
const EVS={'1-1':'Islamic New Year','1-10':'Ashura','3-12':'Mawlid an-Nabi','7-27':'Isra and Miʻraj','8-15':'Mid-Shaʻban','9-1':'Ramadan begins','9-27':'Laylat al-Qadr (27th night)','10-1':'Eid al-Fitr','12-9':'Day of Arafah','12-10':'Eid al-Adha'};
let calA=null, evC=null, evKey='';
const DAY=864e5, todayUTC=()=>{const c=cityNow();return Date.UTC(c.y,c.m-1,c.d,12)};
function calSheet(){
  const t0=todayUTC(); if(calA===null) calA=t0; const h=hijri(new Date(calA));
  if(!h) return openSheet('hcal','<h2>Hijri Calendar</h2><p>This browser cannot show the Islamic calendar. Try a current version of Chrome, Safari or Edge.</p>');
  let start=calA-(h.d-1)*DAY; const days=[]; for(let i=0;i<31;i++){const x=hijri(new Date(start+i*DAY));if(!x||x.m!==h.m)break;days.push(start+i*DAY)}
  let g='<div class="cal">'+['S','M','T','W','T','F','S'].map(d=>'<span>'+d+'</span>').join('')+(new Date(start).getUTCDay()?'<div style="grid-column:span '+new Date(start).getUTCDay()+';aspect-ratio:auto"></div>':'');
  days.forEach((d,i)=>{g+='<div'+(d===t0?' class="tod"':'')+'>'+(i+1)+'<small>'+new Date(d).getUTCDate()+'</small></div>'}); g+='</div>';
  if(evKey!==dayKey){evKey=dayKey;evC=[];const seen={};for(let i=0;i<386;i++){const x=hijri(new Date(t0+i*DAY)),k=x&&x.m+'-'+x.d;if(k&&EVS[k]&&!seen[k]){seen[k]=1;evC.push([EVS[k],t0+i*DAY,i])}}}
  const ev=evC.map(e=>'<div class="ev"><b>'+e[0]+'</b><span>'+gdate.format(new Date(e[1]))+'<br>'+(e[2]===0?'today':e[2]===1?'tomorrow':'in '+e[2]+' days')+'</span></div>').join('');
  openSheet('hcal','<h2>Hijri Calendar</h2><div class="calhead"><button data-act="cal" data-d="-1" aria-label="Previous month"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg></button><b>'+HM[h.m-1]+' '+h.y+'</b><button data-act="cal" data-d="1" aria-label="Next month"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg></button></div>'
    +g+'<h3>Coming up</h3><div>'+ev+'</div><p>Dates follow the Umm al-Qura calendar. Your local moon sighting may differ by a day.</p>');
  sbody.dataset.s=start; sbody.dataset.e=days[days.length-1];
}

/* Zakat */
const ZF=[['cash','Cash and savings'],['gold','Gold and silver (value)'],['inv','Investments and shares'],['biz','Business goods for sale'],['debt','Debts you owe now (subtracted)']];
function zakSheet(){
  const z=store.get('zk',{});
  openSheet('zak','<h2>Zakat</h2><p>Enter amounts in your own currency. Zakat is 2.5% of what you have held for a lunar year above the nisab.</p>'
   +ZF.map(f=>'<div class="field"><label for="z_'+f[0]+'">'+f[1]+'</label><input id="z_'+f[0]+'" type="number" inputmode="decimal" min="0" value="'+(z[f[0]]||'')+'" placeholder="0"></div>').join('')
   +'<div class="field"><label for="z_gp">Gold price per gram today</label><input id="z_gp" type="number" inputmode="decimal" min="0" value="'+(z.gp||'')+'" placeholder="Optional"><small>Used to check the nisab, which is the value of 85 g of gold.</small></div>'
   +'<div class="due"><span>Zakat due</span><b id="zdue">0</b></div><p id="znote"></p>');
  zakCalc();
}
function zakCalc(){
  const z={}, v=k=>Math.max(0,parseFloat($('#z_'+k).value)||0); ZF.forEach(f=>z[f[0]]=v(f[0])); z.gp=v('gp'); store.set('zk',z);
  const net=Math.max(0,z.cash+z.gold+z.inv+z.biz-z.debt), nisab=z.gp*85, below=nisab>0&&net<nisab;
  $('#zdue').textContent=num(below?0:net*.025);
  $('#znote').textContent=!net?'Add your amounts to see what is due.':below?'Your zakatable wealth of '+num(net)+' is below the nisab of '+num(nisab)+', so no Zakat is due.':nisab>0?'On '+num(net)+' of zakatable wealth, above the nisab of '+num(nisab)+'.':'On '+num(net)+' of zakatable wealth. Add today’s gold price to check it against the nisab.';
}

/* Places */
function placeSheet(){
  const L=loc(), at2='@'+L.lat.toFixed(2)+','+L.lng.toFixed(2)+',13z';
  openSheet('places','<h2>Nearby</h2><p>These open Google Maps around '+esc(L.name)+'. Change your city in Settings.</p>'
   +'<a class="pill solid" href="https://www.google.com/maps/search/mosque/'+at2+'" target="_blank" rel="noopener">Find mosques</a>'
   +'<a class="pill" href="https://www.google.com/maps/search/halal+restaurant/'+at2+'" target="_blank" rel="noopener">Find halal food</a>'
   +'<p>Iqra does not rate or verify these places. Check halal certification with the restaurant.</p>');
}

/* Hajj and Umrah */
function hajjSheet(){
  const li=x=>'<li><b>'+x[0]+'</b><span>'+x[1]+'</span></li>';
  openSheet('hajj','<h2>Hajj &amp; Umrah</h2><h3>Umrah</h3><ol class="steps">'+[
   ['Ihram','At the miqat, make the intention for Umrah, put on ihram and begin the talbiyah: Labbayk Allahumma labbayk.'],
   ['Tawaf','Circle the Kaaba seven times, anticlockwise, starting at the Black Stone. Then pray two rak‘ahs behind Maqam Ibrahim if you can.'],
   ['Sa‘i','Walk seven times between Safa and Marwah, starting at Safa and ending at Marwah.'],
   ['Halq or Taqsir','Men shave or shorten the hair; women trim a fingertip’s length. This ends the state of ihram.']].map(li).join('')
  +'</ol><h3>Hajj</h3><ol class="steps">'+[
   ['8th Dhuʻl-Hijjah · Mina','Enter ihram for Hajj and go to Mina. Pray there from Dhuhr through to Fajr, shortening the four-rak‘ah prayers.'],
   ['9th · Arafah','After sunrise go to Arafah and stand in supplication from midday until sunset. This standing is the heart of Hajj.'],
   ['Night of the 9th · Muzdalifah','After sunset go to Muzdalifah, pray Maghrib and Isha together, rest, and gather pebbles.'],
   ['10th · Day of Sacrifice','Stone the large pillar with seven pebbles, offer the sacrifice, shave or trim the hair, then go to Makkah for Tawaf al-Ifadah and Sa‘i.'],
   ['11th to 13th · Days of Tashriq','Stay in Mina and stone all three pillars each day after midday. You may leave after the 12th.'],
   ['Farewell Tawaf','Before leaving Makkah, make a final tawaf of the Kaaba.']].map(li).join('')
  +'</ol><p>This is a summary. Details differ between schools of thought, so follow the scholar guiding your group.</p>');
}

/* Settings */
function setSheet(){
  const opt=(v,t,sel)=>'<option value="'+v+'"'+(sel?' selected':'')+'>'+t+'</option>';
  openSheet('set','<h2>Settings</h2>'
   +'<div class="field"><label for="s_city">City</label><select id="s_city">'+(ST.custom?opt('me','My location',true):'')+CITIES.map((c,i)=>opt(i,c[0]+', '+c[1],!ST.custom&&i===ST.city)).join('')+'</select></div>'
   +'<button class="pill" data-act="geo">Use my location</button>'
   +'<div class="field"><label for="s_method">Calculation method</label><select id="s_method">'+Object.keys(METHODS).map(k=>opt(k,METHODS[k][0],k===ST.method)).join('')+'</select><small>Sets the sun angles for Fajr and Isha. Pick the one your local mosque follows.</small></div>'
   +'<div class="field"><label for="s_asr">Asr time</label><select id="s_asr">'+opt(1,'Standard (Shafi‘i, Maliki, Hanbali)',ST.asr===1)+opt(2,'Hanafi',ST.asr===2)+'</select></div>'
   +'<button class="swrow" role="switch" aria-checked="'+(ST.adhan!==false)+'" data-act="adhan"><span>Play the adhan at prayer times</span><i class="sw"></i></button>'
   +'<button class="swrow" role="switch" aria-checked="'+ST.sound+'" data-act="sound"><span>Sound effects</span><i class="sw"></i></button>'
   +'<button class="swrow" role="switch" aria-checked="'+(ST.wudu!==false)+'" data-act="wudu"><span>Wudu reminder 5 minutes before each prayer</span><i class="sw"></i></button>'
   +'<p>'+(NATIVE?'The bell beside each prayer on Today cycles between the adhan, a notification and silent. Iqra notifies you at prayer times even when the app is closed.':'The speaker beside each prayer on Today cycles between the adhan, a notification and silent. Iqra can only sound while it is open on your screen.')+'</p>'
   +'<button class="pill" id="adprev" data-act="adprev">Preview the adhan</button><button class="pill" data-act="notif">Allow notifications</button>'
   +'<h3>About</h3><p>Prayer times are calculated from the sun’s position for your city and method. Check them against your local mosque.</p><p>Arabic text: Tanzil Uthmani, tanzil.net. Translation: Marmaduke Pickthall (1930). Both served through alquran.cloud.</p><p>Adhan recording: “Beautiful adhan” by Adam-synagda, Wikimedia Commons, released under CC0.</p><p>Your city, bookmarks and counts are saved on this device only.</p>');
}
function applyLoc(msg){computeDay();paintAyah();if(sheetKind==='set')setSheet();toast(msg)}

/* Ask Iqra */
const RULES='You are Iqra, a careful assistant inside a Muslim prayer and Quran app. Answer questions about Islam accurately and briefly, in at most 170 words. Ground answers in the Quran, citing verses as (surah:ayah), and in well-known hadith, naming the collection. Where the schools of thought differ, say so in one line. Do not issue personal fatwas; for rulings on someone’s own circumstances, tell them to ask a qualified scholar. If a question is not about Islam or Muslim life, say that this is outside what you help with. Reply in plain text with no markdown, in the language of the question.';
const ASKQ=['What breaks the fast in Ramadan?','How do I pray Witr?','What is the reward for reading Surah Al-Kahf on Friday?','When is Zakat due?'];
let askTurns=[], askCtl=null, sampleFn, busy=false;
async function getSample(){ if(sampleFn!==undefined) return sampleFn; try{sampleFn=(window.claude&&window.claude.use)?await window.claude.use('sample'):null}catch(e){sampleFn=null} return sampleFn }
const askErr=c=>({not_granted:1,sampling_disabled:1,not_declared:1,capability_disabled:1,capability_removed:1}[c]?'Ask Iqra needs permission to use Claude, and it wasn’t given in this view.':c==='rate_limited'?'That’s a lot of questions for now. Try again in a little while.':c==='refused'?'Iqra can’t answer that one. Try asking it another way.':c==='session_expired'?'Sign in to Claude again, then ask once more.':'Something went wrong reaching Claude. Try again.');
function askSheet(){
  openSheet('ask','<h2>Ask Iqra</h2><p>Answers draw on the Quran and well-known hadith. For a ruling on your own situation, ask a qualified scholar.</p><div class="chat" id="chat">'
   +askTurns.map(t=>'<div class="msg '+(t.role==='user'?'u':'a')+'">'+esc(t.content)+'</div>').join('')+'</div><div class="sugg" id="sugg">'+(askTurns.length?'':ASKQ.map(x=>'<button class="chip" data-act="sugg">'+x+'</button>').join(''))+'</div>'
   +'<form class="askbar" id="askf"><textarea id="askq" rows="1" placeholder="Ask about Islam" aria-label="Your question"></textarea><button id="asksend" aria-label="Send question"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"></path></svg></button></form>');
  getSample().then(s=>{ if(!s&&sheetKind==='ask'&&!askTurns.length){$('#sugg').innerHTML='';$('#chat').innerHTML='<div class="msg a">'+(window.claude?'Ask Iqra uses Claude to answer, and Claude isn’t available in this view. Open Iqra from its Claude link while signed in to use it.':'Ask Iqra isn’t available on the web version yet. Everything else in Iqra works here: prayer times, the Quran, Qibla, Tasbih, duas and more.')+'</div>';$('#askq').disabled=true;$('#asksend').disabled=true} });
}
async function ask(text){
  text=text.trim(); if(!text||busy) return; busy=true; const chat=$('#chat'); $('#sugg').innerHTML=''; $('#askq').value=''; $('#askq').style.height=''; $('#asksend').disabled=true;
  chat.insertAdjacentHTML('beforeend','<div class="msg u">'+esc(text)+'</div><div class="msg a wait">Thinking…</div>'); const out=chat.lastChild; sbody.scrollTop=sbody.scrollHeight;
  askTurns.push({role:'user',content:text}); if(askTurns.length>12) askTurns=askTurns.slice(-12);
  try{
    const s=await getSample(); if(!s) throw {code:'not_granted'};
    askCtl=new AbortController();
    const r=await s([{role:'user',content:RULES}].concat(askTurns),{cache:false,signal:askCtl.signal,onText:u=>{out.classList.remove('wait');out.textContent=u.text;if(sheetKind==='ask')sbody.scrollTop=sbody.scrollHeight}});
    out.classList.remove('wait'); out.textContent=r.text; askTurns.push({role:'assistant',content:r.text});
  }catch(e){
    askTurns.pop(); out.classList.remove('wait');
    if(e&&e.code==='cancelled') out.remove(); else out.textContent=(e&&e.text?e.text+'\n\n':'')+askErr(e&&e.code);
  }
  askCtl=null; busy=false; const b=$('#asksend'); if(b) b.disabled=false;
}

/* ---------- Routing: every tap inside the phone ---------- */
const SHEETS={names:namesSheet,ask:askSheet,duas:duaSheet,calendar:calSheet,zakat:zakSheet,places:placeSheet,hajj:hajjSheet,settings:setSheet};
phone.addEventListener('click',e=>{
  const sr=e.target.closest('[data-surah]'); if(sr) return openSurah(+sr.dataset.surah,+sr.dataset.ayah||1);
  const sh=e.target.closest('[data-sheet]'); if(sh){ if(sh.dataset.sheet==='calendar') calA=null; return SHEETS[sh.dataset.sheet]() }
  const a=e.target.closest('[data-act]'); if(!a) return; const act=a.dataset.act;
  if(act==='follow'){ if(folT) stopFollow(); else startFollow(); blip(700,.06,.03) }
  else if(act==='tr'){ ST.tr=!ST.tr; saveST(); a.setAttribute('aria-pressed',ST.tr); sbody.classList.toggle('notr',!ST.tr) }
  else if(act==='az'){ ST.az=clamp(ST.az+ +a.dataset.d,20,44); saveST(); sbody.style.setProperty('--az',ST.az) }
  else if(act==='bm'){ const key=curS+':'+a.closest('.vs').dataset.a, i=BM.indexOf(key); if(i<0){BM.unshift(key);const p=at(a);burst(p[0],p[1],8,'#FFD98A',2);blip(990,.15,.04);toast('Bookmarked '+sname(curS-1)+' '+key,1600)}else BM.splice(i,1); store.set('bm',BM); a.setAttribute('aria-pressed',i<0); if(segMode==='bm') listSurahs() }
  else if(act==='cal'){ calA=+a.dataset.d<0?+sbody.dataset.s-DAY:+sbody.dataset.e+DAY; calSheet() }
  else if(act==='sugg'){ ask(a.textContent) }
  else if(act==='sound'){ ST.sound=!ST.sound; saveST(); a.setAttribute('aria-checked',ST.sound); blip(880,.08,.04) }
  else if(act==='geo'){
    if(!navigator.geolocation) return toast('Location isn’t available here. Choose your city instead.');
    a.disabled=true; a.textContent='Finding you…';
    navigator.geolocation.getCurrentPosition(p=>{ST.custom={name:'My location',lat:p.coords.latitude,lng:p.coords.longitude,tz:null};saveST();applyLoc('Prayer times now follow your location.')},
      ()=>{a.disabled=false;a.textContent='Use my location';toast('Location isn’t available here. Choose your city instead.')},{timeout:8000,maximumAge:6e5});
  }
});
sbody.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='s_city'){ if(t.value!=='me'){ST.custom=null;ST.city=+t.value;saveST();applyLoc('Prayer times set for '+CITIES[ST.city][0]+'.')} }
  else if(t.id==='s_method'){ST.method=t.value;saveST();applyLoc('Calculation method updated.')}
  else if(t.id==='s_asr'){ST.asr=+t.value;saveST();applyLoc('Asr time updated.')}
});
sbody.addEventListener('input',e=>{
  if(sheetKind==='zak') zakCalc();
  else if(e.target.id==='askq'){e.target.style.height='auto';e.target.style.height=Math.min(120,e.target.scrollHeight)+'px'}
});
sbody.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='askf')ask($('#askq').value)});
sbody.addEventListener('keydown',e=>{if(e.target.id==='askq'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(e.target.value)}});

loadQuran();
