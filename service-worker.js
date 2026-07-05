const CACHE_NAME = 'fitness-counter-v14';
const APP_SHELL = [
  './',
  './index.html',
  './calories.html',
  './summary.html',
  './style.css',
  './weight.js',
  './calories.js',
  './summary.js',
  './storage.js',
  './charts.js',
  './date-carousel.js',
  './food-search.js',
  './config.js',
  './auth.js',
  './auth-ui.js',
  './sheets-api.js',
  './drive-api.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Only cache-first our own app shell. Cross-origin calls (Sheets/Drive API,
  // Google Identity Services, the Chart.js CDN) must always hit the network —
  // caching them would silently serve stale Sheets data after every edit.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return Response.error();
        });
    })
  );
});
