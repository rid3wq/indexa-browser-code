const {app,BrowserWindow,nativeTheme,Menu,session,ipcMain,shell,dialog,clipboard,webContents,screen}=require('electron');
const path=require('path'),fs=require('fs');
nativeTheme.themeSource='dark';
if(!app.requestSingleInstanceLock()){app.quit();process.exit(0)}
const ICON=path.join(__dirname,'build','icon.png');
let dlDir=null,dlId=0,authId=0;
const allowed=new Set(),items=new Map(),auths=new Map();
let adblock=false;
const AD='doubleclick.net,googlesyndication.com,googleadservices.com,adservice.google.com,google-analytics.com,analytics.google.com,adnxs.com,adsrvr.org,criteo.com,criteo.net,taboola.com,outbrain.com,scorecardresearch.com,quantserve.com,hotjar.com,mc.yandex.ru,an.yandex.ru,yandexadexchange.net,pubmatic.com,rubiconproject.com,openx.net,casalemedia.com,moatads.com,amazon-adsystem.com,ads.twitter.com,analytics.twitter.com,bat.bing.com,clarity.ms,mixpanel.com,segment.io,adform.net,smartadserver.com,teads.tv,sharethrough.com,media.net,adcolony.com,appsflyer.com,top-fwz1.mail.ru,counter.yadro.ru,mediametrics.ru'.split(',');
const stateFile=path.join(app.getPath('userData'),'window.json');
const loadState=()=>{try{return JSON.parse(fs.readFileSync(stateFile,'utf8'))}catch{return {}}};
const pos=st=>{
 if(typeof st.x!=='number'||typeof st.y!=='number')return {};
 const ok=screen.getAllDisplays().some(d=>st.x>=d.workArea.x-50&&st.y>=d.workArea.y-50&&st.x<d.workArea.x+d.workArea.width-100&&st.y<d.workArea.y+d.workArea.height-100);
 return ok?{x:st.x,y:st.y}:{}
};
function bar(){
 let r=0,t=0;
 for(const it of items.values()){r+=it.getReceivedBytes();t+=Math.max(0,it.getTotalBytes())}
 const v=items.size&&t>0?Math.min(1,r/t):-1;
 BrowserWindow.getAllWindows().forEach(w=>{try{w.setProgressBar(v)}catch{}})
}
const wsend=(w,c,d)=>{if(w&&!w.isDestroyed())w.webContents.send(c,d)};
const winOf=wc=>BrowserWindow.fromWebContents(wc.hostWebContents||wc);
const front=()=>BrowserWindow.getFocusedWindow()||BrowserWindow.getAllWindows()[0];
function create(priv,url){
 const bg=priv?'#120d1f':'#0b0f17';
 const st=priv?{}:loadState();
 const w=new BrowserWindow({...pos(st),width:st.width||1280,height:st.height||820,minWidth:760,minHeight:480,backgroundColor:bg,title:'Indexa Browser',icon:ICON,titleBarStyle:'hidden',titleBarOverlay:{color:bg,symbolColor:'#cbd5e1',height:42},webPreferences:{preload:path.join(__dirname,'preload.js'),webviewTag:true,contextIsolation:true}});
 w.loadFile('renderer/index.html',priv?{query:{private:'1'}}:undefined);
 if(st.max)w.maximize();
 w.on('close',()=>{if(!priv)try{fs.writeFileSync(stateFile,JSON.stringify({...w.getNormalBounds(),max:w.isMaximized()}))}catch{}});
 w.on('enter-full-screen',()=>wsend(w,'fs',true));
 w.on('leave-full-screen',()=>wsend(w,'fs',false));
 w.on('app-command',(e,c)=>{if(c==='browser-backward')wsend(w,'key',{key:'arrowleft',alt:true});if(c==='browser-forward')wsend(w,'key',{key:'arrowright',alt:true})});
 if(url)w.webContents.once('did-finish-load',()=>setTimeout(()=>wsend(w,'open-tab',url),400));
 return w
}
app.on('second-instance',(e,argv)=>{
 const w=front();if(!w)return;
 if(w.isMinimized())w.restore();
 w.focus();
 const u=argv.find(a=>/^https?:\/\//i.test(a));
 if(u)wsend(w,'open-tab',u)
});
app.on('certificate-error',(e,wc,url,err,cert,cb)=>{
 e.preventDefault();
 let h='';try{h=new URL(url).hostname}catch{}
 cb(allowed.has(h))
});
app.on('login',(e,wc,req,info,cb)=>{
 e.preventDefault();
 const id=++authId;auths.set(id,cb);
 wsend(winOf(wc)||front(),'auth',{id,host:info.host,realm:info.realm})
});
const PN={media:'камера или микрофон',geolocation:'геолокация',notifications:'уведомления',midi:'MIDI-устройства','clipboard-read':'чтение буфера обмена'};
function setupSession(part){
 const ses=session.fromPartition(part);
 try{ses.setSpellCheckerLanguages(['ru','en-US'])}catch{}
 ses.webRequest.onBeforeRequest((d,cb)=>{
  if(adblock&&d.resourceType!=='mainFrame'){try{const h=new URL(d.url).hostname;if(AD.some(x=>h===x||h.endsWith('.'+x)))return cb({cancel:true})}catch{}}
  cb({})
 });
 ses.on('will-download',(e,item,wc)=>{
  const w=(wc&&winOf(wc))||front(),id=++dlId,dir=dlDir||app.getPath('downloads');
  const name=item.getFilename(),ext=path.extname(name),base=path.basename(name,ext);
  let p=path.join(dir,name),i=1;
  while(fs.existsSync(p))p=path.join(dir,`${base} (${i++})${ext}`);
  item.setSavePath(p);items.set(id,item);
  wsend(w,'dl',{id,state:'start',name:path.basename(p),path:p,total:item.getTotalBytes()});
  item.on('updated',(ev,st)=>{wsend(w,'dl',{id,state:st==='interrupted'?'interrupted':item.isPaused()?'paused':'progress',received:item.getReceivedBytes(),total:item.getTotalBytes()});bar()});
  item.once('done',(ev,st)=>{wsend(w,'dl',{id,state:st,received:item.getReceivedBytes(),total:item.getTotalBytes(),path:p});items.delete(id);bar()})
 });
 ses.setPermissionRequestHandler((wc,perm,cb,det)=>{
  if(['clipboard-sanitized-write','fullscreen','pointerLock'].includes(perm))return cb(true);
  if(!PN[perm])return cb(false);
  let h='';try{h=new URL(det.requestingUrl).hostname}catch{}
  const r=dialog.showMessageBoxSync(winOf(wc)||front(),{type:'question',buttons:['Разрешить','Запретить'],defaultId:1,cancelId:1,title:'Запрос разрешения',message:`${h} запрашивает доступ: ${PN[perm]}`});
  cb(r===0)
 })
}
app.whenReady().then(()=>{Menu.setApplicationMenu(null);setupSession('persist:main');setupSession('private');create(false)});
ipcMain.on('cert:allow',(e,h)=>allowed.add(h));
ipcMain.on('adblock',(e,v)=>{adblock=!!v});
ipcMain.on('auth',(e,{id,user,pass})=>{const cb=auths.get(id);if(!cb)return;auths.delete(id);user===undefined?cb():cb(user,pass)});
ipcMain.on('dl:act',(e,{id,act,path:p})=>{
 const it=items.get(id);
 if(act==='cancel'&&it)it.cancel();
 else if(act==='pause'&&it)it.pause();
 else if(act==='resume'&&it)it.resume();
 else if(act==='open'&&p)shell.openPath(p);
 else if(act==='show'&&p)shell.showItemInFolder(p)
});
ipcMain.handle('pick-dir',async e=>{const r=await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender),{properties:['openDirectory']});if(r.canceled)return null;dlDir=r.filePaths[0];return dlDir});
ipcMain.on('set-dir',(e,d)=>{dlDir=d||null});
ipcMain.handle('clear-data',async()=>{const s=session.fromPartition('persist:main');await s.clearStorageData();await s.clearCache();return true});
ipcMain.on('win:fs',(e,v)=>{const w=BrowserWindow.fromWebContents(e.sender);if(w)w.setFullScreen(!!v)});
ipcMain.on('win:new',(e,{priv})=>create(!!priv));
ipcMain.on('tool',async(e,{id,act})=>{
 const wc=webContents.fromId(id),w=BrowserWindow.fromWebContents(e.sender);
 if(!wc||wc.isDestroyed())return;
 const name=(wc.getTitle()||'page').replace(/[\\/:*?"<>|]/g,'_').slice(0,60)||'page';
 const dir=dlDir||app.getPath('downloads');
 try{
  if(act==='devtools')wc.isDevToolsOpened()?wc.closeDevTools():wc.openDevTools({mode:'detach'});
  else if(act==='savepage'){const r=await dialog.showSaveDialog(w,{defaultPath:path.join(dir,name+'.html'),filters:[{name:'HTML',extensions:['html']}]});if(!r.canceled){await wc.savePage(r.filePath,'HTMLComplete');wsend(w,'saved',{text:'Страница сохранена',path:r.filePath})}}
  else if(act==='pdf'){const r=await dialog.showSaveDialog(w,{defaultPath:path.join(dir,name+'.pdf'),filters:[{name:'PDF',extensions:['pdf']}]});if(!r.canceled){fs.writeFileSync(r.filePath,await wc.printToPDF({}));wsend(w,'saved',{text:'PDF сохранён',path:r.filePath})}}
  else if(act==='shot'){const img=await wc.capturePage(),p=path.join(dir,'Скриншот '+new Date().toISOString().replace(/[:T]/g,'-').slice(0,19)+'.png');fs.writeFileSync(p,img.toPNG());clipboard.writeImage(img);wsend(w,'saved',{text:'Скриншот сохранён и скопирован',path:p})}
 }catch(err){wsend(w,'saved',{text:'Не удалось выполнить: '+(err.message||err)})}
});
const CT=new Set(['t','w','l','r','tab','arrowleft','arrowright','f','p','d','h','j','u','s','n','b','i','+','=','-','_','0','1','2','3','4','5','6','7','8','9']);
const EXT=/^(mailto|tel|sms):/i;
app.on('web-contents-created',(e,wc)=>{
 if(wc.getType()!=='webview')return;
 wc.setWindowOpenHandler(({url})=>{
  if(EXT.test(url))shell.openExternal(url);else wsend(winOf(wc),'open-tab',url);
  return {action:'deny'}
 });
 wc.on('will-navigate',(ev,url)=>{if(EXT.test(url)){ev.preventDefault();shell.openExternal(url)}});
 wc.on('before-input-event',(ev,i)=>{
  if(i.type!=='keyDown')return;
  const k=i.key.toLowerCase();
  if(((i.control||i.meta)&&CT.has(k))||(i.alt&&(k==='arrowleft'||k==='arrowright'))||k==='f5'||k==='f11'||k==='f12'){
   ev.preventDefault();
   wsend(winOf(wc),'key',{key:k,ctrl:i.control||i.meta,alt:i.alt,shift:i.shift})
  }
 });
 wc.on('context-menu',(e2,p)=>{
  const w=winOf(wc),t=[];
  if(p.misspelledWord){
   for(const s of (p.dictionarySuggestions||[]).slice(0,5))t.push({label:s,click:()=>wc.replaceMisspelling(s)});
   t.push({label:'Добавить в словарь',click:()=>wc.session.addWordToSpellCheckerDictionary(p.misspelledWord)},{type:'separator'})
  }
  if(p.linkURL)t.push({label:'Открыть ссылку в новой вкладке',click:()=>wsend(w,'open-tab',p.linkURL)},{label:'Копировать адрес ссылки',click:()=>clipboard.writeText(p.linkURL)},{type:'separator'});
  if(p.mediaType==='image')t.push({label:'Сохранить изображение',click:()=>wc.downloadURL(p.srcURL)},{label:'Копировать изображение',click:()=>wc.copyImageAt(p.x,p.y)},{label:'Копировать адрес изображения',click:()=>clipboard.writeText(p.srcURL)},{type:'separator'});
  if(p.isEditable)t.push({role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'});
  else if(p.selectionText)t.push({role:'copy'},{label:'Искать в Indexa: '+p.selectionText.slice(0,28),click:()=>wsend(w,'search',p.selectionText)});
  else t.push({label:'Назад',enabled:wc.canGoBack(),click:()=>wc.goBack()},{label:'Вперёд',enabled:wc.canGoForward(),click:()=>wc.goForward()},{label:'Обновить',click:()=>wc.reload()});
  t.push({type:'separator'},{label:'Исходный код страницы',click:()=>wsend(w,'open-tab','view-source:'+wc.getURL())},{label:'Исследовать элемент',click:()=>{if(!wc.isDevToolsOpened())wc.openDevTools({mode:'detach'});wc.inspectElement(p.x,p.y)}});
  Menu.buildFromTemplate(t).popup({window:w})
 })
});
app.on('window-all-closed',()=>app.quit());
