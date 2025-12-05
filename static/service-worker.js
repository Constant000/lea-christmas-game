const CACHE_NAME = 'lea-constant-games-v1';

// Fichiers essentiels à mettre en cache
const FILES_TO_CACHE = [
  '/',
  '/static/game_results.js',
  '/static/background.png',
];

// Installation - Cache uniquement les fichiers qui existent
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[ServiceWorker] Caching app shell');

      // Cache les fichiers un par un pour éviter qu'une erreur bloque tout
      const cachePromises = FILES_TO_CACHE.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            console.log('[ServiceWorker] Cached:', url);
          } else {
            console.warn('[ServiceWorker] Failed to cache (not found):', url);
          }
        } catch (error) {
          console.warn('[ServiceWorker] Failed to cache:', url, error);
        }
      });

      await Promise.all(cachePromises);
      console.log('[ServiceWorker] All files cached');
    })
  );
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

// Fetch - Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  // Ignore les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la réponse est OK, on la met en cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
            console.log('[ServiceWorker] Cached new resource:', event.request.url);
          });
        }
        return response;
      })
      .catch(() => {
        // Si le réseau échoue, on cherche dans le cache
        console.log('[ServiceWorker] Network failed, trying cache:', event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[ServiceWorker] Found in cache:', event.request.url);
            return cachedResponse;
          }

          // Si c'est une page HTML, retourne la page d'accueil
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});