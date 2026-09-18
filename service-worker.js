// =================================================================
// SERVICE WORKER – Cutting Data PRO
// Hanterar offline-cachning av appens alla resurser.
//
// VIKTIGT: Alla sökvägar är relativa till service workerns placering
// (dvs. appens rot). Detta gör att appen fungerar både lokalt, på
// GitHub Pages och på en custom domain utan ändringar.
//
// När du uppdaterar någon fil i appen: bumpa CACHE_NAME (t.ex. v1.5.1)
// så att användarnas cachade version rensas och ersätts.
//
// Sätt DEBUG = true för att se loggning i DevTools → Application →
// Service Workers (kräver att fliken laddas om).
// =================================================================

const DEBUG = false;

const log   = (...args) => { if (DEBUG) console.log('[SW]', ...args); };
const warn  = (...args) => { if (DEBUG) console.warn('[SW]', ...args); };
const error = (...args) => console.error('[SW]', ...args); // Fel visas alltid

const CACHE_NAME = 'cutting-data-pro-cache-v1.45.20';

// Lista över alla filer som ska cachas initialt (App Shell).
// Alla sökvägar är relativa till denna fils placering.
const urlsToCache = [
    // Rötfiler (startsida, manifest och ikoner)
    './',
    './index.html',
    './manifest.json',
    './icon-72.png',
    './icon-96.png',
    './icon-128.png',
    './icon-152.png',
    './icon-192.png',
    './icon-512.png',

    // Gemensam CSS och JS för alla kalkylatorer
    './kalkylatorer/style.css',
    './kalkylatorer/theme.js',

    // Kalkylatorer (HTML)
    './kalkylatorer/Face_Milling_Data_Calculator-Pro.html',
    './kalkylatorer/Drilling_Data_Calculator-Pro.html',
    './kalkylatorer/Reaming_Data_Calculator-Pro.html',
    './kalkylatorer/Milling_Data_Calculator-Pro.html',
    './kalkylatorer/Chamfer_Data_Calculator-Pro.html',
    './kalkylatorer/T-slot_Milling_Data_Calculator-Pro.html',
    './kalkylatorer/Slitting-cutter_Data_Calculator-Pro.html',

    // Kalkylatorer (data- och logikfiler)
    './kalkylatorer/Face_Milling_tool_data.js',
    './kalkylatorer/drilling_tool_data.js',
    './kalkylatorer/Reaming_tool_data.js',
    './kalkylatorer/milling_tool_data.js',
    './kalkylatorer/Chamfer_tool_data.js',
    './kalkylatorer/T-slot_Milling_tool_data.js',
    './kalkylatorer/Slitting-cutter_tool_data.js'
];

// =================================================================
// 1. INSTALLATION
// =================================================================
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                log('Cachar app shell:', CACHE_NAME);

                const requests = urlsToCache.map(url =>
                    cache.add(new Request(url, { cache: 'reload' }))
                );

                return Promise.allSettled(requests);
            })
            .then(results => {
                const failed = results
                    .map((result, index) => ({ result, url: urlsToCache[index] }))
                    .filter(item => item.result.status === 'rejected');

                if (failed.length > 0) {
                    warn('Följande resurser kunde inte cachas:');
                    failed.forEach(item => {
                        warn('  -', item.url, '→', item.result.reason);
                    });
                } else {
                    log('Alla resurser cachades framgångsrikt.');
                }

                return self.skipWaiting();
            })
            .catch(err => {
                error('Oväntat fel vid installation:', err);
            })
    );
});

// =================================================================
// 2. AKTIVERING
// =================================================================
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            log('Tar bort gammal cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});

// =================================================================
// 3. FETCH
// Strategi: Cache-first med network-fallback.
// =================================================================
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        return Response.error();
                    });
            })
    );
});