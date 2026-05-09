/* ═══════════════════════════════════════════
   Viaggio Italia 2026 — Service Worker v7
═══════════════════════════════════════════ */
const CACHE = 'viaggio-2026-v7';
const SHELL = ['./index.html','./manifest.json','./icon.svg','https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);const networkOnly=['overpass-api.de','api.mymemory','router.project-osrm','firebaseio.com','tile.openstreetmap.org','open.er-api','exchangerate-api'];if(networkOnly.some(h=>url.hostname.includes(h)))return;e.respondWith(caches.match(e.request).then(cached=>{if(cached)return cached;return fetch(e.request).then(response=>{if(response.ok&&e.request.method==='GET'){const clone=response.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));}return response;}).catch(()=>{if(e.request.mode==='navigate')return caches.match('./index.html');});});});});
