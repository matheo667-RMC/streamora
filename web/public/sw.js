const CACHE_NAME = "streamora-v1";

// Install event
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Only cache GET requests
  if (event.request.method !== "GET") return;
  
  // Skip API requests and video streams
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.includes("video")) return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request);
      })
  );
});
