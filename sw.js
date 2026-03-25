const CACHE_NAME = 'sla-pwa-cache-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  // Pass-through strategy for dynamic cloud app (Firebase)
  event.respondWith(fetch(event.request));
});
