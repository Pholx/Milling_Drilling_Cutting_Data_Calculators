// Fil: service-worker.js

// 1. DEFINIERA CACHENAMN OCH FILER
const CACHE_NAME = 'skardata-pwa-v2-links';

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
    
    // Kalkylatorfragment (med de nya filnamnen)
    '/kalkylatorer/Planfrasning.html',
    '/kalkylatorer/HM&HSS-Borrning.html',
    '/kalkylatorer/Dynamisk-Fräsning.html'
];

// 2. INSTALLERA SERVICE WORKER OCH CACHA STATISKA TILLGÅNGAR
self.addEventListener('install', event => {
  // Väntar tills cachen är öppen och fylls med alla filer
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache, adding essential files (v2).');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Tvingar service worker att aktiveras omedelbart
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Caching failed:', error);
      })
  );
});

// 3. HANTERA HÄMTNING AV FILER (FETCH)
self.addEventListener('fetch', event => {
  // Vi vill inte försöka cacha POST-requests eller filer från andra domäner
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Cache-first strategi: Försök hitta filen i cachen först
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Om filen finns i cachen, returnera den
        if (response) {
          return response;
        }
        
        // Annars, hämta filen från nätverket
        return fetch(event.request);
      })
  );
});

// 4. TA BORT GAMLA CACHAR VID UPPGRADERING
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  // Raderar alla gamla cachar som inte finns i whitelist
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
