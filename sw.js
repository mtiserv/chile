const CACHE_NAME = 'mti-cmms-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/equipo.html',
  '/index.css',
  '/app.js',
  '/database.js',
  '/manifest.json',
  '/data/logo.png'
];

// Install Event - cache the static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - clean old caches
self.addEventListener('activate', (event) => {
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
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - cache-first with network fallback
self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS (ignore chrome-extension, etc.)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // Return cached response
          return response;
        }

        // Clone request for fetch
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Cache newly fetched assets (except API endpoints)
          if (!fetchRequest.url.includes('/api/')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }

          return networkResponse;
        });
      })
  );
});
