const {API,KEY}=window.CFG,H=window.host;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const el=(t,c,h)=>{const d=document.createElement(t);d.className=c;d.innerHTML=h||'';return d};
const LS={get:(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const NEW=new URL('newtab.html',location.href).href,BASE=NEW.split('?')[0];
const tabsEl=$('#tabs'),views=$('#views'),addr=$('#addr'),lock=$('#lock'),prog=$('#prog'),pop=$('#pop'),sg=$('#sg'),banner=$('#banner'),dr=$('#drawer'),mp=$('#menupop'),status=$('#status'),tctx=$('#tctx');
let hist=LS.get('hist',[]),marks=LS.get('marks',[]);
let dls=LS.get('dls',[]).map(d=>d.state==='progress'||d.state==='paused'?{...d,state:'interrupted'}:d);
const cfg={engine:'indexa',restore:true,dir:'',bar:true,home:'',tour:true,adblock:false,upd:0,...LS.get('cfg',{})};
const PRIV=new URLSearchParams(location.search).has('private'),PART=PRIV?'private':'persist:main';
const SID=Date.now();
let tabs=[],cur=null,uid=0,sgT,sgI=-1,closed=[],isFs=false,dtab='dl',dlT=0,sessT=0,dragT=null;
const safe=u=>{try{return new URL(u)}catch{return null}};
const isInt=u=>String(u).startsWith(BASE);
const ok=(v,f,...a)=>{try{return v[f](...a)}catch{return false}};
const LOCAL=/^(localhost|127\.|10\.|192\.168\.|\[::1\])/;
const hue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h};
const letter=h=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="hsl(${hue(h)},70%,62%)"/><text x="16" y="22" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="17" fill="#0b0f17">${esc((h[0]||'?').toUpperCase())}</text></svg>`);
const LOGO='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#6ea8ff"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#g)"/><text x="16" y="23" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="20" fill="#0b0f17">i</text></svg>');
const favOf=u=>{const x=safe(u);return x&&/^https?:$/.test(x.protocol)?x.origin+'/favicon.ico':''};
const imgTag=u=>{const h=(safe(u)||{}).hostname||'?';return `<img data-h="${esc(h)}" src="${favOf(u)||letter(h)}">`};
document.addEventListener('error',e=>{const i=e.target;if(i.tagName==='IMG'&&i.dataset.h&&!i.dataset.f){i.dataset.f=1;i.src=letter(i.dataset.h)}},true);
const fmtB=n=>n>=1073741824?(n/1073741824).toFixed(1)+' ГБ':n>=1048576?(n/1048576).toFixed(1)+' МБ':n>=1024?Math.round(n/1024)+' КБ':(n||0)+' Б';
const fmtT=t=>new Date(t).toLocaleString('ru',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const ENG={google:'https://www.google.com/search?q=',ddg:'https://duckduckgo.com/?q=',yandex:'https://yandex.ru/search/?text='};
const S='<svg viewBox="0 0 24 24">',IC={
 lock:S+'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
 warn:S+'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>',
 search:S+'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/></svg>'};
const ICON={search:IC.search,unk:IC.lock,ok:IC.lock,check:IC.lock,bad:IC.warn,http:IC.warn};
const LBL={http:'Не защищено',bad:'Опасно'};

function toast(m,b,fn){
 const d=el('div','toast',`<span>${esc(m)}</span>${b?`<button>${esc(b)}</button>`:''}`);
 $('#toasts').appendChild(d);
 if(b)d.querySelector('button').onclick=()=>{fn();d.remove()};
 setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),320)},4800)
}
const looksUrl=s=>/^(view-source:|[a-z]+:\/\/)/i.test(s)||/^\d{1,3}(\.\d{1,3}){3}(:\d+)?([\/?#]\S*)?$/.test(s)||/^localhost(:\d+)?([\/?#]|$)/i.test(s)||/^[^\s\/]+\.[a-z]{2,}(:\d+)?([\/?#]\S*)?$/i.test(s);
function resolve(s){
 s=s.trim();if(!s)return NEW;
 if(/^(https?|file|view-source):/i.test(s))return s;
 if(/^\d{1,3}(\.\d{1,3}){3}(:\d+)?([\/?#]\S*)?$/.test(s))return 'http://'+s;
 if(/^localhost/i.test(s))return 'http://'+s;
 if(looksUrl(s))return 'https://'+s;
 return ENG[cfg.engine]?ENG[cfg.engine]+encodeURIComponent(s):NEW+'?q='+encodeURIComponent(s)
}
const disp=t=>isInt(t.url)?(safe(t.url).searchParams.get('q')||''):t.url;

function newTab(url=NEW,sel=true){
 const t={id:++uid,url,title:'Новая вкладка',ssl:{state:'search'},zoom:0,dis:new Set()};
 t.tab=el('div','tab in',`<img class="fav" src="${LOGO}"><i class="sp"></i><span class="tt">Новая вкладка</span><i class="au" hidden>♪</i><button class="x" title="Закрыть">×</button>`);
 const v=t.view=document.createElement('webview');
 v.setAttribute('src',url);v.setAttribute('allowpopups','');v.setAttribute('partition',PART);v.className='off';
 tabsEl.appendChild(t.tab);views.appendChild(v);tabs.push(t);
 t.tab.onclick=e=>{if(e.target.classList.contains('x'))closeTab(t);else if(e.target.classList.contains('au')){t.muted=!t.muted;ok(v,'setAudioMuted',t.muted);e.target.classList.toggle('mu',t.muted)}else select(t)};
 t.tab.onauxclick=e=>{if(e.button===1)closeTab(t)};
 t.tab.oncontextmenu=e=>{e.preventDefault();tabMenu(t,e.clientX,e.clientY)};
 t.tab.draggable=true;
 t.tab.ondragstart=e=>{dragT=t;e.dataTransfer.effectAllowed='move'};
 t.tab.ondragover=e=>{e.preventDefault();if(!dragT||dragT===t||!!dragT.pinned!==!!t.pinned)return;const r=t.tab.getBoundingClientRect();tabsEl.insertBefore(dragT.tab,e.clientX>r.left+r.width/2?t.tab.nextSibling:t.tab);tabs=[...tabsEl.children].map(c=>tabs.find(x=>x.tab===c)).filter(Boolean)};
 t.tab.ondragend=()=>{dragT=null;saveSess()};
 bind(t);if(sel)select(t);saveSess();return t
}
function setFav(t,src){
 const f=t.tab.querySelector('.fav'),h=(safe(t.url)||{}).hostname||'?';
 delete f.dataset.f;f.dataset.h=h;
 f.src=src||(isInt(t.url)?LOGO:letter(h))
}
function addHist(t){
 if(PRIV)return;
 const u=safe(t.url);if(!u||isInt(t.url)||!/^https?:$/.test(u.protocol))return;
 if(hist[0]&&hist[0].url===t.url)return;
 hist.unshift({url:t.url,title:t.title,ts:Date.now()});hist=hist.slice(0,1000);LS.set('hist',hist)
}
function bind(t){
 const v=t.view,tt=t.tab.querySelector('.tt');
 v.addEventListener('did-start-loading',()=>{t.loading=true;t.tab.classList.add('ld');if(t===cur){prog.className='';void prog.offsetWidth;prog.className='on';$('#rel').classList.add('spin')}});
 v.addEventListener('did-stop-loading',()=>{t.loading=false;t.tab.classList.remove('ld');if(t===cur){prog.className='done';$('#rel').classList.remove('spin');setTimeout(()=>{if(!t.loading)prog.className=''},450);sync()}});
 v.addEventListener('dom-ready',()=>{t.ready=true;if(t.zoom)ok(v,'setZoomLevel',t.zoom)});
 v.addEventListener('page-title-updated',e=>{t.title=e.title;tt.textContent=e.title;t.tab.dataset.tip=e.title;if(hist[0]&&hist[0].url===t.url){hist[0].title=e.title;LS.set('hist',hist)}});
 v.addEventListener('page-favicon-updated',e=>{if(e.favicons[0]&&!isInt(t.url))setFav(t,e.favicons[0])});
 v.addEventListener('media-started-playing',()=>{t.tab.querySelector('.au').hidden=false});
 v.addEventListener('media-paused',()=>{t.tab.querySelector('.au').hidden=true});
 v.addEventListener('focus',closeMenus);
 v.addEventListener('update-target-url',e=>{if(t===cur){status.textContent=e.url;status.classList.toggle('on',!!e.url)}});
 v.addEventListener('enter-html-full-screen',()=>document.body.classList.add('fsv'));
 v.addEventListener('leave-html-full-screen',()=>document.body.classList.remove('fsv'));
 v.addEventListener('found-in-page',e=>{if(t===cur)$('#fc').textContent=e.result.matches?`${e.result.activeMatchOrdinal}/${e.result.matches}`:'0'});
 const nav=(e,inpage)=>{
  if(e.isMainFrame===false||String(e.url).startsWith('data:'))return;
  t.url=e.url;
  if(!inpage){t.err=null;clearOv(t);setFav(t);t.banner=null;lockFor(t);addHist(t)}
  if(t===cur){sync();saveSess()}
 };
 v.addEventListener('did-navigate',e=>nav(e,false));
 v.addEventListener('did-navigate-in-page',e=>nav(e,true));
 v.addEventListener('did-fail-load',e=>{
  if(!e.isMainFrame||e.errorCode===-3||e.errorCode===0)return;
  t.url=e.validatedURL;t.err=e.errorDescription;
  showOv(t,/CERT|SSL_/.test(e.errorDescription)?'cert':'error',e);
  lockFor(t);if(t===cur)sync()
 });
 const crash=()=>showOv(t,'crash',{});
 v.addEventListener('render-process-gone',crash);v.addEventListener('crashed',crash)
}
const ER={'-105':['Сайт не найден','Не удалось найти адрес сервера. Проверьте, правильно ли введён адрес.'],'-106':['Нет подключения к интернету','Проверьте сеть и повторите попытку.'],'-102':['Сайт отказал в подключении','Сервер не принимает соединения.'],'-118':['Превышено время ожидания','Сервер слишком долго не отвечает.'],'-101':['Соединение сброшено','Соединение было прервано во время загрузки.'],'-310':['Слишком много перенаправлений','Сайт зациклился на перенаправлениях. Попробуйте очистить данные сайтов в настройках.'],'-324':['Пустой ответ','Сервер закрыл соединение, ничего не отправив.'],'-109':['Адрес недоступен','Сервер недоступен из вашей сети.'],'-20':['Запрос заблокирован','Загрузка этой страницы заблокирована.']};
const CR={CERT_DATE_INVALID:'Срок действия сертификата истёк или ещё не начался.',CERT_AUTHORITY_INVALID:'Сертификат выдан неизвестным или недоверенным центром.',CERT_COMMON_NAME_INVALID:'Сертификат выдан для другого домена.',CERT_REVOKED:'Сертификат отозван.',CERT_WEAK_SIGNATURE_ALGORITHM:'Сертификат использует устаревший алгоритм подписи.'};
function clearOv(t){if(t.ov){t.ov.remove();t.ov=null}}
function showOv(t,kind,e){
 clearOv(t);
 const u=safe(t.url),h=u?u.hostname:t.url;let html;
 if(kind==='cert'){
  const key=(String(e.errorDescription).match(/ERR_(\w+)/)||[])[1]||'';
  html=`<div class="card bad"><div class="big">⚠</div><h2>Подключение не защищено</h2><p>Злоумышленники могут пытаться украсть ваши данные (пароли, сообщения, номера карт) на сайте <b>${esc(h)}</b>.</p><p class="mu">${esc(CR[key.replace(/^NET_/,'')]||'Сертификат сайта недействителен.')}<br>${esc(e.errorDescription)}</p><div class="row"><button class="b pri" data-a="back">Вернуться</button><button class="b" data-a="adv">Дополнительно</button></div><div class="adv" hidden><p>Можно открыть сайт на свой риск. Не вводите пароли и платёжные данные.</p><button class="b danger" data-a="go">Перейти на ${esc(h)} (небезопасно)</button></div></div>`
 }else if(kind==='crash')html=`<div class="card"><div class="big">☹</div><h2>Страница аварийно завершилась</h2><p>Во вкладке произошёл сбой. Попробуйте перезагрузить страницу.</p><div class="row"><button class="b pri" data-a="retry">Перезагрузить</button><button class="b" data-a="home">Домой</button></div></div>`;
 else{
  const m=ER[e.errorCode]||['Не удалось открыть страницу','Произошла ошибка при загрузке.'];
  html=`<div class="card"><div class="big">✕</div><h2>${m[0]}</h2><p>${m[1]}</p><p class="mu">${esc(t.url)}<br>${esc(e.errorDescription||'')} (${e.errorCode||''})</p><div class="row"><button class="b pri" data-a="retry">Повторить</button><button class="b" data-a="find">Искать в Indexa</button><button class="b" data-a="home">Домой</button></div></div>`
 }
 const d=t.ov=el('div','ov'+(t===cur?'':' off'),html);views.appendChild(d);
 d.addEventListener('click',ev=>{
  const a=ev.target.closest('[data-a]');if(!a)return;
  const k=a.dataset.a;
  if(k==='retry'){clearOv(t);t.view.loadURL(t.url)}
  else if(k==='home'){go(NEW)}
  else if(k==='find'){go(NEW+'?q='+encodeURIComponent(h))}
  else if(k==='back'){clearOv(t);t.err=null;ok(t.view,'canGoBack')?t.view.goBack():go(NEW)}
  else if(k==='adv')d.querySelector('.adv').hidden=false;
  else if(k==='go'){H.allowCert(h);clearOv(t);t.err=null;t.view.loadURL(t.url)}
 })
}
function select(t){
 cur=t;
 tabs.forEach(x=>{x.tab.classList.toggle('on',x===t);x.view.classList.toggle('off',x!==t);if(x.ov)x.ov.classList.toggle('off',x!==t)});
 prog.className=t.loading?'on':'';$('#rel').classList.toggle('spin',!!t.loading);
 $('#find').hidden=true;
 sync();paint(t);saveSess();
 if(isInt(t.url)&&!disp(t))setTimeout(()=>addr.focus(),50)
}
function closeTab(t){
 const i=tabs.indexOf(t);if(i<0)return;
 if(t.url&&!(isInt(t.url)&&!disp(t)))closed.push(t.url);
 tabs.splice(i,1);t.tab.classList.add('out');clearOv(t);
 setTimeout(()=>{t.tab.remove();t.view.remove()},180);
 if(!tabs.length)return window.close();
 if(t===cur)select(tabs[Math.min(i,tabs.length-1)]);else saveSess()
}
function saveSess(){if(PRIV)return;clearTimeout(sessT);sessT=setTimeout(()=>LS.set('sess',{urls:tabs.map(t=>t.url),pins:tabs.map(t=>!!t.pinned),a:Math.max(0,tabs.indexOf(cur))}),300)}
function sync(){
 if(!cur)return;
 if(document.activeElement!==addr)addr.value=disp(cur);
 $('#back').disabled=!ok(cur.view,'canGoBack');$('#fwd').disabled=!ok(cur.view,'canGoForward');
 const st=$('#star');st.disabled=isInt(cur.url)&&!disp(cur);st.classList.toggle('on',marks.some(m=>m.url===cur.url));
 const z=$('#zoom');z.hidden=!cur.zoom;z.textContent=Math.round(100*1.2**cur.zoom)+'%';
 renderBanner()
}
function renderBanner(){
 const b=cur&&cur.banner;banner.hidden=!b;
 if(b){banner.className=b.cls;banner.innerHTML=`<span>${b.html}</span>`}
}
banner.addEventListener('click',e=>{
 const b=e.target.closest('[data-b]');if(!b||!cur)return;
 if(b.dataset.b==='https')go(cur.url.replace(/^http:/i,'https:'));
 else{const u=safe(cur.url);if(u)cur.dis.add(u.hostname);cur.banner=null;renderBanner()}
});
const sslCache=new Map();
function sslFor(h){
 if(!sslCache.has(h))sslCache.set(h,fetch(`${API}/api/ssl?host=${encodeURIComponent(h)}&key=${KEY}`).then(r=>r.json()).catch(()=>({unreachable:true})));
 return sslCache.get(h)
}
async function lockFor(t){
 const u=safe(t.url);let b=null;
 if(t.err)t.ssl={state:'bad',msg:t.err};
 else if(!u||isInt(t.url)||!/^https?:$/.test(u.protocol))t.ssl={state:'search'};
 else if(u.protocol==='http:'){
  t.ssl={state:'http'};
  if(!LOCAL.test(u.hostname)&&!t.dis.has(u.hostname))b={cls:'y',html:'Соединение не защищено: не вводите пароли и данные карт. <button data-b="https">Открыть по HTTPS</button> <button data-b="x">Скрыть</button>'}
 }else{
  t.ssl={state:'check',host:u.hostname};paint(t);
  const r=await sslFor(u.hostname),n=safe(t.url);
  if(!n||n.hostname!==u.hostname)return;
  t.ssl=r.unreachable?{state:'unk',host:u.hostname}:{state:r.valid?'ok':'bad',host:u.hostname,r};
  if(r.cert&&r.cert.days_left<=7)b={cls:'y',html:`Сертификат сайта истекает через ${r.cert.days_left} дн. <button data-b="x">Скрыть</button>`}
 }
 if(!t.banner||b)t.banner=b;
 paint(t);if(t===cur)renderBanner()
}
function paint(t){
 if(t!==cur)return;
 const s=t.ssl.state;lock.className='lock '+s;
 lock.innerHTML=ICON[s]+(LBL[s]?`<b>${LBL[s]}</b>`:'')
}
const fd=d=>d?new Date(d+'Z').toLocaleDateString('ru'):'—';
lock.onclick=e=>{
 e.stopPropagation();
 const s=cur.ssl;
 if(s.state==='search'||s.state==='check'){pop.style.display='none';return}
 const r=s.r||{},c=r.cert,W=x=>x.replace('<svg','<svg width=18 height=18');
 let h='';
 if(s.state==='ok')h=`<h4 class="g">${W(IC.lock)} Соединение защищено</h4>`;
 else if(s.state==='http')h=`<h4 class="y">${W(IC.warn)} Не защищено</h4><p style="margin:0;color:#8793a8;font-size:13px">Сайт открыт по HTTP: данные передаются без шифрования.</p>`;
 else if(s.state==='unk')h=`<h4>Проверка недоступна</h4><p style="margin:0;color:#8793a8;font-size:13px">API Indexa не ответил.</p>`;
 else h=`<h4 class="r">${W(IC.warn)} Сертификат не принят</h4><p style="margin:0;color:#8793a8;font-size:13px">${esc(s.msg||r.error||'Не удалось установить защищённое соединение')}</p>`;
 if(s.host&&r.host)h+=`<dl style="margin-top:12px"><dt>Сайт</dt><dd>${esc(s.host)}</dd>${c?`<dt>Издатель</dt><dd>${esc(c.issuer)}</dd><dt>Действует с</dt><dd>${fd(c.not_before)}</dd><dt>Действует до</dt><dd class="${c.days_left<15?'y':''}">${fd(c.not_after)} (${c.days_left} дн.)</dd>`:''}<dt>HSTS</dt><dd class="${r.hsts?'g':''}">${r.hsts?'включён':'нет'}</dd>${r.ms?`<dt>Ответ</dt><dd>${r.ms} мс</dd>`:''}</dl><div class="src">Проверено через Indexa API</div>`;
 pop.innerHTML=h;pop.style.display='block'
};
document.addEventListener('click',e=>{
 if(!e.target.closest('#pop'))pop.style.display='none';
 if(!e.target.closest('#abox'))sg.style.display='none';
 if(!e.target.closest('#menupop')&&!e.target.closest('#menu'))mp.style.display='none';
 if(!e.target.closest('#drawer')&&!e.target.closest('#menupop')&&!e.target.closest('#dlb')&&!e.target.closest('#menu')&&!e.target.closest('#toasts')&&!e.target.closest('#tour'))dr.classList.remove('on')
});

function go(text){
 sg.style.display='none';const u=resolve(text);
 addr.blur();cur.url=u;cur.err=null;clearOv(cur);
 try{cur.view.loadURL(u)}catch{cur.view.setAttribute('src',u)}
}
addr.addEventListener('focus',()=>addr.select());
addr.addEventListener('blur',()=>{setTimeout(()=>{if(cur)addr.value=disp(cur)},120)});
addr.addEventListener('keydown',e=>{
 const it=[...sg.children];
 if(e.key==='Enter')go(addr.value);
 else if(e.key==='Escape'){addr.value=disp(cur);sg.style.display='none';addr.blur()}
 else if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(!it.length)return;e.preventDefault();sgI=(sgI+(e.key==='ArrowDown'?1:-1)+it.length)%it.length;it.forEach((d,i)=>d.classList.toggle('on',i===sgI));addr.value=it[sgI].dataset.u||it[sgI].textContent}
});
function drawSg(loc,sug){
 sg.innerHTML=loc.map(x=>`<div class="l" data-u="${esc(x.url)}">${imgTag(x.url)}<span>${esc(x.title||x.url)}</span><small>${esc(x.url)}</small></div>`).join('')+sug.map(x=>`<div>${esc(x)}</div>`).join('');
 sg.style.display=sg.children.length?'block':'none'
}
addr.addEventListener('input',()=>{
 clearTimeout(sgT);const v=addr.value.trim(),lv=v.toLowerCase();sgI=-1;
 if(!v){sg.style.display='none';return}
 const loc=[...marks,...hist].filter((x,i,a)=>(x.title+' '+x.url).toLowerCase().includes(lv)&&a.findIndex(y=>y.url===x.url)===i).slice(0,4);
 drawSg(loc,[]);
 if(v.length<2||looksUrl(v))return;
 sgT=setTimeout(async()=>{
  try{const j=await(await fetch(`${API}/api/suggest?q=${encodeURIComponent(v)}`)).json();if(addr.value.trim()===v)drawSg(loc,(j.suggestions||[]).slice(0,5))}catch{}
 },160)
});
sg.addEventListener('mousedown',e=>{const d=e.target.closest('div');if(d){e.preventDefault();const v=d.dataset.u||d.textContent;addr.value=v;go(v)}});

function zoomBy(d){const t=cur;t.zoom=d===0?0:Math.max(-3,Math.min(5,t.zoom+d));ok(t.view,'setZoomLevel',t.zoom);sync()}
function toggleMark(){
 if(!cur||$('#star').disabled)return;
 const i=marks.findIndex(m=>m.url===cur.url);
 if(i>=0){marks.splice(i,1);toast('Закладка удалена')}else{marks.unshift({url:cur.url,title:cur.title,ts:Date.now()});toast('Страница добавлена в закладки')}
 LS.set('marks',marks);sync();renderBar();if(dr.classList.contains('on')&&dtab==='marks')body()
}
function openFind(){$('#find').hidden=false;$('#fi').focus();$('#fi').select()}
function closeFind(){$('#find').hidden=true;ok(cur.view,'stopFindInPage','clearSelection')}
$('#fi').addEventListener('input',e=>{const v=e.target.value;v?ok(cur.view,'findInPage',v):(ok(cur.view,'stopFindInPage','clearSelection'),$('#fc').textContent='')});
$('#fi').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.value)ok(cur.view,'findInPage',e.target.value,{findNext:true,forward:!e.shiftKey});if(e.key==='Escape')closeFind()});
$('#fn').onclick=()=>$('#fi').value&&ok(cur.view,'findInPage',$('#fi').value,{findNext:true,forward:true});
$('#fp').onclick=()=>$('#fi').value&&ok(cur.view,'findInPage',$('#fi').value,{findNext:true,forward:false});
$('#fx').onclick=closeFind;

$('#back').onclick=()=>ok(cur.view,'goBack');
$('#fwd').onclick=()=>ok(cur.view,'goForward');
$('#rel').onclick=()=>cur.loading?ok(cur.view,'stop'):(sslCache.clear(),clearOv(cur),cur.err?cur.view.loadURL(cur.url):ok(cur.view,'reload'));
$('#home').onclick=()=>go(cfg.home||NEW);
$('#add').onclick=()=>newTab();
$('#star').onclick=toggleMark;
$('#zoom').onclick=()=>zoomBy(0);
$('#dlb').onclick=e=>{e.stopPropagation();openDrawer('dl')};
const MENU=[['new','Новая вкладка','Ctrl+T'],['win','Новое окно','Ctrl+N'],['priv','Приватное окно','Ctrl+Shift+N'],['-'],['marks','Закладки','Ctrl+D'],['bar','Панель закладок','Ctrl+Shift+B'],['hist','История','Ctrl+H'],['dl','Загрузки','Ctrl+J'],['-'],['find','Найти на странице','Ctrl+F'],['print','Печать','Ctrl+P'],['save','Сохранить страницу','Ctrl+S'],['pdf','Сохранить как PDF',''],['shot','Скриншот страницы',''],['zo','Уменьшить масштаб','Ctrl+−'],['zi','Увеличить масштаб','Ctrl++'],['fs','Полный экран','F11'],['-'],['src','Исходный код страницы','Ctrl+U'],['dev','Инструменты разработчика','F12'],['-'],['tour','Показать подсказки',''],['cfg','Настройки','']];
$('#menu').onclick=e=>{e.stopPropagation();mp.innerHTML=MENU.map(m=>m[0]==='-'?'<hr>':`<div data-m="${m[0]}">${m[1]}<small>${m[2]}</small></div>`).join('');mp.style.display=mp.style.display==='block'?'none':'block'};
mp.addEventListener('click',e=>{
 const d=e.target.closest('[data-m]');if(!d)return;mp.style.display='none';const m=d.dataset.m;
 if(m==='new')newTab();else if(['dl','hist','marks','cfg'].includes(m))openDrawer(m);
 else if(m==='win')H.newWin(false);else if(m==='priv')H.newWin(true);else if(m==='bar')toggleBar();
 else if(m==='find')openFind();else if(m==='print')ok(cur.view,'print');else if(m==='zo')zoomBy(-1);else if(m==='zi')zoomBy(1);
 else if(m==='fs')H.fullscreen(!isFs);else if(m==='dev')tool('devtools');else if(m==='src')viewSource();
 else if(m==='tour')startTour();else if(m==='save')tool('savepage');else if(m==='pdf')tool('pdf');else if(m==='shot')tool('shot')
});

function openDrawer(k){dtab=k;dr.classList.add('on');renderDr()}
function renderDr(){
 const T={dl:'Загрузки',hist:'История',marks:'Закладки',cfg:'Настройки'};
 dr.innerHTML=`<div class="dh"><div class="seg">${Object.keys(T).map(k=>`<button data-k="${k}" class="${k===dtab?'on':''}">${T[k]}</button>`).join('')}</div><button class="x" data-k="close">×</button></div><div class="db" id="db"></div>`;
 body()
}
function dlHtml(){
 if(!dls.length)return '<p class="mu">Загрузок пока нет</p>';
 return `<div class="row2"><button class="b" data-d="clear">Очистить список</button></div>`+dls.map(d=>{
  const act=d.state==='progress'||d.state==='paused',pc=d.total>0?Math.round(100*d.received/d.total):0;
  const st={progress:`${fmtB(d.received)} из ${d.total>0?fmtB(d.total):'?'}`,paused:`Приостановлено · ${fmtB(d.received)}`,completed:`Готово · ${fmtB(d.total||d.received)}`,cancelled:'Отменено',interrupted:'Прервано'}[d.state]||'';
  const bt=d.state==='completed'?`<button data-d="open" data-n="${d.key}">Открыть</button><button data-d="show" data-n="${d.key}">В папке</button>`:act?`<button data-d="${d.state==='paused'?'resume':'pause'}" data-n="${d.key}">${d.state==='paused'?'Продолжить':'Пауза'}</button><button data-d="cancel" data-n="${d.key}">Отмена</button>`:'';
  return `<div class="it"><div class="ico">${esc((d.name.split('.').pop()||'').slice(0,4).toUpperCase())}</div><div class="im"><b title="${esc(d.name)}">${esc(d.name)}</b><small>${st}</small>${act?`<div class="pb"><i style="width:${pc}%"></i></div>`:''}</div><div class="ia">${bt}<button data-d="rm" data-n="${d.key}">×</button></div></div>`
 }).join('')
}
const histList=q=>{const r=hist.filter(h=>!q||(h.title+h.url).toLowerCase().includes(q)).slice(0,200);return r.length?r.map(h=>`<div class="hi" data-u="${esc(h.url)}">${imgTag(h.url)}<div class="im"><span>${esc(h.title||h.url)}</span><small>${esc(h.url)} · ${fmtT(h.ts)}</small></div><div class="ia"><button data-hx="${h.ts}">×</button></div></div>`).join(''):'<p class="mu">Ничего нет</p>'};
const marksHtml=()=>marks.length?marks.map(m=>`<div class="hi" data-u="${esc(m.url)}">${imgTag(m.url)}<div class="im"><span>${esc(m.title||m.url)}</span><small>${esc(m.url)}</small></div><div class="ia"><button data-mx="${esc(m.url)}">×</button></div></div>`).join(''):'<p class="mu">Закладок пока нет. Нажмите ★ в адресной строке.</p>';
const cfgHtml=()=>`<div class="sr"><div>Поисковая система<small>Для слов в адресной строке</small></div><select data-c="engine"><option value="indexa">Indexa</option><option value="google">Google</option><option value="ddg">DuckDuckGo</option><option value="yandex">Яндекс</option></select></div>
<div class="sr"><div>Восстанавливать вкладки<small>При запуске браузера</small></div><input type="checkbox" data-c="restore" ${cfg.restore?'checked':''}></div>
<div class="sr"><div>Блокировка рекламы<small>Известные рекламные и трекерные домены</small></div><input type="checkbox" data-c="adblock" ${cfg.adblock?'checked':''}></div>
<div class="sr"><div>Подсказки<small>Короткий тур по интерфейсу</small></div><button class="b" data-s="tour">Показать</button></div>
<div class="sr"><div>Обновления<small>Версия ${esc(CFG.VERSION)}</small></div><button class="b" data-s="upd">Проверить</button></div>
<div class="sr"><div>Панель закладок<small>Под адресной строкой</small></div><input type="checkbox" data-c="bar" ${cfg.bar?'checked':''}></div>
<div class="sr"><div>Домашняя страница<small>Пусто — новая вкладка</small></div><input type="text" data-c="home" value="${esc(cfg.home)}" placeholder="https://"></div>
<div class="sr"><div>Папка загрузок<small id="dirs">${esc(cfg.dir||'По умолчанию (Загрузки)')}</small></div><div><button class="b" data-s="dir">Изменить</button></div></div>
<div class="sr"><div>История<small>${hist.length} записей</small></div><button class="b" data-s="hist">Очистить</button></div>
<div class="sr"><div>Данные сайтов<small>Куки, кэш, хранилище</small></div><button class="b danger" data-s="data">Очистить</button></div>
<div class="sr"><div>Indexa API<small id="apis">Проверка…</small></div></div>
<p class="mu" style="margin-top:16px">Indexa Browser 1.1</p>`;
function body(){
 const d=$('#db');if(!d)return;
 if(dtab==='dl')d.innerHTML=dlHtml();
 else if(dtab==='hist'){d.innerHTML=`<input id="hq" placeholder="Поиск по истории"><div class="row2"><span></span></div><div id="hl">${histList('')}</div>`;$('#hq').oninput=e=>{$('#hl').innerHTML=histList(e.target.value.toLowerCase())}}
 else if(dtab==='marks')d.innerHTML=marksHtml();
 else{
  d.innerHTML=cfgHtml();d.querySelector('[data-c=engine]').value=cfg.engine;
  fetch(`${API}/api/stats`).then(r=>r.json()).then(j=>{const s=$('#apis');if(s)s.textContent=`Доступен · в индексе ${j.pages} стр. с ${j.sites} сайтов`}).catch(()=>{const s=$('#apis');if(s)s.textContent='Недоступен'})
 }
}
dr.addEventListener('click',async e=>{
 const b=e.target.closest('button');
 if(b){
  const D=b.dataset;
  if(D.k){if(D.k==='close')dr.classList.remove('on');else{dtab=D.k;renderDr()}return}
  if(D.d){
   const d=dls.find(x=>x.key===D.n);
   if(D.d==='clear'){dls=dls.filter(x=>x.state==='progress'||x.state==='paused')}
   else if(D.d==='rm'){dls=dls.filter(x=>x!==d)}
   else if(d){H.dl(d.id,D.d,d.path)}
   LS.set('dls',dls);body();badge();return
  }
  if(D.hx){hist=hist.filter(h=>String(h.ts)!==D.hx);LS.set('hist',hist);$('#hl').innerHTML=histList($('#hq').value.toLowerCase());return}
  if(D.mx){marks=marks.filter(m=>m.url!==D.mx);LS.set('marks',marks);body();sync();renderBar();return}
  if(D.s==='dir'){const p=await H.pickDir();if(p){cfg.dir=p;LS.set('cfg',cfg);$('#dirs').textContent=p}}
  else if(D.s==='tour'){dr.classList.remove('on');startTour()}
  else if(D.s==='upd')checkUpdate(true);
  else if(D.s==='hist'){hist=[];LS.set('hist',hist);body();toast('История очищена')}
  else if(D.s==='data'){if(confirm('Удалить куки, кэш и данные всех сайтов?')){await H.clearData();sslCache.clear();toast('Данные сайтов очищены')}}
  return
 }
 const hi=e.target.closest('.hi');
 if(hi){dr.classList.remove('on');go(hi.dataset.u)}
});
dr.addEventListener('change',e=>{
 const c=e.target.dataset.c;if(!c)return;
 cfg[c]=e.target.type==='checkbox'?e.target.checked:e.target.value.trim();LS.set('cfg',cfg);if(c==='bar')renderBar();if(c==='adblock')H.setAdblock(cfg.adblock)
});
function badge(){
 const n=dls.filter(d=>d.state==='progress'||d.state==='paused').length;
 const b=$('#dlbadge');b.hidden=!n;b.textContent=n;$('#dlb').classList.toggle('act',n>0)
}
H.onDl(d=>{
 const key=`${SID}-${d.id}`;let x=dls.find(i=>i.key===key);
 if(d.state==='start'){
  dls.unshift({key,id:d.id,name:d.name,path:d.path,total:d.total,received:0,state:'progress',ts:Date.now()});
  toast('Загрузка: '+d.name,'Показать',()=>openDrawer('dl'))
 }else if(x){
  const was=x.state;Object.assign(x,{state:d.state,received:d.received??x.received,total:d.total||x.total});
  if(d.path)x.path=d.path;
  if(d.state==='completed'&&was!=='completed')toast('Загружено: '+x.name,'Открыть',()=>H.dl(x.id,'open',x.path));
  else if(d.state==='interrupted'&&was!=='interrupted')toast('Загрузка прервана: '+x.name)
 }
 dls=dls.slice(0,200);badge();
 if(!dlT)dlT=setTimeout(()=>{dlT=0;LS.set('dls',dls);if(dr.classList.contains('on')&&dtab==='dl')body()},250)
});
H.onFs(v=>{isFs=v});
function key(k){
 const c=k.ctrl,a=k.alt,s=k.shift,key=(k.key||'').toLowerCase();
 if(c&&s&&key==='t'){const u=closed.pop();if(u)newTab(u)}
 else if(c&&key==='t')newTab();
 else if(c&&s&&key==='n')H.newWin(true);
 else if(c&&key==='n')H.newWin(false);
 else if(c&&s&&key==='b')toggleBar();
 else if(c&&s&&key==='i')tool('devtools');
 else if(c&&key==='u')viewSource();
 else if(c&&key==='s')tool('savepage');
 else if(c&&key==='w')closeTab(cur);
 else if(c&&key==='l')addr.focus();
 else if((c&&key==='r')||key==='f5')$('#rel').click();
 else if(c&&key==='f')openFind();
 else if(c&&key==='p')ok(cur.view,'print');
 else if(c&&key==='d')toggleMark();
 else if(c&&key==='h')openDrawer('hist');
 else if(c&&key==='j')openDrawer('dl');
 else if(c&&(key==='+'||key==='='))zoomBy(1);
 else if(c&&(key==='-'||key==='_'))zoomBy(-1);
 else if(c&&key==='0')zoomBy(0);
 else if(c&&/^[1-9]$/.test(key)){const i=key==='9'?tabs.length-1:+key-1;if(tabs[i])select(tabs[i])}
 else if(a&&key==='arrowleft')$('#back').click();
 else if(a&&key==='arrowright')$('#fwd').click();
 else if(c&&key==='tab'){const i=tabs.indexOf(cur);select(tabs[(i+(s?-1:1)+tabs.length)%tabs.length])}
 else if(key==='f11')H.fullscreen(!isFs);
 else if(key==='f12')tool('devtools');
 else if(key==='escape'){if(!$('#find').hidden)closeFind();dr.classList.remove('on');mp.style.display='none';pop.style.display='none';return false}
 else return false;
 return true
}
window.addEventListener('keydown',e=>{if(key({key:e.key,ctrl:e.ctrlKey||e.metaKey,alt:e.altKey,shift:e.shiftKey}))e.preventDefault()});
H.onKey(key);
H.onOpenTab(u=>newTab(u));
H.onSearch(t=>newTab(NEW+'?q='+encodeURIComponent(t)));
function pin(t,v){
 t.pinned=v;t.tab.classList.toggle('pin',v);
 if(v)tabsEl.insertBefore(t.tab,tabsEl.firstChild);
 tabs=[...tabsEl.children].map(c=>tabs.find(x=>x.tab===c)).filter(Boolean);saveSess()
}
function tabMenu(t,x,y){
 const au=t.tab.querySelector('.au');
 const it=[['Обновить',()=>ok(t.view,'reload')],['Дублировать',()=>newTab(t.url)],[t.pinned?'Открепить':'Закрепить',()=>pin(t,!t.pinned)],[t.muted?'Включить звук':'Отключить звук',()=>{t.muted=!t.muted;ok(t.view,'setAudioMuted',t.muted);au.classList.toggle('mu',t.muted)}],['-'],['Закрыть',()=>closeTab(t)],['Закрыть другие',()=>tabs.filter(o=>o!==t&&!o.pinned).forEach(o=>closeTab(o))],['Закрыть вкладки справа',()=>tabs.slice(tabs.indexOf(t)+1).forEach(o=>closeTab(o))]];
 tctx.innerHTML=it.map((m,i)=>m[0]==='-'?'<hr>':`<div data-i="${i}">${m[0]}</div>`).join('');
 tctx.style.left=Math.min(x,innerWidth-230)+'px';tctx.style.top=Math.min(y,innerHeight-300)+'px';tctx.style.display='block';
 tctx.onclick=e=>{const d=e.target.closest('[data-i]');if(d){tctx.style.display='none';it[d.dataset.i][1]()}}
}
document.addEventListener('click',()=>{tctx.style.display='none'});
function tool(a){try{H.tool(cur.view.getWebContentsId(),a)}catch{}}
function viewSource(){const u=safe(cur.url);if(u&&/^https?:$/.test(u.protocol))newTab('view-source:'+cur.url)}
function toggleBar(){cfg.bar=!cfg.bar;LS.set('cfg',cfg);renderBar();toast(cfg.bar?'Панель закладок включена':'Панель закладок скрыта')}
function renderBar(){
 const b=$('#bmbar');b.hidden=!cfg.bar||!marks.length;
 b.innerHTML=marks.slice(0,40).map(m=>`<a data-u="${esc(m.url)}" title="${esc(m.url)}">${imgTag(m.url)}<span>${esc(m.title||m.url)}</span></a>`).join('')
}
$('#bmbar').addEventListener('click',e=>{const a=e.target.closest('[data-u]');if(a)go(a.dataset.u)});
$('#bmbar').addEventListener('auxclick',e=>{const a=e.target.closest('[data-u]');if(a&&e.button===1)newTab(a.dataset.u)});
let authId=0;
H.onAuth(d=>{if(!$('#auth').hidden)H.auth(authId);authId=d.id;$('#ap').textContent=d.host+(d.realm?' — '+d.realm:'');$('#auth').hidden=false;$('#au_u').value='';$('#au_p').value='';$('#au_u').focus()});
$('#auth form').onsubmit=e=>{e.preventDefault();H.auth(authId,$('#au_u').value,$('#au_p').value);$('#auth').hidden=true};
$('#ac').onclick=()=>{H.auth(authId);$('#auth').hidden=true};
H.onSaved(d=>toast(d.text,d.path?'Показать':'',()=>H.dl(0,'show',d.path)));
const tipEl=$('#tip');let tipT=0;
document.addEventListener('mouseover',e=>{
 clearTimeout(tipT);tipEl.classList.remove('on');
 const t=e.target.closest&&e.target.closest('[title],[data-tip]');if(!t)return;
 if(t.hasAttribute('title')){t.dataset.tip=t.getAttribute('title');t.removeAttribute('title')}
 const m=t.dataset.tip;if(!m)return;
 tipT=setTimeout(()=>{
  tipEl.textContent=m;const r=t.getBoundingClientRect();
  tipEl.style.left=Math.max(8,Math.min(innerWidth-tipEl.offsetWidth-8,r.left+r.width/2-tipEl.offsetWidth/2))+'px';
  tipEl.style.top=(r.bottom+8)+'px';tipEl.classList.add('on')
 },450)
});
document.addEventListener('mousedown',()=>{clearTimeout(tipT);tipEl.classList.remove('on')});
document.querySelectorAll('[title]').forEach(x=>{x.dataset.tip=x.getAttribute('title');x.removeAttribute('title')});
function closeMenus(){pop.style.display='none';mp.style.display='none';tctx.style.display='none';sg.style.display='none'}
const TOUR=[['#abox','Адресная строка','Введите адрес сайта или слова для поиска. Подсказки берутся из закладок, истории и Indexa.'],['#lock','Замок безопасности','Показывает, защищено ли соединение. Клик откроет данные сертификата.'],['#star','Закладки','Сохраните страницу звёздочкой. Панель закладок включается через меню.'],['#dlb','Загрузки','Прогресс, пауза и открытие скачанных файлов.'],['#menu','Меню','Приватное окно, поиск по странице, PDF, скриншот, инструменты разработчика и настройки.']];
let tourI=0;
function tourShow(){
 const s=TOUR[tourI],el=$(s[0]),tr=$('#tour');
 if(!el)return;
 const r=el.getBoundingClientRect(),h=tr.querySelector('.hole'),c=tr.querySelector('.tcard');
 h.style.cssText=`left:${r.left-6}px;top:${r.top-6}px;width:${r.width+12}px;height:${r.height+12}px`;
 c.innerHTML=`<b>${s[1]}</b><p>${s[2]}</p><div class="tr"><span>${tourI+1} / ${TOUR.length}</span><span><button data-t="skip">Пропустить</button>${tourI?'<button data-t="prev">Назад</button>':''}<button class="pri" data-t="next">${tourI===TOUR.length-1?'Готово':'Далее'}</button></span></div>`;
 c.style.top=(r.bottom+16)+'px';c.style.left=Math.max(12,Math.min(innerWidth-352,r.left+r.width/2-170))+'px'
}
function startTour(){closeMenus();dr.classList.remove('on');tourI=0;$('#tour').hidden=false;tourShow()}
$('#tour').addEventListener('click',e=>{
 const b=e.target.closest('[data-t]');if(!b)return;
 const a=b.dataset.t;
 if(a==='skip'||(a==='next'&&tourI===TOUR.length-1)){$('#tour').hidden=true;return}
 tourI+=a==='next'?1:-1;tourShow()
});
const newer=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return (x[i]||0)>(y[i]||0)}return false};
async function checkUpdate(manual){
 try{
  const j=await(await fetch(CFG.UPDATE_URL+'?t='+Date.now(),{cache:'no-store'})).json();
  if(j.version&&newer(j.version,CFG.VERSION))toast('Доступна версия '+j.version,'Скачать',()=>newTab(j.url||'https://runtimedata.web.app/index/app.rar'));
  else if(manual)toast('Установлена последняя версия')
 }catch{if(manual)toast('Не удалось проверить обновления')}
}
window.addEventListener('offline',()=>toast('Нет подключения к интернету'));
window.addEventListener('online',()=>toast('Подключение восстановлено'));
window.addEventListener('unhandledrejection',e=>{e.preventDefault()});
H.setAdblock(cfg.adblock);
H.setDir(cfg.dir||'');
badge();renderBar();
if(PRIV){document.body.classList.add('priv');$('#pbadge').hidden=false}
const ss=PRIV?null:LS.get('sess',null);
if(cfg.restore&&ss&&ss.urls&&ss.urls.length){ss.urls.forEach((u,i)=>{const t=newTab(u,false);if(ss.pins&&ss.pins[i])pin(t,true)});select(tabs[Math.min(ss.a||0,tabs.length-1)])}else newTab();
if(!PRIV){
 if(cfg.tour){cfg.tour=false;LS.set('cfg',cfg);setTimeout(startTour,1200)}
 if(Date.now()-cfg.upd>864e5){cfg.upd=Date.now();LS.set('cfg',cfg);setTimeout(()=>checkUpdate(false),4000)}
}
