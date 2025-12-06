const CACHE_NAME = 'lea-constant-games-v2'; // Changez la version pour forcer la mise à jour
const STATIC_CACHE = 'static-v2';

// Fichiers critiques à pré-cacher
const PRECACHE_URLS = [
  '/',
  '/static/game_results.js',
];

// Installation - Pré-cache les fichiers essentiels
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching static assets');
        return cache.addAll(PRECACHE_URLS.map(url => new Request(url, {cache: 'reload'})));
      })
      .then(() => {
        console.log('[ServiceWorker] Pre-cache complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Pre-cache failed:', error);
      })
  );
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Activated');
      return self.clients.claim();
    })
  );
});

// Fetch - Stratégie Cache First pour tout
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignorer les requêtes non-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }

  // Ignorer les extensions
  if (request.url.includes('chrome-extension')) {
    return;
  }

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[ServiceWorker] ✓ Cache hit:', request.url);
          return cachedResponse;
        }

        console.log('[ServiceWorker] ⟳ Fetching:', request.url);

        return fetch(request)
          .then((response) => {
            // Ne pas cacher les erreurs
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone pour le cache
            const responseToCache = response.clone();

            // Détermine le cache à utiliser
            const cacheName = request.url.includes('/static/') ? STATIC_CACHE : CACHE_NAME;

            caches.open(cacheName)
              .then((cache) => {
                cache.put(request, responseToCache)
                  .then(() => {
                    console.log('[ServiceWorker] ✓ Cached:', request.url);
                  })
                  .catch((err) => {
                    console.warn('[ServiceWorker] ✗ Cache failed:', request.url, err.message);
                  });
              });

            return response;
          })
          .catch((error) => {
            console.log('[ServiceWorker] ✗ Fetch failed:', request.url, error.message);

            // Fallback vers le cache
            return caches.match(request)
              .then((cachedResponse) => {
                if (cachedResponse) {
                  console.log('[ServiceWorker] ✓ Fallback cache hit:', request.url);
                  return cachedResponse;
                }

                // Si c'est une navigation, retourne la page d'accueil
                if (request.mode === 'navigate') {
                  return caches.match('/');
                }
              });
          });
      })
  );
});