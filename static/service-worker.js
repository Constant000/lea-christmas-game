const CACHE_NAME = 'lea-constant-games-v3'; // Nouvelle version

// Fichiers à pré-cacher (pages principales)
const PRECACHE_URLS = [
  '/',
  '/flag-game/',
  '/toulouse/',
  '/top14-quiz/',
  '/static/game_results.js',
];

// Installation - Pré-cache tout
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing v3...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching pages...');

        // Cache chaque URL individuellement pour voir les erreurs
        const cachePromises = PRECACHE_URLS.map((url) => {
          return fetch(url)
            .then((response) => {
              if (response.ok) {
                console.log('[ServiceWorker] ✓ Cached:', url);
                return cache.put(url, response);
              } else {
                console.warn('[ServiceWorker] ✗ Failed to cache:', url, response.status);
              }
            })
            .catch((error) => {
              console.error('[ServiceWorker] ✗ Error caching:', url, error.message);
            });
        });

        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('[ServiceWorker] ✓ All pages cached, skipping waiting');
        return self.skipWaiting();
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
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] ✓ Activated and claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Filtres de sécurité
  if (!request.url.startsWith('http')) return;
  if (request.url.includes('chrome-extension')) return;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[ServiceWorker] ✓ Serving from cache:', request.url);
          return cachedResponse;
        }

        console.log('[ServiceWorker] ⟳ Fetching from network:', request.url);

        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache)
                  .then(() => console.log('[ServiceWorker] ✓ Cached:', request.url))
                  .catch((err) => console.warn('[ServiceWorker] ✗ Cache put failed:', err.message));
              });

            return response;
          })
          .catch((error) => {
            console.log('[ServiceWorker] ✗ Network failed:', request.url);

            // Cherche dans le cache
            return caches.match(request)
              .then((cachedResponse) => {
                if (cachedResponse) {
                  console.log('[ServiceWorker] ✓ Fallback to cache:', request.url);
                  return cachedResponse;
                }

                // Fallback vers la page d'accueil pour les navigations
                if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
                  console.log('[ServiceWorker] ⟳ Fallback to home page');
                  return caches.match('/');
                }

                throw error;
              });
          });
      })
  );
});

console.log('[ServiceWorker] Script loaded');