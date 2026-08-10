const CACHE_NAME = "streamora-v3";

self.addEventListener("install", () => {
  // Stay in "waiting" until the page tells us to activate (update button).
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Purge caches from previous versions so old assets (logo, theme…) disappear.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Let the page trigger activation of a freshly installed worker.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Network-first, fallback to cache (so users always get the latest when online).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.includes("video")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
