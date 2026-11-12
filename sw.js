// Service worker for the installed web app (Add to Home Screen).
// Network first, so a new deploy shows up straight away; the cache is only the
// fallback when the phone is offline. Videos are left to the browser (range requests).
const CACHE = 'nomad-manti-v1';
const SHELL = [
  './', 'index.html', 'order.html', 'manifest.webmanifest',
  'css/style.css', 'css/order.css',
  'js/main.js', 'js/order.js', 'js/app.js', 'js/i18n.js', 'js/translations.js',
  'js/menu-data.js', 'js/menu-translations.js', 'js/site-config.js',
  'assets/favicon.svg', 'assets/app/icon-180.png', 'assets/video/hero-v3-poster.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || req.headers.has('range') || url.pathname.includes('/assets/video/')) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit ?? Response.error())),
  );
});
