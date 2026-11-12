'use strict';
/* Iqra core: settings, prayer-time maths, the sky, Today, tabs, Qibla, Tasbih. */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const phone=$('#phone'), calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* True inside the iOS and Android apps (Capacitor injects its bridge before this script runs). */
const NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());

/* ---------- Saved state (this device only) ---------- */
const store={
  get(k,d){try{const v=localStorage.getItem('iqra.'+k);return v===null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem('iqra.'+k,JSON.stringify(v))}catch(e){}}
};

/* ---------- Sound, touch feedback, particles, toast ---------- */
let ac=null;
function blip(f,d,v,type){
  if(!ST.sound) return;
  try{ ac=ac||new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==='suspended') ac.resume();
    const o=ac.createOscillator(), g=ac.createGain(), t=ac.currentTime; o.type=type||'sine'; o.frequency.value=f;
    g.gain.setValueAtTime(v||.05,t); g.gain.exponentialRampToValueAtTime(.0001,t+(d||.08)); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+(d||.08));
  }catch(e){}
}
const chord=()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>blip(f,.7,.04),i*80));
const buzz=n=>{try{navigator.userActivation&&navigator.userActivation.hasBeenActive&&navigator.vibrate&&navigator.vibrate(n)}catch(e){}};
const fx=$('#fx'), fc=fx.getContext('2d'); let parts=[];
function at(el){const r=el.getBoundingClientRect(),p=phone.getBoundingClientRect();return [r.left-p.left+r.width/2,r.top-p.top+r.height/2]}
function burst(x,y,n,col,pow){ if(calm) return; for(let i=0;i<n;i++){const a=Math.random()*6.283,s=(Math.random()*.8+.3)*(pow||4);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,l:1,r:Math.random()*2.2+1,c:col||'#EAD4A7'})} }
let toastT=null;
function toast(msg,ms){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),ms||3200)}

/* ---------- Places and calculation methods ---------- */
const CITIES=[['Makkah','Saudi Arabia',21.4225,39.8262,'Asia/Riyadh'],['Madinah','Saudi Arabia',24.4672,39.6111,'Asia/Riyadh'],['Riyadh','Saudi Arabia',24.7136,46.6753,'Asia/Riyadh'],['Jeddah','Saudi Arabia',21.4858,39.1925,'Asia/Riyadh'],
 ['Dubai','UAE',25.2048,55.2708,'Asia/Dubai'],['Abu Dhabi','UAE',24.4539,54.3773,'Asia/Dubai'],['Doha','Qatar',25.2854,51.531,'Asia/Qatar'],['Kuwait City','Kuwait',29.3759,47.9774,'Asia/Kuwait'],['Muscat','Oman',23.588,58.3829,'Asia/Muscat'],
 ['Cairo','Egypt',30.0444,31.2357,'Africa/Cairo'],['Istanbul','Türkiye',41.0082,28.9784,'Europe/Istanbul'],['Amman','Jordan',31.9454,35.9284,'Asia/Amman'],['Baghdad','Iraq',33.3152,44.3661,'Asia/Baghdad'],['Tehran','Iran',35.6892,51.389,'Asia/Tehran'],
 ['Karachi','Pakistan',24.8607,67.0011,'Asia/Karachi'],['Lahore','Pakistan',31.5204,74.3587,'Asia/Karachi'],['Islamabad','Pakistan',33.6844,73.0479,'Asia/Karachi'],['Delhi','India',28.6139,77.209,'Asia/Kolkata'],['Mumbai','India',19.076,72.8777,'Asia/Kolkata'],['Hyderabad','India',17.385,78.4867,'Asia/Kolkata'],
 ['Dhaka','Bangladesh',23.8103,90.4125,'Asia/Dhaka'],['Kuala Lumpur','Malaysia',3.139,101.6869,'Asia/Kuala_Lumpur'],['Singapore','Singapore',1.3521,103.8198,'Asia/Singapore'],['Jakarta','Indonesia',-6.2088,106.8456,'Asia/Jakarta'],
 ['London','United Kingdom',51.5074,-.1278,'Europe/London'],['Birmingham','United Kingdom',52.4862,-1.8904,'Europe/London'],['Paris','France',48.8566,2.3522,'Europe/Paris'],['Berlin','Germany',52.52,13.405,'Europe/Berlin'],
 ['Toronto','Canada',43.6532,-79.3832,'America/Toronto'],['New York','USA',40.7128,-74.006,'America/New_York'],['Chicago','USA',41.8781,-87.6298,'America/Chicago'],['Houston','USA',29.7604,-95.3698,'America/Chicago'],
 ['San Francisco','USA',37.7749,-122.4194,'America/Los_Angeles'],['Los Angeles','USA',34.0522,-118.2437,'America/Los_Angeles'],['Sydney','Australia',-33.8688,151.2093,'Australia/Sydney'],
 ['Lagos','Nigeria',6.5244,3.3792,'Africa/Lagos'],['Casablanca','Morocco',33.5731,-7.5898,'Africa/Casablanca'],['Johannesburg','South Africa',-26.2041,28.0473,'Africa/Johannesburg']];
const METHODS={ISNA:['ISNA (North America)',15,15],MWL:['Muslim World League',18,17],EGY:['Egyptian General Authority',19.5,17.5],MAK:['Umm al-Qura (Makkah)',18.5,'90'],KAR:['University of Karachi',18,18]};
function guess(){
  let tz=''; try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
  let city=CITIES.findIndex(c=>c[4]===tz); const miss=city<0; if(miss) city=CITIES.findIndex(c=>c[0]==='Makkah');
  const z=CITIES[city][4], method=z.startsWith('America')?'ISNA':z==='Asia/Riyadh'?'MAK':/Karachi|Kolkata|Dhaka/.test(z)?'KAR':z.startsWith('Africa')?'EGY':'MWL';
  return {city,method,miss};
}
/* miss: the device's time zone matched none of the cities, so the opening asks for one instead of quietly showing Makkah. */
const GUESS=guess();
const ST=Object.assign({custom:null,asr:1,bells:[2,0,2,2,2],sunBell:0,sound:true,az:28,tr:true,wudu:true},{city:GUESS.city,method:GUESS.method},store.get('st',{}));
/* Alerts per prayer: 2 = adhan, 1 = notification only, 0 = silent. Older saves stored true/false. */
ST.bells=ST.bells.map(b=>b===true?2:b===false?0:clamp(+b||0,0,2));
const saveST=()=>store.set('st',ST);
const loc=()=>ST.custom||{name:CITIES[ST.city][0],lat:CITIES[ST.city][2],lng:CITIES[ST.city][3],tz:CITIES[ST.city][4]};

