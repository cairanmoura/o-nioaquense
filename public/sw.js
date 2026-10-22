/**
 * sw.js — Service Worker do O Nioaquense (PWA)
 * -----------------------------------------------------------------------------
 * Estrategia:
 *   - navegacao (paginas): rede primeiro; se offline, pagina de fallback;
 *   - estaticos (/_astro, /icons, /covers): cache primeiro + revalidacao;
 *   - painel e APIs: nunca passam pelo service worker.
 */

const CACHE_NAME = 'onioaquense-v1';
const PRECACHE = ['/offline.html', '/manifest.json', '/favicon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Painel e APIs ficam de fora do cache do service worker.
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api')) return;

  // Paginas: rede primeiro (a borda do Cloudflare ja segura o cache).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html')),
    );
    return;
  }

  // Estaticos: cache primeiro, revalidando em segundo plano.
  if (
    url.pathname.startsWith('/_astro/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/covers/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || network;
      }),
    );
  }
});
