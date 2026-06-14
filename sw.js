// ── UDK Gazbeton Service Worker ──────────────────────────────
// Версія кешу — ОБОВ'ЯЗКОВО змінюй при кожному оновленні сайту (v6 → v7 → ...).
// Тримаємо її в одній константі, щоб лог і ім'я кешу ніколи не розходились.
const SW_VERSION = 'v6';
const CACHE_NAME = `udk-gazbeton-${SW_VERSION}`;

// Базові файли. Відносні шляхи ('./') → працює і на під-шляху
// (наприклад GitHub Pages https://user.github.io/UDK-/), не лише в корені домену.
const STATIC_ASSETS = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/js/main.js',
  './assets/images/UDK1.png',
  './assets/images/UDK2.png',
  './assets/images/UDK3.png',
  './assets/images/UDK4.png',
  './assets/images/UDK5.png',
  './assets/images/UDK6.png'
];

// ── INSTALL: кешуємо базові файли ────────────────────────────
// BUGFIX: тепер ПОВЕРТАЄМО проміс addAll, тож waitUntil реально чекає на
// завершення кешування (раніше install міг «завершитись» з порожнім кешем).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: видаляємо старі версії кешу ────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// Кладемо у кеш лише успішні власні відповіді (не opaque/не помилки).
function putInCache(request, response) {
  if (response && response.ok && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
}

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Втручаємось лише у власні GET-запити.
  //    POST (форма Formspree), аналітику, Google Maps та будь-який сторонній
  //    домен пропускаємо напряму — це прибирає помилку кешування POST і
  //    зберігання нечитабельних opaque-відповідей.
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  const dest = req.destination; // 'document' | 'script' | 'style' | 'image' | ...
  const isShell = req.mode === 'navigate' || dest === 'document' || dest === 'script' || dest === 'style';

  if (isShell) {
    // NETWORK-FIRST для HTML/JS/CSS:
    // онлайн → завжди свіжа версія (усуває «застряглий» старий кеш),
    // офлайн → віддаємо збережену копію, для навігації — головну сторінку.
    event.respondWith(
      fetch(req)
        .then((res) => putInCache(req, res))
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const idx = await caches.match('./index.html');
          if (idx) return idx;
          const root = await caches.match('./');
          if (root) return root;
          return new Response('Офлайн', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // CACHE-FIRST для картинок/шрифтів та іншої статики (рідко змінюється).
  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req)
        .then((res) => putInCache(req, res))
        .catch(() => new Response('', { status: 504 }))
    )
  );
});
