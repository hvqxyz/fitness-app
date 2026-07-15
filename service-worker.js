const CACHE_NAME = 'fitness-counter-v79';
const APP_SHELL = [
  './',
  './index.html',
  './weight/index.html',
  './weight/weight.js',
  './calories/index.html',
  './calories/calories.js',
  './profile/index.html',
  './profile/profile.js',
  './workouts/running/index.html',
  './workouts/gym/index.html',
  './workouts/other/index.html',
  './workouts/shared.js',
  './performance/index.html',
  './performance/performance.js',
  './common/style.css',
  './common/app-header.js',
  './common/storage.js',
  './common/charts.js',
  './common/workout-chart.js',
  './common/workout-list.js',
  './common/date-carousel.js',
  './common/week-carousel.js',
  './common/food-search.js',
  './common/config.js',
  './common/auth.js',
  './common/auth-ui.js',
  './common/sheets-api.js',
  './common/drive-api.js',
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
            return caches.match('./weight/index.html');
          }
          return Response.error();
        });
    })
  );
});
