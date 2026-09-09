/* Service Worker for 旅行衣橱管家 PWA */
const CACHE = 'wardrobe-pwa-v2';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(CORE);
    }).catch(function () {
      // 允许单个资源失败，不影响安装
      return Promise.resolve();
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys
        .filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  const url = new URL(req.url);

  // Google Fonts 跨域字体也缓存，确保离线可用
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);

  if (req.method !== 'GET') return;

  // 页面导航：网络优先（有网永远拿最新版），失败才回退缓存 → 保证更新能到达用户
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (resp) {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(function (c) {
            c.put(req, copy);
            c.put('./index.html', copy);
          });
        }
        return resp;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // 静态资源：缓存优先，离线可用
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (resp) {
        const copy = resp.clone();
        if (url.origin === self.location.origin || isFont) {
          caches.open(CACHE).then(function (c) {
            c.put(req, copy);
          });
        }
        return resp;
      });
    })
  );
});