/* ---------- Prayer times (standard solar-position method) ---------- */
const D2R=Math.PI/180, dsin=d=>Math.sin(d*D2R), dcos=d=>Math.cos(d*D2R), dtan=d=>Math.tan(d*D2R);
const fix=(a,b)=>{a-=b*Math.floor(a/b);return a<0?a+b:a};
function julian(y,m,d){if(m<=2){y-=1;m+=12}const A=Math.floor(y/100),B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5}
function sunAt(jd){
  const D=jd-2451545, g=fix(357.529+.98560028*D,360), q=fix(280.459+.98564736*D,360), L=fix(q+1.915*dsin(g)+.02*dsin(2*g),360), e=23.439-.00000036*D;
  const RA=Math.atan2(dcos(e)*dsin(L),dcos(L))/D2R/15;
  return {decl:Math.asin(dsin(e)*dsin(L))/D2R, eqt:q/15-fix(RA,24)};
}
function calcTimes(y,mo,d,lat,lng,tz,method,asrF){
  const jd=julian(y,mo,d)-lng/360, M=METHODS[method];
  const mid=t=>fix(12-sunAt(jd+t).eqt,24);
  const sat=(ang,t,ccw)=>{const dc=sunAt(jd+t).decl,x=(-dsin(ang)-dsin(dc)*dsin(lat))/(dcos(dc)*dcos(lat));if(Math.abs(x)>1)return NaN;const h=Math.acos(x)/D2R/15;return mid(t)+(ccw?-h:h)};
  const asrAt=t=>{const dc=sunAt(jd+t).decl;return sat(-Math.atan(1/(asrF+dtan(Math.abs(lat-dc))))/D2R,t,false)};
  let fajr=sat(M[1],5/24,true), rise=sat(.833,6/24,true), dhuhr=mid(.5), asr=asrAt(13/24), set=sat(.833,18/24,false), isha=typeof M[2]==='number'?sat(M[2],18/24,false):NaN;
  const night=rise+24-set;
  { const p=M[1]/60*night; if(isNaN(fajr)||rise-fajr>p) fajr=rise-p; }
  if(typeof M[2]==='number'){ const p=M[2]/60*night; if(isNaN(isha)||isha-set>p) isha=set+p; } else isha=set+1.5;
  return [fajr,rise,dhuhr,asr,set,isha].map(h=>Math.round(fix(h+tz-lng/15,24)*60));
}
/* UTC offset of a time zone at a given instant, so days across a clock change get their own offset. */
function offAt(tz,ms){
  if(!tz) return -new Date(ms).getTimezoneOffset()/60;
  try{
    const p=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'}).formatToParts(new Date(ms)).reduce((o,x)=>(o[x.type]=+x.value,o),{});
    return Math.round((Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-Math.floor(ms/1000)*1000)/9e5)/4;
  }catch(e){return -new Date(ms).getTimezoneOffset()/60}
}
let offC=0, offAtT=-1e9;
function tzOffset(tz){ const now=Date.now(); if(now-offAtT<60000) return offC; offAtT=now; return offC=offAt(tz,now) }
function cityNow(){
  const off=tzOffset(loc().tz), d=new Date(Date.now()+off*36e5);
  return {y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate(),min:d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60,off,key:d.toISOString().slice(0,10),date:d};
}
const realNow=()=>cityNow().min;
const fmt=m=>{m=Math.round(m);const h=Math.floor(m/60)%24,mm=String(m%60).padStart(2,'0');return ((h+11)%12+1)+':'+mm+' '+(h<12?'AM':'PM')};
const HM=['Muharram','Safar','Rabiʻ I','Rabiʻ II','Jumada I','Jumada II','Rajab','Shaʻban','Ramadan','Shawwal','Dhuʻl-Qiʻdah','Dhuʻl-Hijjah'];
let hijF=null; try{hijF=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'numeric',year:'numeric',timeZone:'UTC'})}catch(e){}
function hijri(date){ if(!hijF) return null; try{const o={};for(const p of hijF.formatToParts(date)) if(p.type!=='literal') o[p.type]=parseInt(p.value,10); return (o.day&&o.month)?{d:o.day,m:o.month,y:o.year}:null}catch(e){return null} }
const gLong=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',timeZone:'UTC'}), gDay=new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'});
const hijStr=dt=>{const h=hijri(dt);return h?HM[h.m-1]+' '+h.d+', '+h.y+' AH':''};

/* ---------- The day: times, palette, Qibla ---------- */
const NAMES=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
let P=[], TM=[], RISE=405, SETT=1015, F0=331, F1=1103, FJ1=331, KF=[], dayKey='', bearing=0, qkm=0; // FJ1: tomorrow's Fajr
/* Sky keyframes: [top rgb, middle rgb, horizon rgb]. Heritage palette: ink and teal, warm only at the horizon. */
const PAL={N:[6,14,26,10,26,44,16,44,56],DAWN:[8,22,38,23,51,74,196,136,92],SUNR:[10,32,50,36,78,94,228,172,112],MORN:[8,34,50,18,66,78,120,150,136],DAY:[7,36,50,14,70,80,92,138,130],
  AFT:[9,32,48,22,64,78,180,152,104],SUNS:[10,20,38,58,50,70,230,138,78],DUSK:[7,15,28,22,38,60,118,80,70],ISHA:[6,13,24,12,28,46,30,50,62]};
