const CACHE_VERSION = 'v4';
const CACHE_NAME = `lea-constant-games-${CACHE_VERSION}`;

// Liste complète des fichiers à pré-cacher
const PRECACHE_URLS = [
  '/',
  '/flag-game/',
  '/toulouse/',
  '/top14-quiz/',
  '/static/game_results.js',
  '/static/background.png',
  '/static/results/0_1_2.png',
  '/static/results/3_4.png',
  '/static/results/7_8.png',
  '/static/results/9_10.png',
];

// Installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version', CACHE_VERSION);

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Cache les URLs une par une
      for (const url of PRECACHE_URLS) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            console.log('[SW] ✓ Cached:', url);
          } else {
            console.warn('[SW] ✗ Failed:', url, response.status);
          }
        } catch (error) {
          console.error('[SW] ✗ Error:', url, error.message);
        }
      }

      console.log('[SW] ✓ Pre-cache complete');
      await self.skipWaiting();
    })()
  );
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version', CACHE_VERSION);

  event.waitUntil(
    (async () => {
      // Supprime les anciens caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );

      console.log('[SW] ✓ Activated');
      await self.clients.claim();
    })()
  );
});

// Fetch - Cache First avec fallback intelligent
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Filtres
  if (!request.url.startsWith('http')) return;
  if (request.url.includes('chrome-extension')) return;
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      // 1. Cherche dans le cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('[SW] ✓ Cache:', request.url);

        // Mise à jour en arrière-plan (stale-while-revalidate)
        event.waitUntil(
          fetch(request).then((response) => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {})
        );

        return cachedResponse;
      }

      // 2. Sinon, fetch depuis le réseau
      try {
        console.log('[SW] ⟳ Network:', request.url);
        const response = await fetch(request);

        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
          console.log('[SW] ✓ Cached new:', request.url);
        }

        return response;
      } catch (error) {
        console.log('[SW] ✗ Network failed:', request.url);

        // 3. Fallback intelligent
        // Pour les pages HTML, retourne la page d'accueil
        if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
          const homeCache = await caches.match('/');
          if (homeCache) {
            console.log('[SW] ⟳ Fallback to home');
            return homeCache;
          }
        }

        // Pour les API, retourne une réponse vide
        if (request.url.includes('/api/')) {
          return new Response(
            JSON.stringify({ error: 'Offline - no cached data' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }

        throw error;
      }
    })()
  );
});

console.log('[SW] Script loaded, version', CACHE_VERSION);