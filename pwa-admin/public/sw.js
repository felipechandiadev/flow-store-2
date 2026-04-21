// Cache de páginas críticas
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('flow-admin-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/dashboard',
        '/offline.html',
      ]);
    })
  );
});

// Estrategia de cache: Network First para datos dinámicos
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
  }
});