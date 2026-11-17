const CACHE_NAME = 'cash-flow-v1.0.1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 1. Install: Cache seluruh App Shell (~30KB) dan langsung aktifkan SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// 2. Activate: Bersihkan cache versi lama dan ambil alih kontrol halaman seketika
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

// 3. Fetch: Cache-First untuk App Shell, bypass untuk mutasi/API eksternal
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Bypass request non-GET (POST, PUT, DELETE)
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Hanya cache aset dari origin yang sama (GitHub Pages / localhost)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return networkResponse;
      });
    })
  );
});

