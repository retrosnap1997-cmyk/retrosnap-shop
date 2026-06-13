// ============================================================
//  Service Worker — hace que RetroSnap Studio funcione offline.
//  Cachea el "shell" de la app (sus archivos propios).
//  El modelo de IA del recorte se baja de un CDN y lo cachea
//  el navegador por separado la primera vez.
// ============================================================

const CACHE = "rs-studio-v4";
const SHELL = [
  "./",
  "./index.html",
  "./studio.css",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./js/app.js",
  "./js/db.js",
  "./js/camera.js",
  "./js/cutout.js",
  "./js/codes.js",
  "./js/catalog.js",
  "./js/export.js",
  "./js/templates.js",
  "./js/cloud.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Solo manejamos nuestros propios archivos (mismo origen).
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cacheado) => {
      if (cacheado) return cacheado;
      return fetch(e.request).then((resp) => {
        // Guardamos en cache lo que vamos pidiendo del propio sitio.
        if (resp.ok && e.request.method === "GET") {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return resp;
      }).catch(() => cacheado);
    })
  );
});
