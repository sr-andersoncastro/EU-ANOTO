/* Cache offline do Eu Anoto. Aumente VERSION a cada publicação para forçar atualização. */
const VERSION='eu-anoto-v0.9.1';
const FILES=['./','index.html','app.css','core.js','ui.js','dialogs.js','voice.js','export.js','device.js','ios-bridge.js','app-icon.png','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));
});
