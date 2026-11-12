const CACHE_NAME = 'homemote-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/mote-core.css',
  './css/remote.css',
  './js/main.js',
  './js/touchpad.js',
  './js/haptics.js',
  './js/voice.js',
  './js/keyboard.js',
  '../shared/protocol.js',
  '../shared/homelink.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW HomeMote] Caching remote assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('[SW HomeMote] Cache warning:', err));
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
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
