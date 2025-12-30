const CACHE_NAME = 'pbc-finance-v1';
const ASSETS = [
  'index.html',
  'style.css',
  'app.js',
  'youth_green.png',
  'youth_white.png',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&family=Open+Sans:wght@400;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate & Cleanup Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Fetch Assets from Cache (Offline Support)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
