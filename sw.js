/* Service Worker: بيخزّن التطبيقات في المتصفح عشان تشتغل بدون إنترنت بعد أول زيارة.
   لو غيّرت أي ملف HTML على الموقع: غيّر رقم VERSION تحت عشان النسخة الجديدة تتنزل. */
const VERSION = 'v1';
const CACHE = 'adawaty-' + VERSION;
const FILES = ['./', './index.html', './MindMap_merged.html', './paint-EKTS-workspace.html',
               './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('adawaty-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
/* من الكاش أولًا (سريع وأوفلاين)، وبيتحدّث في الخلفية لو النت موجود */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r && r.ok) c.put(req.url.split('?')[0], r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (req.mode === 'navigate' ? c.match('./index.html') : Response.error());
  }));
});
