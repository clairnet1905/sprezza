// Service worker SPREZZA : coque applicative hors ligne, polices en cache, API jamais mise en cache.
const VERSION = 'sprezza-v58';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'src/styles.css', 'src/app.js', 'src/state.js',
  'src/lib/html.js', 'src/components/ui.js', 'src/components/mannequin.js', 'src/repositories/db.js',
  'src/data/colors.js', 'src/data/occasions.js', 'src/data/styles.js', 'src/data/guide.js', 'src/data/capsule.js', 'src/data/retailers.js', 'src/data/photos.js', 'src/data/taxonomy.js', 'src/data/chapters.js',
  'src/domain/colors.js', 'src/domain/scoring.js', 'src/domain/recommend.js', 'src/domain/weather.js', 'src/domain/validate.js', 'src/domain/wardrobe-logic.js', 'src/domain/review.js', 'src/domain/care.js', 'src/domain/seasonal.js', 'src/domain/product-parse.js',
  'src/services/image.js', 'src/services/weather.js', 'src/services/ai.js', 'src/services/sync.js', 'src/services/pexels.js', 'src/services/cutout.js', 'tools/cutout-frame.html', 'tools/cutout-frame.js', 'src/services/ocr.js', 'src/services/product-fetch.js', 'tools/ocr-frame.html', 'tools/ocr-frame.js', 'src/config.js',
  'src/features/shared.js', 'src/features/today.js', 'src/features/daily.js', 'src/features/wardrobe.js', 'src/features/outfits.js', 'src/features/colors.js', 'src/features/academy.js', 'src/features/analysis.js',
  'src/features/shopping.js', 'src/features/favorites.js', 'src/features/calendar.js', 'src/features/capsule.js', 'src/features/profile.js', 'src/features/settings.js', 'src/features/more.js',
  'assets/icons/icon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' : la coque hors ligne est toujours prise sur le serveur, jamais dans un cache HTTP périmé.
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) return; // jamais en cache
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(VERSION + '-fonts').then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { if (r.ok || r.type === 'opaque') { const copy = r.clone(); c.put(e.request, copy); } return r; })));
    return;
  }
  if (url.origin !== location.origin) return; // météo et liens externes : réseau direct
  // Réseau d'abord (mises à jour immédiates), cache en secours hors ligne.
  // cache: 'no-cache' : revalide toujours auprès du serveur (sinon le cache HTTP de GitHub Pages retarde les mises à jour de 10 min).
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
