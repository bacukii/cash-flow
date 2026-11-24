const CACHE_NAME = 'cash-flow-v1.0.6';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 1. Install: Cache seluruh App Shell dan langsung aktifkan SW baru
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// 2. Activate: Bersihkan cache versi lama khusus prefix cash-flow- dan ambil alih kontrol
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('cash-flow-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// 3. Fetch: Navigation Fallback + Cache-First untuk App Shell, bypass mutasi & origin eksternal
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bypass request non-GET (POST, PUT, DELETE)
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Hanya tangani aset dari origin yang sama (GitHub Pages / localhost)
  if (url.origin !== self.location.origin) return;

  // Navigation request (HTML): utamakan cache dengan ignoreSearch dan fallback ke ./index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request, { ignoreSearch: true })
        .then((cachedPage) => cachedPage || fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          }
          return networkResponse;
        }))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Aset statis App Shell (Cache-First + Network Fallback aman saat offline)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => Response.error());
    })
  );
});
