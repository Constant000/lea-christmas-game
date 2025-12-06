/**
 * Service Worker for Offline Support
 * Caches all assets and provides offline functionality
 */

const CACHE_NAME = 'lea-constant-games-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/static/app.js',
    '/static/game_results.js',
    '/static/background.png',
    '/static/results/0-1-2.png',
    '/static/results/3-4.png',
    '/static/results/5-6.png',
    '/static/results/7-8.png',
    '/static/results/9=10.png',
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
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request)
                    .then((fetchResponse) => {
                        // Cache new resources (except API calls)
                        if (!event.request.url.includes('/api/')) {
                            return caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, fetchResponse.clone());
                                return fetchResponse;
                            });
                        }
                        return fetchResponse;
                    })
                    .catch(() => {
                        // Offline fallback
                        if (event.request.destination === 'image') {
                            // Return placeholder for images
                            return new Response('', { status: 404 });
                        }
                        // For HTML requests, return cached index
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/');
                        }
                    });
            })
    );
});