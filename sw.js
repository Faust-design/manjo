// Netzwerk zuerst, Zwischenspeicher als Rückfall: Updates erscheinen sofort, die App öffnet auch ohne Netz.
const CACHE = 'manjo-v18';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'lib/classify.js', 'lib/drag.js', 'lib/receipt.js', 'lib/ledger.js', 'lib/items.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;
  // Eigene Dateien immer beim Server nachfragen (kurze Prüfung), damit kein alter Stand aus dem Browser-Speicher kommt
  const net = url.origin === self.location.origin ? fetch(new Request(req.url, {cache: 'no-cache', credentials: 'same-origin'})) : fetch(req);
  e.respondWith(
    net.then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
