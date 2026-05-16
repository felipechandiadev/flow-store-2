// Cache de páginas críticas e iconos PWA (v2: invalida instalaciones con manifest FlowStore en caché)
const CACHE_NAME = "flow-admin-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        "/",
        "/dashboard",
        "/offline.html",
        "/logo.png",
        "/android-chrome-192x192.png",
        "/android-chrome-512x512.png",
        "/favicon-32x32.png",
      ]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname === "/manifest.json" || url.pathname === "/manifest.webmanifest") {
    event.respondWith(fetch(request));
    return;
  }

  if (request.url.includes("/api/")) {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
  }
});
