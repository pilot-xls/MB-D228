// Nome da cache - incrementa sempre que lanças nova versão
const CACHE_NAME = "calc-cache-v907";

// Ficheiros essenciais para a app funcionar offline
const CORE_ASSETS = [
  "./index.html",
  "./settings.html",
  "./design.css",
  "./app.js",
  "./app-version.js",
  "./auto-update.js",
  "./default_settings.json",
  "./manifest.json",
  "./service-worker.js",
  "./qr_mb_d228.png",
  "./icon.png"
];

// Instalação: pré-carrega todos os assets críticos
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting(); // força ativação imediata
});

// Ativação: limpa caches antigas
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch handler resiliente
self.addEventListener("fetch", event => {
  const req = event.request;

  // Navegações → network-first, fallback ao cache
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Assets → cache-first, depois rede
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(res => {
          if (res && res.status === 200 && req.method === "GET") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // fallback básico se falhar (por ex. CSS ou JS)
          if (req.destination === "style" || req.destination === "script") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
