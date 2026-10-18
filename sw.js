/* Mind Map — Service Worker: أوفلاين كامل + تحديث تلقائي
   - بيحمّل كل ملفات التطبيق (بما فيها Paint) في الكاش أول مرة، وكل ملف ناقص بيتخطّاه من غير ما يبوّظ الباقي.
   - الصفحات: النت الأول (فتجيلك آخر نسخة)، ولو مفيش نت أو بطيء → من الكاش.
   - باقي الملفات: من الكاش فورًا وبيتحدّث في الخلفية. */
const BUILD = '2026-10-13.1', CACHE = 'mm-cache-' + BUILD, BASE = new URL('./', self.location).href;
const FILES = ['./', 'index.html', 'MindMap_merged.html', 'paint-EKTS-workspace.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
const abs = f => new URL(f, BASE).href;
const keyOf = u => { const x = new URL(u); return x.origin + x.pathname; }; /* من غير ?query عشان ?diag=1 و ?v=123 ما يكرّروش الكاش */

self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(CACHE);
  await Promise.allSettled(FILES.map(async f => { const r = await fetch(new Request(abs(f), { cache: 'reload' })); if (r.ok && !r.redirected) await c.put(keyOf(abs(f)), r); }));
  await self.skipWaiting();
})()));

self.addEventListener('activate', e => e.waitUntil((async () => {
  const ks = await caches.keys(); /* بنمسح كاشات Mind Map القديمة بس، مش كاشات تطبيقات تانية على نفس الدومين */
  await Promise.all(ks.filter(k => k.indexOf('mm-cache-') === 0 && k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()));

const offlineResp = () => new Response('أنت أوفلاين، والصفحة دي لسه ماتحفظتش على الجهاز. افتح التطبيق مرة وإنت متصل بالنت.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url); if (u.origin !== self.location.origin) return;
  const key = keyOf(req.url), isDoc = req.mode === 'navigate' || req.destination === 'document' || req.destination === 'iframe';
  e.respondWith((async () => {
    const c = await caches.open(CACHE), hit = await c.match(key);
    const net = fetch(req).then(r => { if (r && r.ok && !r.redirected) c.put(key, r.clone()).catch(() => { }); return r; });
    net.catch(() => { }); /* لو رجعنا من الكاش، فشل التحديث في الخلفية مش مشكلة */
    if (isDoc) {
      if (!hit) return net.catch(() => Promise.resolve(u.pathname.endsWith('/') ? c.match(keyOf(abs('index.html'))) : null).then(x => x || offlineResp()));
      return Promise.race([net.catch(() => hit), new Promise(res => setTimeout(() => res(hit), 3500))]); /* نت بطيء → الكاش */
    }
    return hit || net.catch(() => offlineResp());
  })());
});
