/**
 * DANI service worker — app-shell cache for the editor and procedure-runner
 * apps, so both keep working (and can be launched) offline after the first
 * successful online visit.
 *
 * Bump CACHE_VERSION whenever the precached file list changes — activate()
 * deletes every cache that doesn't match it, so a stale version can never
 * linger and block an update.
 *
 * Every cached URL is resolved against self.registration.scope (not a
 * hardcoded "/..." path) so this same file works whether the app is served
 * from a domain root or published under a subfolder, e.g. GitHub Pages'
 * https://user.github.io/DANY/.
 */
const CACHE_VERSION = 'dani-v4';
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const SCOPE = self.registration.scope;

// Requests to this origin are the local editor's own load/save server
// (server/local-file-server.ps1). They're live file I/O, never cacheable —
// the service worker must stay out of their way entirely.
const LOCAL_FILE_SERVER_ORIGIN = 'http://127.0.0.1:8080';

const EDITOR_URL = new URL('apps/editor/index.html', SCOPE).href;
const PROCEDURE_RUNNER_URL = new URL('apps/procedure-runner/index.html', SCOPE).href;

// Paths are relative to SCOPE (the directory this script itself lives in).
const PRECACHE_PATHS = [
  '',
  'manifest.webmanifest',

  // Icons
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-16.png',
  'icons/favicon-32.png',
  'icons/favicon-48.png',
  'icons/favicon.ico',

  // Editor app shell
  'apps/editor/index.html',
  'apps/editor/css/styles.css',
  'apps/editor/js/main.js',
  'apps/editor/js/core/dom-helpers.js',
  'apps/editor/js/logic/calculator-display.js',
  'apps/editor/js/logic/csv-data.js',
  'apps/editor/js/logic/engineering-formulas.js',
  'apps/editor/js/logic/expression-evaluator.js',
  'apps/editor/js/logic/formulas-data.js',
  'apps/editor/js/logic/unit-conversions.js',
  'apps/editor/js/logic/widget-storage-keys.js',
  'apps/editor/js/ui/calculator.js',
  'apps/editor/js/ui/clock.js',
  'apps/editor/js/ui/converter.js',
  'apps/editor/js/ui/data-inspector.js',
  'apps/editor/js/ui/engineering.js',
  'apps/editor/js/ui/file-io.js',
  'apps/editor/js/ui/formulas.js',
  'apps/editor/js/ui/pins.js',
  'apps/editor/js/ui/procedure.js',
  'apps/editor/js/ui/quick-calculator.js',
  'apps/editor/js/ui/session.js',
  'apps/editor/js/ui/threshold.js',
  'apps/editor/js/ui/timer.js',
  'apps/editor/js/ui/todo.js',
  'apps/editor/js/ui/widgets.js',
  'apps/editor/js/ui/workspace-state.js',

  // Procedure Runner app shell
  'apps/procedure-runner/index.html',
  'apps/procedure-runner/css/styles.css',
  'apps/procedure-runner/js/main.js',
  'apps/procedure-runner/js/core/dom-helpers.js',
  'apps/procedure-runner/js/core/time.js',
  'apps/procedure-runner/js/logic/column-mapping.js',
  'apps/procedure-runner/js/logic/csv.js',
  'apps/procedure-runner/js/logic/report.js',
  'apps/procedure-runner/js/logic/steps.js',
  'apps/procedure-runner/js/ui/builder.js',
  'apps/procedure-runner/js/ui/download.js',
  'apps/procedure-runner/js/ui/end-screen.js',
  'apps/procedure-runner/js/ui/execution.js',
  'apps/procedure-runner/js/ui/export.js',
  'apps/procedure-runner/js/ui/loader.js',
  'apps/procedure-runner/js/ui/modal.js',
  'apps/procedure-runner/js/ui/session-storage.js',
  'apps/procedure-runner/js/ui/state.js',
  'apps/procedure-runner/js/ui/summary.js',
  'apps/procedure-runner/js/ui/username.js',
  'apps/procedure-runner/js/ui/xlsx-io.js',

  // Shared helpers
  'shared/js/dom-utils.js',
  'shared/js/pwa.js',
  'shared/js/theme.js'
];

const PRECACHE_URLS = PRECACHE_PATHS.map(p => new URL(p, SCOPE).href);

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // Cache each URL independently: one missing/failed resource must not
      // abort the whole precache the way cache.addAll() would.
      await Promise.allSettled(
        PRECACHE_URLS.map(async url => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response.ok) await cache.put(url, response);
          } catch {
            // Offline during install, or the resource genuinely doesn't
            // exist at this path — skip it, the runtime fetch handler
            // will pick it up opportunistically once it's reachable.
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('offline and not cached: ' + request.url);
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then(response => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await networkFetch) || Response.error();
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Never touch the local /load /save file-server — it must always hit
  // the network directly, and POST bodies can't be cached anyway.
  if (url.origin === LOCAL_FILE_SERVER_ORIGIN || request.method !== 'GET') {
    return;
  }

  // HTML navigations: prefer the freshest copy, fall back to the cached
  // app shell when offline so both apps still launch.
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, CACHE_VERSION).catch(async () => {
        const fallback = await caches.match(
          url.pathname.includes('/procedure-runner/') ? PROCEDURE_RUNNER_URL : EDITOR_URL
        );
        return fallback || Response.error();
      })
    );
    return;
  }

  // Same-origin static assets (css/js/icons/manifest): serve from cache
  // instantly when present, refresh in the background — so updates never
  // stay stuck behind a stale cached copy for more than one visit.
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Cross-origin (e.g. the ExcelJS CDN script): try the network first so
  // the real library loads when online; fall back to a previously cached
  // copy offline. If neither is available the app already handles a
  // missing ExcelJS gracefully (see apps/procedure-runner/js/ui/xlsx-io.js).
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});
