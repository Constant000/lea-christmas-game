const CACHE_VERSION = 'v8';
const CACHE_NAME = `lea-constant-games-${CACHE_VERSION}`;

const PRECACHE_URLS = [
    '/',
    '/flag-game/',
    '/toulouse-game/',
    '/top14-quiz/',
    '/flag-game/api/all-countries',
    '/toulouse-game/api/all-players',
    '/top14-quiz/api/all-data',
    '/static/game_results.js',
    '/static/background.png',
    '/static/results/0-1-2.png',
    '/static/results/3-4.png',
    '/static/results/5-6.png',
    '/static/results/7-8.png',
    '/static/results/9-10.png',
    '/manifest.json',
];

// Installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version', CACHE_VERSION);

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

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

// Fetch
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
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('[SW] ✓ Cache:', request.url);
        return cachedResponse;
      }

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

        if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
          const homeCache = await caches.match('/');
          if (homeCache) {
            console.log('[SW] ⟳ Fallback to home');
            return homeCache;
          }
        }

        throw error;
      }
    })()
  );
});

console.log('[SW] Script loaded, version', CACHE_VERSION);