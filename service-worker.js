// Nome da cache (altera para forçar atualização quando modificares ficheiros)
const CACHE_NAME = 'calc-cache-v906';

// Lista de ficheiros a guardar para acesso offline
const FILES_TO_CACHE = [
  './',
  './index.html',
  './settings.html',
  './default_settings.json',
  './design.css',
  './app.js',
  './app-version.js',
  './auto-update.js',
  './qr_mb_d228.png',
  './icone.png',
  './manifest.json',
  './service-worker.js'
];

// Instalação: mete ficheiros na cache + força SW imediato
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Fetch: responde da cache ou da rede
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Ativação: apaga caches antigas + assume controlo + avisa app
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  clients.claim();
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ type: 'NEW_VERSION' }));
  });
});

// Mensagem vinda da app (para skipWaiting manual)
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