function computeDay(){
  offAtT=-1e9; const c=cityNow(), L=loc(), tm=calcTimes(c.y,c.m,c.d,L.lat,L.lng,c.off,ST.method,ST.asr); TM=tm;
  P=[tm[0],tm[2],tm[3],tm[4],tm[5]].map((t,i)=>[NAMES[i],t]); RISE=tm[1]; SETT=tm[4]; F0=P[0][1]; F1=P[4][1]; dayKey=c.key;
  const pts=[[0,PAL.N],[F0-40,PAL.N],[F0,PAL.DAWN],[RISE,PAL.SUNR],[RISE+75,PAL.MORN],[P[1][1],PAL.DAY],[P[2][1],PAL.AFT],[SETT,PAL.SUNS],[SETT+(F1-SETT)*.55,PAL.DUSK],[F1,PAL.ISHA],[F1+80,PAL.N],[1440,PAL.N]];
  KF=[]; let last=-1; for(const p of pts){const t=clamp(p[0],last+1,1440);KF.push([t,p[1]]);last=t}
  const K=[21.4225,39.8262], dl=(K[1]-L.lng)*D2R;
  bearing=fix(Math.atan2(Math.sin(dl),dcos(L.lat)*dtan(K[0])-dsin(L.lat)*Math.cos(dl))/D2R,360);
  const a=dsin((K[0]-L.lat)/2)**2+dcos(L.lat)*dcos(K[0])*Math.sin(dl/2)**2; qkm=Math.round(12742*Math.asin(Math.sqrt(a)));
  $('#datetxt').textContent='Today, '+gLong.format(c.date); $('#hijtxt').textContent=hijStr(c.date);
  $('#loctxt').textContent=L.name; $('#methtxt').textContent=METHODS[ST.method][0];
  const dir=['north','north-north-east','north-east','east-north-east','east','east-south-east','south-east','south-south-east','south','south-south-west','south-west','west-south-west','west','west-north-west','north-west','north-north-west'][Math.round(bearing/22.5)%16];
  $('#qsub').textContent=qkm<5?'You are at the Kaaba.':'From '+L.name+', the Qibla lies '+Math.round(bearing)+'° from true north ('+dir+'). Makkah is '+qkm.toLocaleString('en-US')+' km away.';
  const kg=$('#kaaba'); if(kg) kg.setAttribute('transform','rotate('+bearing+' 150 150)');
  FJ1=timesFor(1)[0];
  actI=-1; paintDays(); paintRows(); tick();
}
function skyAt(m){m=clamp(m,0,1440);let i=1;while(i<KF.length-1&&KF[i][0]<m)i++;const a=KF[i-1],b=KF[i],t=(m-a[0])/((b[0]-a[0])||1);return a[1].map((v,k)=>v+(b[1][k]-v)*t)}

