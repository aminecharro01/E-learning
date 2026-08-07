// Service worker minimal, écrit à la main (pas de next-pwa — friction connue avec
// l'App Router de Next.js 15). Stratégie :
//  - /api/**            : jamais intercepté, toujours réseau (données + auth sensibles).
//  - navigation (HTML)  : network-first, repli sur le cache si hors-ligne.
//  - reste (statique)   : cache-first, alimenté au fil de l'eau (pas de précache au build).
//
// Limite connue : les vidéos/PDF sont servis via des URLs signées à expiration
// (voir MediaProperties#signedUrlTtlSeconds) — un contenu mis en cache ici cesse
// d'être lisible une fois l'URL expirée, même si le fichier est toujours en cache.

const CACHE_NAME = "iat-academy-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // jamais de cache pour l'API

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/app")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
