// Fil: service-worker.js

// 1. DEFINIERA CACHENAMN OCH FILER
const CACHE_NAME = 'skardata-pwa-v5-links'; // VIKTIGT: Ny version v5!

// Alla filer som appen behöver för att fungera offline
const urlsToCache = [
    '/', // Riktar mot index.html i roten
    '/index.html',
    '/manifest.json',
    
    // Ikoner (måste finnas i roten)
    '/icon-192.png',
    '/icon-512.png', 
    
    // Fonts
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    
    // Kalkylatorfragment (Uppdaterad lista v5)
    '/kalkylatorer/Face Milling_Data_Calculator-Pro.html',  // <--- DEN NYA FILEN
    '/kalkylatorer/Drilling_Data_Calculator-Pro.html',      // (Från v4)
    '/kalkylatorer/Milling_Data_Calculator-Pro.html'        // (Från v3)
];

// 2. INSTALLERA SERVICE WORKER OCH CACHA STATISKA TILLGÅNGAR
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache, adding essential files (v5).');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Caching failed:', error);
      })
  );
});

// 3. HANTERA HÄMTNING AV FILER (FETCH)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Cache-first strategi
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// 4. TA BORT GAMLA CACHAR VID UPPGRADERING
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