/* ---------- Sky: a fragment shader over dunes, with a painted fallback ---------- */
let scrub=null, T=0, dragRail=false, cur='today';
const sky=$('#sky'); let gl=null, U={}, s2=null, Wd=0, Ht=0, q=1, par={x:0,y:0}, parT={x:0,y:0}, hz=0, slow=0;
const FS=`precision highp float;
uniform vec2 R,S,P,MP;uniform float T,N,H,SV;uniform vec3 C0,C1,C2,SC;
float h1(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1.,0.)),f.x),mix(h1(i+vec2(0.,1.)),h1(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*ns(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){
 vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=vec2(uv.x*asp,uv.y);vec2 sp=vec2(S.x*asp,S.y);vec2 mp=vec2(MP.x*asp,MP.y);vec3 col;
 vec3 ink=vec3(.024,.07,.114);
 float hill=.012+.03*fbm(vec2(p.x*2.6+3.,1.));
 if(uv.y>H){
  float t=(uv.y-H)/(1.-H);
  col=mix(C2,C1,smoothstep(0.,.38,t));col=mix(col,C0,smoothstep(.28,1.,t));
  float d=distance(p,sp);
  col+=SC*(exp(-d*6.)*.22+exp(-d*22.)*.5)*SV;
  vec2 g=(p+P*.012)*70.;vec2 id=floor(g);float r=h1(id);vec2 f=fract(g)-.5+(vec2(h1(id+1.3),h1(id+2.7))-.5)*.6;
  float st=step(.945,r)*smoothstep(.09+.1*r,0.,length(f))*(.55+.45*sin(T*(1.+r*3.)+r*50.));
  col+=vec3(st)*vec3(1.,.95,.86)*N*smoothstep(.04,.2,t);
  float md=distance(p,mp);
  float moon=smoothstep(.034,.031,md)*(1.-smoothstep(.034,.029,distance(p,mp+vec2(.016,.01))));
  col+=vec3(.92,.84,.66)*exp(-md*10.)*.16*N;
  vec2 q=vec2(p.x*1.4+T*.008+P.x*.04,t*2.4+P.y*.02);
  float c=fbm(q*1.6+fbm(q+T*.006)*.9);
  float cov=smoothstep(.56,.82,c)*smoothstep(0.,.2,t)*(1.-smoothstep(.36,.6,t));
  col=mix(col,mix(SC,vec3(1.,.97,.9),.5)*1.15,smoothstep(.034,.03,d)*SV);
  col=mix(col,vec3(.96,.9,.76),moon*N);
  col=mix(col,mix(C1,C2,.4)*1.15+SC*exp(-d*2.4)*.25*SV,cov*.3);
  col=mix(col,ink*1.15+C2*.08,smoothstep(.003,0.,(uv.y-H)-hill)*.92);
 }else{
  float dy=H-uv.y;float t=dy/max(H,.001);
  col=mix(ink+C2*.1,ink*.7,smoothstep(0.,.5,t));
  for(int k=0;k<3;k++){float fk=float(k);float ry=.035+fk*.085+.035*fbm(vec2(p.x*(1.6+fk*.7)+fk*5.3,fk*2.));
   if(dy>ry) col=mix(col,ink*(.85-fk*.12)+C2*.03,.55);
   col+=mix(C2,vec3(.92,.8,.58),.6)*smoothstep(.005,0.,abs(dy-ry))*.07*(1.-fk*.3);}
  col+=SC*exp(-abs(p.x-sp.x)*4.)*exp(-dy*16.)*.14*SV;
 }
 col+=mix(C2,vec3(.92,.8,.58),.5)*exp(-abs(uv.y-H)*80.)*.16;
 vec2 v=uv-.5;col*=1.-dot(v,v)*.42;
 col+=(h1(gl_FragCoord.xy+fract(T))-.5)*.014;
 gl_FragColor=vec4(col,1.);
}`;
function initGL(){
  try{
    const g=sky.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'}); if(!g) return false;
    const mk=(t,src)=>{const s=g.createShader(t);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(s));return s};
    const pr=g.createProgram(); g.attachShader(pr,mk(g.VERTEX_SHADER,'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}')); g.attachShader(pr,mk(g.FRAGMENT_SHADER,FS)); g.linkProgram(pr);
    if(!g.getProgramParameter(pr,g.LINK_STATUS)) throw new Error('link'); g.useProgram(pr);
    g.bindBuffer(g.ARRAY_BUFFER,g.createBuffer()); g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),g.STATIC_DRAW);
    const l=g.getAttribLocation(pr,'a'); g.enableVertexAttribArray(l); g.vertexAttribPointer(l,2,g.FLOAT,false,0,0);
    for(const n of ['R','S','P','MP','T','N','H','SV','C0','C1','C2','SC']) U[n]=g.getUniformLocation(pr,n);
    gl=g; return true;
  }catch(e){gl=null;return false}
}
if(!initGL()) s2=sky.getContext('2d');
function size(){
  Wd=phone.clientWidth; Ht=phone.clientHeight; const r=Math.min(devicePixelRatio||1,2);
  fx.width=Wd*r; fx.height=Ht*r; fc.setTransform(r,0,0,r,0,0);
  const k=gl?Math.min(devicePixelRatio||1,1.5)*q:1; sky.width=Math.round(Wd*k); sky.height=Math.round(Ht*k);
  if(gl) gl.viewport(0,0,sky.width,sky.height);
}
const HZ={quran:.12,qibla:.4,tasbih:.44,more:.12};
function drawSky(t){
  const view=$('#v-'+cur), goal=Math.max(46,cur==='today'?rail.offsetTop+22-view.scrollTop:HZ[cur]*Ht-view.scrollTop*.6);
  hz=calm||!hz?goal:hz+(goal-hz)*.12;
  const c=skyAt(T), H=1-hz/Ht, g=(T-RISE)/((SETT-RISE)||1), el=Math.sin(Math.PI*clamp(g,-.35,1.35));
  const N=1-sstep(-.3,.12,el), sv=sstep(-.4,.04,el), w=sstep(0,.5,el);
  const sx=.14+.72*clamp(g,-.12,1.12)-par.x*.012, sy=H+(1-H)*(cur==='today'?.12:.36)*el;
  if(gl){
    gl.uniform2f(U.R,sky.width,sky.height); gl.uniform2f(U.S,sx,sy); gl.uniform2f(U.P,par.x,par.y); gl.uniform2f(U.MP,.76-par.x*.01,H+(1-H)*.5);
    gl.uniform1f(U.T,calm?0:t/1000); gl.uniform1f(U.N,N); gl.uniform1f(U.H,H); gl.uniform1f(U.SV,sv);
    gl.uniform3f(U.C0,c[0]/255,c[1]/255,c[2]/255); gl.uniform3f(U.C1,c[3]/255,c[4]/255,c[5]/255); gl.uniform3f(U.C2,c[6]/255,c[7]/255,c[8]/255);
    gl.uniform3f(U.SC,1,.72+.16*w,.42+.3*w); gl.drawArrays(gl.TRIANGLES,0,3);
  }else{
    const col=k=>'rgb('+Math.round(c[k])+','+Math.round(c[k+1])+','+Math.round(c[k+2])+')', gr=s2.createLinearGradient(0,0,0,hz);
    gr.addColorStop(0,col(0)); gr.addColorStop(.6,col(3)); gr.addColorStop(1,col(6)); s2.fillStyle=gr; s2.fillRect(0,0,Wd,hz);
    s2.fillStyle='#050F19'; s2.fillRect(0,hz,Wd,Ht-hz);
    const x=sx*Wd, y=(1-sy)*Ht, rg=s2.createRadialGradient(x,y,0,x,y,200); rg.addColorStop(0,'rgba(234,212,167,'+.45*sv+')'); rg.addColorStop(1,'rgba(234,212,167,0)'); s2.fillStyle=rg; s2.fillRect(0,0,Wd,hz);
  }
}
phone.addEventListener('pointermove',e=>{ if(e.pointerType!=='mouse') return; const r=phone.getBoundingClientRect(); parT.x=(e.clientX-r.left)/r.width*2-1; parT.y=(e.clientY-r.top)/r.height*2-1 });
phone.addEventListener('pointerleave',()=>{parT.x=0;parT.y=0});

