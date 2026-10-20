// Service worker: permite abrir El Cerebro sin conexión.
// Estrategia "red primero": con internet siempre carga la versión más reciente;
// sin internet usa la última copia guardada. Tus DATOS no pasan por aquí (están en IndexedDB).

const CACHE = 'cerebro-v5';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/config.js',
  './js/data/db.js', './js/data/store.js', './js/data/backup.js',
  './js/logic/util.js', './js/logic/trading.js', './js/logic/summary.js', './js/logic/goals.js',
  './js/ui/components.js', './js/ui/goals.js', './js/ui/update.js', './js/ui/log.js',
  './js/ui/office.js', './js/ui/data-page.js', './js/ui/departments.js',
  './js/ui/dept-trading.js', './js/ui/dept-mapa.js', './js/ui/dept-uni.js', './js/ui/hud.js',
  './icons/icon-192.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // cache: 'no-cache' obliga a comprobar con el servidor si hay una versión nueva (respuesta 304 si no cambió).
  const network = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache' }) : fetch(req, { cache: 'no-cache' });
  event.respondWith(
    network
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))),
  );
});
