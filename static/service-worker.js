/**
 * Service Worker for Offline Support
 * Caches all assets and provides offline functionality
 */

const CACHE_NAME = 'lea-constant-games-v20';
const ASSETS_TO_CACHE = [
    '/',
    '/static/app.js',
    '/static/game_results.js',
    '/static/background.png',
    '/static/results/0-1-2.png',
    '/static/results/3-4.png',
    '/static/results/5-6.png',
    '/static/results/7-8.png',
    '/static/results/9-10.png',
    '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
            .catch((error) => {
                console.error('[SW] Install failed:', error);
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Ignore non-http(s) requests (chrome-extension, etc.)
    if (!event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request)
                    .then((fetchResponse) => {
                        // Only cache valid responses
                        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type === 'error') {
                            return fetchResponse;
                        }

                        // Don't cache API calls
                        if (event.request.url.includes('/api/')) {
                            return fetchResponse;
                        }

                        // Clone and cache the response
                        const responseToCache = fetchResponse.clone();

                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache).catch((error) => {
                                // Silently ignore cache errors (e.g., from extensions)
                                console.warn('[SW] Cache put failed:', error.message);
                            });
                        });

                        return fetchResponse;
                    })
                    .catch((error) => {
                        // Offline fallback - MUST return a Response
                        console.log('[SW] Fetch failed, using offline fallback:', error);

                        if (event.request.destination === 'image') {
                            // Return empty response for images
                            return new Response('', { status: 404, statusText: 'Not Found' });
                        }

                        // For HTML requests, return cached index
                        if (event.request.headers.get('accept')?.includes('text/html')) {
                            return caches.match('/').then(cachedResponse => {
                                return cachedResponse || new Response('Offline', {
                                    status: 503,
                                    statusText: 'Service Unavailable'
                                });
                            });
                        }

                        // For everything else, return a generic error response
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});