/* ---------- Today: the horizon, the countdown, a week of days and the prayer list ---------- */
const SV_=(p,w)=>'<svg width="'+(w||20)+'" height="'+(w||20)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const ICON=[
  SV_('<path d="M3 18h18M6 18a6 6 0 0 1 12 0"></path><path d="M17.5 6.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6zM12 4v1.5"></path>'),
  SV_('<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 7v3M5.6 11.6l1.6 1.6M18.4 11.6l-1.6 1.6"></path>'),
  SV_('<circle cx="12" cy="12" r="4"></circle><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"></path>'),
  SV_('<circle cx="9" cy="9" r="3.2"></circle><path d="M9 3v1.4M3 9h1.4M4.8 4.8l1 1M13.2 4.8l-1 1"></path><path d="M8 19h9.5a3.5 3.5 0 0 0 0-7 4.5 4.5 0 0 0-8.4 1.6A2.8 2.8 0 0 0 8 19z"></path>'),
  SV_('<path d="M3 18h18M5 21h14M7 18a5 5 0 0 1 10 0"></path><path d="M12 9V5M9.5 7.5L12 5l2.5 2.5"></path>'),
  SV_('<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"></path>')];
const SND=[SV_('<path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2h-15M10 20a2 2 0 0 0 4 0M3 3l18 18"></path>'),
  SV_('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"></path>'),
  SV_('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"></path><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"></path>')];
const SNDL=['silent','notification only','adhan'];
const TICK='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
/* Rows: prayer index into P (Sunrise is -1). */
const ROWS=[[0,'Fajr'],[-1,'Sunrise'],[1,'Dhuhr'],[2,'Asr'],[3,'Maghrib'],[4,'Isha']];
$('#prows').innerHTML=ROWS.map((r,k)=>{const p=r[0];return '<li class="prow'+(p<0?' sun':'')+'" data-k="'+k+'">'
  +(p<0?'<span class="chk ghost"></span>':'<button class="chk" data-i="'+p+'" aria-pressed="false" aria-label="Mark '+r[1]+' as prayed"><i>'+TICK+'</i></button>')
  +'<span class="pn"><b>'+r[1]+'</b><span class="ic">'+ICON[k]+'</span><em class="badge"></em></span><time class="tt"></time>'
  +'<button class="snd" data-i="'+p+'" aria-label=""></button></li>'}).join('');
