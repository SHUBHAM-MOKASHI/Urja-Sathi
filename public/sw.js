/**
 * URJA SAATHI Service Worker
 * Offline-First PWA Cache & Sync Engine
 * Har Ghar Bachat, Har Haath Kaam
 */

const CACHE_VERSION = 'v1.0.1';
const STATIC_CACHE = `urja-saathi-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `urja-saathi-dynamic-${CACHE_VERSION}`;

// Essential App Shell assets to precache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.svg',
];

// =========================================================================
// 1. INSTALL LIFECYCLE: Precache App Shell
// =========================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Precache critical shell assets
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[ServiceWorker] Pre-caching partial notice:', err);
      });
    }).then(() => {
      // Force immediate activation
      return self.skipWaiting();
    })
  );
});

// =========================================================================
// 2. ACTIVATE LIFECYCLE: Clean Old Caches & Claim Clients
// =========================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== STATIC_CACHE && name !== DYNAMIC_CACHE) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// =========================================================================
// 3. FETCH EVENT: Intelligent Multi-Tier Caching Strategies
// =========================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests; never cache POST/PUT/DELETE
  if (request.method !== 'GET') {
    return;
  }

  // A. Navigation Requests (HTML / Client-Side Routing)
  // NetworkFirst with fallback to cached index.html so React Router works offline!
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: serve cached index.html
          const cache = await caches.open(STATIC_CACHE);
          const cachedIndex = await cache.match('/index.html');
          if (cachedIndex) return cachedIndex;
          return cache.match('/');
        })
    );
    return;
  }

  // B. Immutable Hashed Assets (/assets/*.js, /assets/*.css)
  // CacheFirst with Network Fallback & dynamic caching
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // C. Static Images, Manifest, Icons, Fonts (StaleWhileRevalidate)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, nothing to do if cached response is present
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// =========================================================================
// 4. MESSAGE EVENT: Control Messages from App
// =========================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'PURGE_CACHES') {
    caches.keys().then((names) => {
      return Promise.all(names.map((name) => caches.delete(name)));
    }).then(() => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    });
  }
});
