/**
 * Service Worker (GitHub Pages: /codekids/ ostida). Barcha yo'llar SW scope'iga nisbatan.
 * Navigatsiya: network-first (oflayn -> index.html). Statik: stale-while-revalidate.
 * Backend (boshqa origin) hech qachon keshlanmaydi.
 */
const VERSION = 'ck-v3';
const SCOPE = self.registration.scope;
const SHELL = [SCOPE, `${SCOPE}index.html`, `${SCOPE}manifest.json`];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match(`${SCOPE}index.html`)));
    return;
  }
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
