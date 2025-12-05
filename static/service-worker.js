const CACHE_NAME = 'lea-constant-games-v1';
const urlsToCache = [
  '/',
  '/static/game_results.js',
  '/static/background.png',
  '/static/results/0_1_2.png',
  '/static/results/3_4.png',
  '/static/results/7_8.png',
  '/static/results/9_10.png',
  '/flag-game/',
  '/toulouse/',
  '/top14-quiz/',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Stratégie: Cache First, puis Network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourne depuis le cache si disponible
        if (response) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }

        // Sinon, fetch depuis le réseau et met en cache
        return fetch(event.request)
          .then((response) => {
            // Vérifie si la réponse est valide
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone la réponse
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Si offline et pas dans le cache, retourne une page d'erreur
            console.log('Service Worker: Offline and not cached:', event.request.url);
          });
      })
  );
});