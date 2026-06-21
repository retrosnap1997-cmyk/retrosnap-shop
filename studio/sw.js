// ============================================================
//  Service Worker — hace que RetroSnap Studio funcione offline.
//  Cachea el "shell" de la app (sus archivos propios).
//  El modelo de IA del recorte se baja de un CDN y lo cachea
//  el navegador por separado la primera vez.
// ============================================================

const CACHE = "rs-studio-v15";
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
  "./js/editor.js",
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
  const req = e.request;
  const url = new URL(req.url);
  // Solo manejamos nuestros propios archivos (mismo origen).
  if (url.origin !== self.location.origin || req.method !== "GET") return;

  // NETWORK-FIRST: si hay internet, siempre traemos lo último y lo cacheamos.
  // Si no hay señal, caemos a lo guardado (la app sigue andando offline).
  e.respondWith(
    fetch(req).then((resp) => {
      if (resp.ok) {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copia));
      }
      return resp;
    }).catch(() => caches.match(req))
  );
});
