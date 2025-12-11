// Fil: service-worker.js

// 1. DEFINIERA CACHENAMN OCH FILER
const CACHE_NAME = 'skardata-pwa-v7-english-update'; // Ny version v7!
const BASE_PATH = '/Milling_Drilling_Cutting_Data_Calculators'; // Ny basväg

// Alla filer som appen behöver för att fungera offline
const urlsToCache = [
    BASE_PATH + '/', // Den nya roten
    BASE_PATH + '/index.html',
    BASE_PATH + '/manifest.json',
    
    // Ikoner
    BASE_PATH + '/icon-192.png',
    BASE_PATH + '/icon-512.png', 
    
    // Fonts (extern)
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    
    // Kalkylatorfragment
    BASE_PATH + '/kalkylatorer/Face_Milling_Data_Calculator-Pro.html',
    BASE_PATH + '/kalkylatorer/Drilling_Data_Calculator-Pro.html',
    BASE_PATH + '/kalkylatorer/Milling_Data_Calculator-Pro.html'
];

// 2. INSTALLERA SERVICE WORKER OCH CACHA STATISKA TILLGÅNGAR
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache, adding essential files (v7).');
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

