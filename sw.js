// ── UDK Gazbeton Service Worker ──────────────────────────────
// Версія кешу — змінюй при оновленні сайту (наприклад: 'v2', 'v3')
const CACHE_NAME = 'udk-gazbeton-v5';

// Файли що кешуються при першому відвідуванні
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/assets/js/main.js',
  '/assets/images/UDK1.png',
  '/assets/images/UDK2.png',
  '/assets/images/UDK3.png',
  '/assets/images/UDK4.png',
  '/assets/images/UDK5.png',
  '/assets/images/UDK6.png'
];

// Зовнішні ресурси що також кешуються (Formspree бібліотека)
const EXTERNAL_ASSETS = [
  'https://unpkg.com/@formspree/ajax@1',
];

// ── INSTALL: кешуємо всі файли ───────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Кешуємо локальні файли
      cache.addAll(STATIC_ASSETS).catch(() => {});
      // Намагаємось закешувати зовнішні (якщо є інтернет)
      EXTERNAL_ASSETS.forEach(url => {
        fetch(url).then(response => {
          if (response.ok) cache.put(url, response);
        }).catch(() => {});
      });
    })
  );
  // Активуємо одразу, не чекаємо закриття старих вкладок
  self.skipWaiting();
});

// ── ACTIVATE: видаляємо старі кеші ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ── FETCH: перехоплюємо запити ────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Google Maps та Maps API — не чіпаємо, хай самі обробляють помилку
  if (url.includes('google.com/maps') || url.includes('maps.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Якщо є в кеші — повертаємо з кешу (офлайн працює!)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Немає в кеші — йдемо в мережу
      return fetch(event.request).then((networkResponse) => {
        // Зберігаємо успішну відповідь у кеш для майбутнього
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Офлайн і немає в кеші — повертаємо головну сторінку
        if (event.request.mode === 'navigate') {
          return caches.match('/') || caches.match('/index.html');
        }
        // Для інших ресурсів — просто тихо провалюємось
        return new Response('', { status: 408 });
      });
    })
  );
});
