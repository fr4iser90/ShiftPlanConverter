/* Minimal PWA shell — UI cache only, never PDF payloads.
 * HTML/JS/CSS: network-first (max ~1 day offline fallback).
 * Krankenhaus-JSON: immer Network.
 */
const CACHE = 'spc-shell-v3';
const CACHE_MAX_MS = 24 * 60 * 60 * 1000; // 1 Tag
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isShellAsset(url) {
  const p = url.pathname;
  return (
    p.endsWith('.html') ||
    p.endsWith('.css') ||
    p.endsWith('.js') ||
    p.endsWith('.webmanifest') ||
    p.endsWith('/') ||
    /\/index\.html?$/i.test(p)
  );
}

async function putWithTimestamp(req, res) {
  const headers = new Headers(res.headers);
  headers.set('sw-cached-at', String(Date.now()));
  const body = await res.clone().blob();
  const stamped = new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
  const cache = await caches.open(CACHE);
  await cache.put(req, stamped);
}

function isFresh(res) {
  const at = res.headers.get('sw-cached-at');
  if (!at) return false;
  const t = Number(at);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < CACHE_MAX_MS;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok && isShellAsset(new URL(req.url))) {
      putWithTimestamp(req, res).catch(() => {});
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached && isFresh(cached)) return cached;
    if (cached) return cached; // offline: lieber alt als gar nichts
    throw new Error('offline');
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\.pdf$/i.test(url.pathname)) return;

  // Config + mappings always from network
  if (url.pathname.includes('/krankenhaeuser/') && url.pathname.endsWith('.json')) {
    event.respondWith(fetch(req));
    return;
  }

  // HTML / JS / CSS / manifest: network-first, Cache max 1 Tag
  if (isShellAsset(url) || url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(networkFirst(req));
});
