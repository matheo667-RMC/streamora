const CACHE_NAME = "streamora-v4";

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
  // Only our own pages: chrome-extension:// and other schemes cannot be cached,
  // and other sites (media server, TMDB images) must not go through here.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.includes("video")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
