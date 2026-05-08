/* ═══════════════════════════════════════════
   Viaggio Italia 2026 — Service Worker
   快取策略：App Shell (Cache First) + API (Network Only)
═══════════════════════════════════════════ */

const CACHE = 'viaggio-2026-v5';

// 離線可用的核心資源
const SHELL = [
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

/* ── Install：預先快取 App Shell ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate：清除舊快取 ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch：快取策略 ── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // ① 以下 API 需要網路，直接放行
  const networkOnly = [
    'overpass-api.de',       // POI 搜尋
    'api.mymemory.translated', // 翻譯
    'router.project-osrm.org',// 路線規劃
    'firebaseio.com',        // 記帳同步
    'tile.openstreetmap.org', // 地圖圖磚（動態，不快取）
  ];
  if (networkOnly.some(h => url.hostname.includes(h))) return;

  // ② 其餘資源：Cache First（有快取用快取，沒有再抓網路並快取）
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // 只快取成功的 GET 請求
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // 完全離線時，回傳主頁面（讓 App 顯示離線提示）
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
