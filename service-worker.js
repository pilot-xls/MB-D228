// Nome da cache (altera para forçar atualização quando modificares ficheiros)
const CACHE_NAME = 'calc-cache-v4';

// Lista de ficheiros a guardar para acesso offline
const FILES_TO_CACHE = [
  './',
  './index.html',
  './settings.html',
  './default_settings.json',
  './design.css',
  './app-version.js',
  './auto-update.js',
  './icone.png',
  './manifest.json',
  './service-worker.js'
];


// Evento de instalação: corre quando o SW é instalado pela primeira vez
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Guardar os ficheiros definidos na cache
      console.log('Ficheiros guardados na cache durante a instalação.');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// Evento de fetch: intercepta pedidos da app e tenta servir da cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Se estiver na cache, usa o cache. Caso contrário, faz pedido à net.
        return response || fetch(event.request);
      })
  );
});
//Apaga as caches antigas automaticamente
self.addEventListener('activate', (event) => {
  const allowedCaches = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (!allowedCaches.includes(key)) {
            console.log('A apagar cache antiga:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});
// Permitir update imediato quando o utilizador clica em "Atualizar agora"
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
