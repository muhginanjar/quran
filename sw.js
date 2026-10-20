/* Quran Offline — service worker: precache shell+data, cache-first untuk audio */
'use strict';
const SHELL = 'quran-shell-v13';
const AUDIO = 'quran-audio';
const AUDIO_MAX = 400; // simpan ±400 file mp3 terakhir (LRU)

const ASSETS = [
  './', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'data/quran-data.js', 'data/mushaf-lines.js',
  'fonts/amiri-arabic-400.woff2', 'fonts/amiri-arabic-700.woff2', 'fonts/amiri-quran-arabic.woff2', 'fonts/sakkal-majalla.woff2', 'fonts/reem-kufi-arabic.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];

addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await Promise.allSettled(ASSETS.map(a => c.add(new Request(a, { cache: 'reload' }))));
    self.skipWaiting();
  })());
});

addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== SHELL && k !== AUDIO) ? caches.delete(k) : null));
    await clients.claim();
  })());
});

addEventListener('message', e => {
  if (e.data === 'clear-audio') e.waitUntil(caches.delete(AUDIO));
});

async function trimAudio(cache) {
  const keys = (await cache.keys()).map(r => r.url);
  const too = keys.length - AUDIO_MAX;
  if (too > 0) for (const u of keys.slice(0, too)) await cache.delete(u);
}

addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Audio qiraah dari CDN → ambil utuh (tanpa Range), cache-first untuk offline
  if (url.hostname === 'cdn.islamic.network') {
    e.respondWith((async () => {
      const cache = await caches.open(AUDIO);
      const hit = await cache.match(url.href);
      if (hit) return hit;
      const res = await fetch(url.href, { mode: 'no-cors' });
      if (res.ok || res.type === 'opaque') {
        try { await cache.put(url.href, res.clone()); trimAudio(cache); } catch { }
      }
      return res;
    })().catch(() => Response.error()));
    return;
  }

  // Aset aplikasi → cache-first dengan fallback jaringan (untuk pengembangan)
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const hit = await caches.match(req, { ignoreSearch: false });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { const c = await caches.open(SHELL); await c.put(req, res.clone()); }
      return res;
    })().catch(async () => {
      if (req.mode === 'navigate') { const idx = await caches.match('index.html'); if (idx) return idx; }
      return Response.error();
    }));
  }
});
