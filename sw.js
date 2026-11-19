// Mude o número da versão sempre que publicar uma atualização.
const CACHE = 'financas-v6';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/core/backup.js',
  './src/core/bio.js',
  './src/core/capital.js',
  './src/core/cards.js',
  './src/core/categories.js',
  './src/core/dates.js',
  './src/core/goals.js',
  './src/core/ledger.js',
  './src/core/lock.js',
  './src/core/money.js',
  './src/core/plan.js',
  './src/core/subs.js',
  './src/main.js',
  './src/store/db.js',
  './src/style.css',
  './src/ui/cartoes.js',
  './src/ui/components.js',
  './src/ui/config.js',
  './src/ui/contas.js',
  './src/ui/icons.js',
  './src/ui/inicio.js',
  './src/ui/lanc.js',
  './src/ui/outras.js',
  './src/ui/plano.js',
  './src/ui/txrow.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
