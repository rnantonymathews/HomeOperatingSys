const CACHE_NAME = 'homeos-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/tvos-core.css',
  './css/launcher.css',
  './js/main.js',
  './js/navigation.js',
  './js/sound.js',
  './js/apps.js',
  './js/controlcenter.js',
  './js/qr.js',
  '../shared/protocol.js',
  '../shared/homelink.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW HomeOS] Caching launcher assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('[SW HomeOS] Cache warning:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network first with cache fallback for fresh dev
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

