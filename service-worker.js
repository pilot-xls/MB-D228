const CACHE_NAME = 'calc-cache-v2';
const FILES_TO_CACHE = [
  '/MB-D228/',
  '/MB-D228/index.html',
  '/MB-D228/icone.png',
  '/MB-D228/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
