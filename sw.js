/* ═══════════════════════════════════════════
   Viaggio Italia 2026 — Service Worker v8
   雙 Cache 策略：App Shell + Map Tiles 分離
═══════════════════════════════════════════ */
const CACHE      = 'viaggio-2026-v8';
const TILE_CACHE = 'viaggio-tiles-v1';
const TILE_MAX   = 2000; // 最多快取 tile 數量

const SHELL = [
  './index.html','./manifest.json','./icon.svg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

/* ── Install：預快取 App Shell ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

/* ── Activate：清除舊 cache ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE && k !== TILE_CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch：三層路由策略 ── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 1. Map Tiles → Cache-first，快取住以後離線可用
  if (url.hostname.includes('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(TILE_CACHE).then(async tileCache => {
        const cached = await tileCache.match(e.request);
        if (cached) return cached;
        try {
          const res = await fetch(e.request);
          if (res.ok) {
            // 限制快取總數，超過則清除最舊的 30 筆
            const keys = await tileCache.keys();
            if (keys.length >= TILE_MAX) {
              await Promise.all(keys.slice(0, 30).map(k => tileCache.delete(k)));
            }
            tileCache.put(e.request, res.clone());
          }
          return res;
        } catch {
          // 離線且無快取：回傳 1x1 透明 PNG，讓地圖顯示灰格而非錯誤
          return new Response(
            atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
            { headers: { 'Content-Type': 'image/png' } }
          );
        }
      })
    );
    return;
  }

  // 2. 需要即時資料的 API → 永遠走網路，不快取
  const networkOnly = [
    'overpass-api.de','api.mymemory','router.project-osrm',
    'firebaseio.com','open.er-api','exchangerate-api'
  ];
  if (networkOnly.some(h => url.hostname.includes(h))) return;

  // 3. App Shell / 靜態資源 → Cache-first，網路回退並更新快取
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
