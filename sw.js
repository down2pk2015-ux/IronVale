/* Ironvale service worker — always-fresh page, offline-capable.
   You no longer need to bump CACHE_VERSION on every upload: the page is
   revalidated against the network on each load (a conditional request that only
   re-downloads when index.html actually changed), so new builds load by
   themselves. Bumping the version below still works if you ever want to force a
   full cache purge for all players. */
const CACHE_VERSION = 'ironvale-v41';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Always-fresh page: revalidate index.html / navigations against the network
  // every load. {cache:'no-cache'} forces a conditional request, so the browser/CDN
  // HTTP cache can no longer hand back a stale build. Falls back to cache when offline.
  if (e.request.mode === 'navigate' || e.request.url.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' }).then(r => {
        const copy = r.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
