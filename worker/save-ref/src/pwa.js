// PWA plumbing: the web app manifest and the service worker.
//
// Together these are what turn Big Brain from "a URL you have to remember"
// into "an app in your share sheet that works with no signal":
//
//   - the manifest's `share_target` puts Big Brain in the Android share sheet
//   - the service worker catches that shared POST and parks it for the page
//   - it caches the app shell, so /drop opens on a stage with no bars
//   - `background sync` flushes anything queued the moment signal returns

export const MANIFEST = JSON.stringify(
  {
    name: "Big Brain",
    short_name: "Big Brain",
    description: "Drop a link, image, or note — it gets auto-categorized into your brain.",
    start_url: "/drop",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f1115",
    theme_color: "#0f1115",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Android: adds Big Brain to the system share sheet. The POST is caught by
    // the service worker (see SW_JS) so the token never has to leave the device.
    share_target: {
      action: "/share",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "files",
            accept: ["image/*", "video/*", "audio/*", "application/pdf", "text/*"],
          },
        ],
      },
    },
    shortcuts: [
      { name: "Drop something", url: "/drop" },
      { name: "Gallery", url: "/browse" },
    ],
  },
  null,
  2,
);

export const SW_JS = /* js */ `
/* Big Brain service worker. */
importScripts("/bb.js");

var CACHE = "bigbrain-v2";
// The shell we want available with no signal at all.
var SHELL = ["/drop", "/browse", "/setup", "/bb.js", "/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // Don't let one 404 sink the whole install.
      return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Flush the offline queue when the browser tells us there's a connection again.
self.addEventListener("sync", function (e) {
  if (e.tag === "bb-flush") e.waitUntil(self.BB.flush());
});

self.addEventListener("message", function (e) {
  if (e.data === "bb-flush") e.waitUntil(self.BB.flush());
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // --- the share sheet handing us something ---
  if (req.method === "POST" && url.pathname === "/share") {
    e.respondWith(handleShare(req));
    return;
  }

  if (req.method !== "GET") return;

  // Never cache the API — stale refs are worse than no refs.
  if (url.pathname.indexOf("/api/") === 0 || url.pathname === "/save") return;

  // Blobs are immutable and keyed by a random id: cache-first forever.
  if (url.pathname.indexOf("/blob/") === 0) {
    e.respondWith(
      caches.open(CACHE).then(function (c) {
        return c.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            if (res.ok) c.put(req, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // Everything else (pages, script, icons): network-first, fall back to cache
  // so the app still opens underground.
  e.respondWith(
    fetch(req)
      .then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match("/drop") || new Response("Offline", { status: 503 });
        });
      })
  );
});

/**
 * Park the shared payload in IndexedDB and bounce the user to /share, which
 * does the actual save. The service worker can't prompt for a token, and a
 * 303 keeps the back button sane.
 */
function handleShare(req) {
  return req.formData().then(function (fd) {
    var files = fd.getAll("files").filter(function (f) { return f && f.size; });
    return self.BB.stashShare({
      title: fd.get("title") || "",
      text: fd.get("text") || "",
      url: fd.get("url") || "",
      files: files,
      at: Date.now(),
    });
  }).then(function () {
    return Response.redirect("/share?handoff=1", 303);
  }).catch(function () {
    return Response.redirect("/share?error=1", 303);
  });
}
`;
