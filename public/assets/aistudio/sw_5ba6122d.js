/* Service worker: chỉ lưu "vỏ" ứng dụng để mở nhanh / cài được như app.
   Nhạc và API của Google Drive luôn đi thẳng ra mạng (không bị cache). */
const CACHE = 'mp-shell-v3';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'config.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Chỉ xử lý file của chính web này; Google Drive API / nhạc đi thẳng ra mạng
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Ưu tiên mạng (để cập nhật bản mới ngay), mất mạng thì dùng bản đã lưu
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