$('#track').insertAdjacentHTML('beforeend',[.1,.3,.5,.7,.9].map((u,i)=>'<i class="mk" style="left:'+u*100+'%" title="'+NAMES[i]+'"></i>').join(''));
const today=$('#v-today'), rail=$('#rail'), track=$('#track'), mks=$$('.mk'), prows=$$('.prow');
let actI=-1, nextI=0, shown='', lastMin=null, vOff=0, vKey='', badgeMin=-1;
const uOf=m=>{ if(m<F0||m>=F1) return .9; let i=0; while(i<3&&P[i+1][1]<=m) i++; return .1+.2*(i+(m-P[i][1])/((P[i+1][1]-P[i][1])||1)) };
const mOf=u=>{ u=clamp(u,.1,.9); const k=(u-.1)/.2, i=Math.min(3,Math.floor(k)); return P[i][1]+(k-i)*(P[i+1][1]-P[i][1]) };
function setName(n){ if(n===shown) return; shown=n; const el=$('#pname'); el.textContent=n; el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap') }
function paintRail(){
  const u=uOf(T); $('#thumb').style.transform='translateX('+u*track.clientWidth+'px)'; track.setAttribute('aria-valuenow',Math.round((u-.1)/.8*100)); track.setAttribute('aria-valuetext',fmt(T));
  let a=4; for(let i=0;i<5;i++) if(P[i][1]<=T) a=i; if(T<F0) a=4;
  if(a!==actI){actI=a;mks.forEach((c,i)=>c.classList.toggle('act',i===a));if(scrub!==null)blip(520+a*70,.07,.03)}
  if(scrub!==null){setName(P[a][0]);$('#clock').textContent=fmt(T)}else setName(P[nextI][0]);
}
function setOdo(el,str){
  if(el.dataset.len!=str.length){el.dataset.len=str.length;el.innerHTML=[...str].map(ch=>ch===':'?'<span class="sepc">:</span>':'<span class="od"><span class="strip">'+[0,1,2,3,4,5,6,7,8,9].map(d=>'<i>'+d+'</i>').join('')+'</span></span>').join('')}
  [...el.children].forEach((c,i)=>{if(c.className==='od')c.firstChild.style.transform='translateY('+(-str[i]*10)+'%)'});
  el.setAttribute('aria-label',str.replace(/^(\d+):(\d+):(\d+)$/,(m,h,mi,s)=>(+h?h+' hours ':'')+(+mi)+' minutes'));
}
function adhan(i){
  toast('It’s time for '+P[i][0],6000);
  [392,523,587,523,659,587,523].forEach((f,k)=>setTimeout(()=>blip(f,1.1,.06),k*520));
  buzz([60,80,60]);
}
function sunAlert(){ toast('Sunrise. The time for Fajr has ended.',6000); blip(660,.5,.05); buzz(40) }
const dur=w=>{w=Math.max(1,Math.round(w));const h=Math.floor(w/60),m=w%60;return 'in '+(h?h+'h ':'')+m+'m'};

/* A day in the strip, as an offset from today in the selected city. */
function dayInfo(off){const c=cityNow(), u=Date.UTC(c.y,c.m-1,c.d+off,12), dt=new Date(u);return {u,dt,y:dt.getUTCFullYear(),m:dt.getUTCMonth()+1,d:dt.getUTCDate(),key:dt.toISOString().slice(0,10)}}
function timesFor(off){
  if(off===0) return TM; const di=dayInfo(off), L=loc(), o=offAt(L.tz,di.u-tzOffset(L.tz)*36e5);
  return calcTimes(di.y,di.m,di.d,L.lat,L.lng,o,ST.method,ST.asr);
}
const prayedAll=()=>store.get('prayed',{});
$('#days').innerHTML=[-3,-2,-1,0,1,2,3].map(o=>'<button class="day" data-o="'+o+'" aria-pressed="false"><span class="ring"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17"></circle><circle class="pg" cx="20" cy="20" r="17" pathLength="100"></circle></svg><b></b></span><small></small></button>').join('');
function paintDays(){
  const all=prayedAll(), wd=new Intl.DateTimeFormat('en-US',{weekday:'narrow',timeZone:'UTC'}), wl=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'});
  $$('.day').forEach(b=>{const o=+b.dataset.o, di=dayInfo(o), n=(all[di.key]||[]).filter(Boolean).length;
    b.querySelector('b').textContent=di.d; b.querySelector('small').textContent=o===0?'Today':wd.format(di.dt);
    b.classList.toggle('tod',o===0); b.setAttribute('aria-pressed',o===vOff);
    b.setAttribute('aria-label',(o===0?'Today, ':'')+wl.format(di.dt)+(o<=0?', '+n+' of 5 prayed':''));
    b.querySelector('.pg').style.strokeDasharray=(o<=0?n*20:0)+' 100'});
}
function paintRows(){
  const di=dayInfo(vOff), t=timesFor(vOff), all=prayedAll(), done=all[di.key]||[], future=vOff>0; vKey=di.key;
  $('#vday').hidden=vOff===0; $('#vdaytxt').textContent='Times for '+gDay.format(di.dt)+', '+gLong.format(di.dt)+(hijri(di.dt)?' · '+hijStr(di.dt):'');
  const rowT=[t[0],t[1],t[2],t[3],t[4],t[5]];
  prows.forEach((row,k)=>{const p=ROWS[k][0];
    row.querySelector('.tt').textContent=fmt(rowT[k]);
    const s=p<0?ST.sunBell?1:0:ST.bells[p], sb=row.querySelector('.snd');
    sb.innerHTML=SND[s]; sb.dataset.s=s; sb.setAttribute('aria-label',ROWS[k][1]+' alert: '+SNDL[s]+'. Tap to change.');
    if(p>=0){const c=row.querySelector('.chk');c.setAttribute('aria-pressed',!!done[p]);c.setAttribute('aria-disabled',future);row.classList.toggle('done',!!done[p])}});
  const n=done.filter(Boolean).length;
  $('#ptxt').textContent=future?'Mark prayers on the day':n===5?'All five prayed, alhamdulillah':n+' of 5 prayed';
  badgeMin=-1; paintBadges();
}
function paintBadges(){
  const m=Math.floor(realNow()); if(m===badgeMin) return; badgeMin=m;
  const rowT=vOff===0?[TM[0],TM[1],TM[2],TM[3],TM[4],TM[5]]:null;
  let curK=-1, nxtK=-1;
  if(rowT){ for(let k=0;k<6;k++) if(rowT[k]<=m) curK=k; for(let k=0;k<6;k++) if(ROWS[k][0]>=0&&rowT[k]>m){nxtK=k;break} }
  prows.forEach((row,k)=>{const b=row.querySelector('.badge');
    const txt=k===curK?'Now':k===nxtK?dur(rowT[k]-m):'';
    b.textContent=txt; b.className='badge'+(k===curK?' is-now':k===nxtK?' soon':''); row.classList.toggle('cur',k===curK); row.classList.toggle('next',k===nxtK)});
}
function tick(){
  if(!P.length) return;
  const c=cityNow(); if(c.key!==dayKey){vOff=0;return computeDay()}
  // After Isha the next prayer is tomorrow's Fajr, which falls a minute or two off today's.
  const m=c.min; let ni=P.findIndex(p=>p[1]>m), wait, nt;
  if(ni<0){ni=0;nt=FJ1;wait=nt+1440-m}else{nt=P[ni][1];wait=nt-m} nextI=ni;
  const s=Math.max(0,Math.round(wait*60)), str=Math.floor(s/3600)+':'+String(Math.floor(s%3600/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
  setOdo($('#count'),str); $('#mini').textContent=P[ni][0]+' in '+str;
  $('#nextAt').textContent='at '+fmt(nt)+(m>P[4][1]?' tomorrow':'');
  mks.forEach((el,i)=>el.classList.toggle('next',i===ni));
  if(vOff===0) paintBadges();
  if(lastMin!==null){
    P.forEach((p,i)=>{ if(lastMin<p[1]&&m>=p[1]&&m-lastMin<5&&ST.bells[i]) adhan(i) });
    if(ST.sunBell&&lastMin<RISE&&m>=RISE&&m-lastMin<5) sunAlert();
    if(typeof preAlert==='function') preAlert(lastMin,m);
  }
  lastMin=m;
}
$('#days').addEventListener('click',e=>{const b=e.target.closest('.day');if(!b)return;vOff=+b.dataset.o;paintDays();paintRows();blip(700+vOff*30,.05,.03);buzz(5)});
$('#vday').addEventListener('click',()=>{vOff=0;paintDays();paintRows()});
$('#prows').addEventListener('click',e=>{
  const c=e.target.closest('.chk[data-i]');
  if(c){
    if(vOff>0) return toast('You can mark this prayer once its day comes.',2400);
    const all=prayedAll(), i=+c.dataset.i, d=all[vKey]||[false,false,false,false,false]; d[i]=!d[i]; all[vKey]=d;
    const keys=Object.keys(all).sort(); while(keys.length>120) delete all[keys.shift()];
    store.set('prayed',all); paintRows(); paintDays(); buzz(8);
    if(d[i]){const p=at(c);burst(p[0],p[1],12,'#EAD4A7',2.6);blip(660+i*60,.18,.05);if(d.every(Boolean)){chord();toast('All five prayed. May Allah accept them.',2600)}}else blip(300,.08,.04);
    return;
  }
  const sb=e.target.closest('.snd'); if(!sb) return; const i=+sb.dataset.i;
  let s; if(i<0){ST.sunBell=ST.sunBell?0:1;s=ST.sunBell}else{s=ST.bells[i]=(ST.bells[i]+2)%3}
  saveST(); paintRows(); buzz(8);
  const nm=i<0?'Sunrise':NAMES[i]; toast(s===2?'Adhan on for '+nm:s===1?nm+': notification only':nm+' is silent',1800);
  if(s){const p=at(sb);burst(p[0],p[1],8,'#EAD4A7',2.2);blip(1320,.2,.04)}else blip(300,.08,.04);
});
function setScrub(v){scrub=v;phone.classList.toggle('scrub',v!==null&&cur==='today')}
$('#nowBtn').addEventListener('click',()=>{setScrub(null);blip(520,.1,.04)});
function railTo(e){const r=track.getBoundingClientRect();T=mOf((e.clientX-r.left)/r.width);setScrub(T)}
track.addEventListener('pointerdown',e=>{dragRail=true;phone.classList.add('dragging');track.setPointerCapture(e.pointerId);railTo(e)});
track.addEventListener('pointermove',e=>{if(dragRail)railTo(e)});
const endRail=()=>{dragRail=false;phone.classList.remove('dragging')};
track.addEventListener('pointerup',endRail); track.addEventListener('pointercancel',endRail);
track.addEventListener('keydown',e=>{const d=e.key==='ArrowRight'?15:e.key==='ArrowLeft'?-15:0;if(d){e.preventDefault();setScrub(clamp((scrub===null?clamp(T,F0,F1):scrub)+d,F0,F1))}else if(e.key==='Escape')setScrub(null)});
today.addEventListener('scroll',()=>{today.style.setProperty('--s',clamp(today.scrollTop/170,0,1));phone.style.setProperty('--m',cur==='today'?clamp((today.scrollTop-160)/60,0,1):0)},{passive:true});

/* ---------- Tabs ---------- */
const tabs=$$('.tab'), order=tabs.map(t=>t.dataset.v);
function go(v){
  if(v===cur) return; const ni=order.indexOf(v), up=ni<order.indexOf(cur); cur=v;
  tabs.forEach((t,i)=>{t.setAttribute('aria-selected',i===ni);t.tabIndex=i===ni?0:-1}); $('#ind').style.transform='translateX('+ni*100+'%)';
  order.forEach((name,i)=>{const el=$('#v-'+name);el.classList.remove('enter');
    if(i===ni){el.style.setProperty('--dy',up?-1:1);void el.offsetWidth;el.style.setProperty('--dy',0);el.classList.add('on','enter')}else{el.classList.remove('on')}});
  phone.classList.toggle('scrub',scrub!==null&&v==='today'); phone.style.setProperty('--m',v==='today'?clamp((today.scrollTop-160)/60,0,1):0);
  if(v==='qibla'){hd=bearing+140;hv=0;seek=true}
  blip(880,.05,.025); buzz(5);
}
tabs.forEach(t=>t.addEventListener('click',()=>go(t.dataset.v)));
$('.tabs').addEventListener('keydown',e=>{const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!d)return;const i=(order.indexOf(cur)+d+5)%5;go(order[i]);tabs[i].focus()});

/* ---------- Qibla: a weighted dial with a magnetic lock ---------- */
let hd=140, hv=0, seek=false, grabA=null, tickA=0;
const wrap=a=>((a%360)+540)%360-180;
(function(){
  // Deep teal dial: double gold rim, fine degree ticks, a faint eight-point rosette and serif cardinals.
  let h='<defs><radialGradient id="dg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#0F4A46"/><stop offset=".6" stop-color="#0A2E33"/><stop offset="1" stop-color="#061A22"/></radialGradient></defs>'
    +'<circle cx="150" cy="150" r="148" fill="url(#dg)" stroke="#D5AB65" stroke-opacity=".75" stroke-width="1.5"></circle><circle cx="150" cy="150" r="143" fill="none" stroke="#EAD4A7" stroke-opacity=".22"></circle>'
    +'<g fill="none" stroke="#D5AB65" stroke-opacity=".16"><path d="M150 62 176 88H212V124L238 150 212 176V212H176L150 238 124 212H88V176L62 150 88 124V88H124Z"/><rect x="88" y="88" width="124" height="124" transform="rotate(45 150 150)"/><circle cx="150" cy="150" r="104" stroke-opacity=".28"/></g>';
  for(let a=0;a<360;a+=3){const big=a%30===0,mid=a%15===0;h+='<line x1="150" y1="12" x2="150" y2="'+(big?28:mid?21:17)+'" stroke="#EAD4A7" stroke-opacity="'+(big?.9:mid?.5:.22)+'" stroke-width="'+(big?1.5:1)+'" transform="rotate('+a+' 150 150)"></line>'}
  [['N',0],['E',90],['S',180],['W',270]].forEach(c=>{h+='<text x="150" y="54" text-anchor="middle" font-family="Cormorant Garamond,Georgia,serif" font-weight="600" font-size="22" fill="'+(c[0]==='N'?'#D5AB65':'#F8F2E5')+'" transform="rotate('+c[1]+' 150 150)">'+c[0]+'</text>'});
  [45,135,225,315].forEach(a=>{h+='<circle cx="150" cy="46" r="2" fill="#D5AB65" fill-opacity=".6" transform="rotate('+a+' 150 150)"></circle>'});
  h+='<g id="kaaba"><line x1="150" y1="104" x2="150" y2="64" stroke="#D5AB65" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1 6"></line><rect x="137" y="30" width="26" height="26" rx="5" fill="#06121D" stroke="#D5AB65" stroke-width="1.5"></rect><rect x="137" y="37" width="26" height="4" fill="#D5AB65"></rect></g>';
  $('#dial').innerHTML=h;
})();
const comp=$('#compass');
const ang=e=>{const r=comp.getBoundingClientRect();return Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)*180/Math.PI};
comp.addEventListener('pointerdown',e=>{grabA=ang(e);seek=false;hv=0;comp.setPointerCapture(e.pointerId)});
comp.addEventListener('pointermove',e=>{if(grabA===null)return;const a=ang(e),d=wrap(a-grabA);hd-=d;hv=-d;grabA=a});
comp.addEventListener('pointerup',()=>{grabA=null}); comp.addEventListener('pointercancel',()=>{grabA=null});
$('#find').addEventListener('click',()=>{seek=true;blip(520,.1,.04)});
function qibla(){
  if(grabA===null){
    const off=wrap(hd-bearing);
    if(calm&&seek){hd=bearing;hv=0;seek=false}
    else if(seek){hv+=-off*.022;hv*=.87;if(Math.abs(off)<.05&&Math.abs(hv)<.02){hd=bearing;hv=0;seek=false}}
    else{if(Math.abs(off)<12)hv+=-off*.016;hv*=.95}
    hd+=hv;
  }
  const step=Math.floor(hd/6); if(step!==tickA){tickA=step;if(Math.abs(hv)>.3||grabA!==null)blip(1800,.015,.012,'square')}
  $('#dial').style.transform='rotate('+(-hd)+'deg)';
  const ok=Math.abs(wrap(hd-bearing))<2.5&&Math.abs(hv)<.6;
  $('#deg').textContent=Math.round(((hd%360)+360)%360)+'°';
  if(ok!==phone.classList.contains('aligned')){phone.classList.toggle('aligned',ok);$('#qstat').textContent=ok?'You’re facing the Qibla':'Spin to find the Qibla';
    if(ok){const p=at(comp);burst(p[0],p[1]-comp.offsetHeight/2,28,'#EAD4A7',4);chord();buzz([10,40,20])}}
}

/* ---------- Tasbih: a ring of 33 beads ---------- */
const DH=[['سُبْحَانَ ٱللَّٰهِ','SubhanAllah · Glory be to Allah'],['ٱلْحَمْدُ لِلَّٰهِ','Alhamdulillah · All praise is for Allah'],['ٱللَّٰهُ أَكْبَرُ','Allahu Akbar · Allah is the Greatest']];
$('#beads').innerHTML=Array.from({length:33},(_, k)=>'<span class="b" style="--k:'+k+'"></span>').join('');
const beads=$$('.b'), TB=Object.assign({tc:0,round:0,total:0},store.get('tasbih',{})); let lock=false;
function showDhikr(anim){const d=$('#dhikr'),e=$('#dhikrEn'),p=DH[TB.round%3][1].split(' · ');d.textContent=DH[TB.round%3][0];e.innerHTML='<b></b><span></span>';e.firstChild.textContent=p[0];e.lastChild.textContent=p[1];if(anim)[d,e].forEach(x=>{x.classList.remove('swap');void x.offsetWidth;x.classList.add('swap')})}
function paintBeads(anim){
  const c=$('#tc');c.textContent=TB.tc;if(anim){c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop')}
  beads.forEach((b,k)=>{b.classList.toggle('on',k<TB.tc);b.classList.toggle('cur',k===TB.tc-1)});
  $('#total').textContent=TB.total?TB.total.toLocaleString('en-US')+' counted in total':'Tap the ring, or press Space, to count.';
  $('#bead').setAttribute('aria-label','Count one. '+TB.tc+' of 33');
  store.set('tasbih',TB);
}
$('#bead').addEventListener('click',()=>{
  if(lock) return; TB.tc++; TB.total++; paintBeads(true); blip(420+TB.tc*14,.09,.05); buzz(8);
  const r=document.createElement('span');r.className='rip';$('.core').appendChild(r);setTimeout(()=>r.remove(),800);
  const cb=beads[TB.tc-1]; if(cb){const p=at(cb);burst(p[0],p[1],4,'#EAD4A7',1.6)}
  if(TB.tc===33){lock=true;chord();buzz([15,50,15,50,30]);const p=at($('#bead'));burst(p[0],p[1],70,'#EAD4A7',6);burst(p[0],p[1],30,'#F8F2E5',4);
    beads.forEach(b=>{b.classList.remove('cur');b.classList.add('cheer')});
    setTimeout(()=>{beads.forEach(b=>b.classList.remove('cheer'));TB.tc=0;TB.round++;paintBeads(true);showDhikr(true);lock=false},1400)}
});
// Reset wipes the lifetime total too, so it asks for a second tap within three seconds.
let rsT=0;
$('#reset').addEventListener('click',()=>{
  const b=$('#reset');
  if(!rsT&&TB.total){b.textContent='Tap again to reset';b.classList.add('arm');rsT=setTimeout(()=>{rsT=0;b.textContent='Reset';b.classList.remove('arm')},3000);return}
  clearTimeout(rsT);rsT=0;b.textContent='Reset';b.classList.remove('arm');
  TB.tc=0;TB.round=0;TB.total=0;paintBeads(true);showDhikr(true);blip(300,.1,.04)});
showDhikr(false); paintBeads(false);

/* ---------- Loop ---------- */
let lastF=0, nF=0;
function frame(t){
  if(gl&&lastF){slow+=t-lastF>34?1:0;if(++nF>=90){if(slow>55&&q>.5){q-=.25;size()}slow=0;nF=0}} lastF=t;
  par.x+=(parT.x-par.x)*.06; par.y+=(parT.y-par.y)*.06;
  if(!dragRail){const goal=scrub===null?realNow():scrub;T=calm?goal:T+(goal-T)*.06;if(Math.abs(goal-T)<.02)T=goal}
  if(!(nF&1)||dragRail||scrub!==null) drawSky(t);
  if(cur==='today') paintRail();
  if(cur==='qibla') qibla();
  fc.clearRect(0,0,Wd,Ht);
  if(parts.length){parts=parts.filter(p=>p.l>0);for(const p of parts){p.vy+=.13;p.vx*=.985;p.x+=p.vx;p.y+=p.vy;p.l-=.018;fc.globalAlpha=Math.max(0,p.l);fc.fillStyle=p.c;fc.beginPath();fc.arc(p.x,p.y,p.r,0,6.283);fc.fill()}fc.globalAlpha=1}
  requestAnimationFrame(frame);
}
computeDay(); T=realNow();
addEventListener('resize',size); size(); setInterval(tick,1000); requestAnimationFrame(frame);
