const CACHE_NAME = 'lea-constant-games-v1';

// Installation
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Fetch - avec filtrage des requêtes invalides
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP/HTTPS (extensions Chrome, etc.)
  if (!request.url.startsWith('http')) {
    return;
  }

  // Ignorer les extensions Chrome
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes vers d'autres domaines
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si la réponse est OK, on la met en cache
        if (response && response.status === 200 && response.type !== 'error') {
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache).catch((err) => {
              console.warn('[ServiceWorker] Failed to cache:', request.url, err);
            });
          });
        }
        return response;
      })
      .catch(() => {
        // Si le réseau échoue, on cherche dans le cache
        console.log('[ServiceWorker] Network failed, trying cache:', request.url);
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[ServiceWorker] Found in cache:', request.url);
            return cachedResponse;
          }

          // Si c'est une page HTML, retourne la page d'accueil
          if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});