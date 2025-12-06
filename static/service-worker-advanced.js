const CACHE_NAME = 'lea-constant-games-v1';
const DYNAMIC_CACHE = 'lea-constant-dynamic-v1';

// Fichiers essentiels à mettre en cache immédiatement
const STATIC_ASSETS = [
  '/',
  '/static/game_results.js',
  '/static/background.png',
  '/static/manifest.json',
];

// Installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Stratégie de cache intelligente
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas cacher les requêtes API externes
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', request.url);
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200) {
              return response;
            }

            const responseToCache = response.clone();

            // Cache dynamique pour les images, CSS, JS
            if (
              request.url.includes('.png') ||
              request.url.includes('.jpg') ||
              request.url.includes('.css') ||
              request.url.includes('.js') ||
              request.url.includes('/flag-game/') ||
              request.url.includes('/toulouse-game/') ||
              request.url.includes('/top14-quiz/')
            ) {
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  console.log('[SW] Caching dynamically:', request.url);
                  cache.put(request, responseToCache);
                });
            }

            return response;
          })
          .catch((error) => {
            console.log('[SW] Fetch failed, offline:', request.url);
            // Retourner une page offline personnalisée si nécessaire
            return caches.match('/');
          });
      })
  );
});

// Message pour forcer la mise à jour
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});