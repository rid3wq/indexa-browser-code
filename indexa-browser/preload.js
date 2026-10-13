const {contextBridge,ipcRenderer:r}=require('electron');
const on=(c,cb)=>r.on(c,(e,d)=>cb(d));
contextBridge.exposeInMainWorld('host',{
 onOpenTab:cb=>on('open-tab',cb),onKey:cb=>on('key',cb),onDl:cb=>on('dl',cb),onSearch:cb=>on('search',cb),onFs:cb=>on('fs',cb),onAuth:cb=>on('auth',cb),onSaved:cb=>on('saved',cb),
 allowCert:h=>r.send('cert:allow',h),dl:(id,act,path)=>r.send('dl:act',{id,act,path}),auth:(id,user,pass)=>r.send('auth',{id,user,pass}),
 tool:(id,act)=>r.send('tool',{id,act}),setAdblock:v=>r.send('adblock',v),newWin:priv=>r.send('win:new',{priv}),
 pickDir:()=>r.invoke('pick-dir'),setDir:d=>r.send('set-dir',d),clearData:()=>r.invoke('clear-data'),fullscreen:v=>r.send('win:fs',v)
});
