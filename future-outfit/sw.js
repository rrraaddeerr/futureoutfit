/* Future Outfit service worker — offline-capable app shell.
   Relative URLs so it works under a project-page base path.
   Bump CACHE to ship an update. */
const CACHE = "fo-v4";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const stale = keys.filter((k) => k !== CACHE);
    await Promise.all(stale.map((k) => caches.delete(k)));
    await self.clients.claim();
    // If we just cleared an older cache, this is an UPDATE (not a first install):
    // refresh any open pages so nobody sits on a stale build. The reloaded page
    // is served fresh from the network by the fetch handler below.
    if (stale.length) {
      const wins = await self.clients.matchAll({ type: "window" });
      for (const w of wins) { try { w.navigate(w.url); } catch (_) {} }
    }
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // never touch cross-origin

  // Navigations: network-first (fresh app), fall back to cached shell offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("./index.html", cp)); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match("./index.html")))
    );
    return;
  }

  // Everything else (images, manifest, icons): cache-first, then network + cache.
  e.respondWith(
    caches.match(req).then((m) =>
      m || fetch(req).then((r) => {
        if (r.ok && r.type === "basic") { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
        return r;
      }).catch(() => m)
    )
  );
});
