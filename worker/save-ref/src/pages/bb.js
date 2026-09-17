// Shared browser-side library, served at GET /bb.js.
//
// Loaded BOTH by the pages (<script src="/bb.js">) and by the service worker
// (importScripts("/bb.js")), so it is a classic script, not a module, and must
// not touch `window` or `document` at the top level.
//
// What it provides:
//   - IndexedDB storage the service worker can read (localStorage can't be)
//   - the auth token, mirrored to localStorage for older code paths
//   - an OFFLINE QUEUE: a save with no signal is stored and retried later,
//     which is the whole point on a set or in a warehouse basement
//   - the share-target handoff stash (SW receives the POST, page does the save)
export const BB_JS = /* js */ `
(function (g) {
  "use strict";

  var DB = "bigbrain", VER = 1;
  var KV = "kv", QUEUE = "queue", SHARE = "share";

  // ---------------------------------------------------------------- IndexedDB
  var _db = null;
  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB, VER);
      r.onupgradeneeded = function () {
        var db = r.result;
        if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
        if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(SHARE)) db.createObjectStore(SHARE, { keyPath: "id" });
      };
      r.onsuccess = function () { _db = r.result; res(_db); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function tx(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(store, mode);
        var req = fn(t.objectStore(store));
        t.oncomplete = function () { res(req && req.result); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error); };
      });
    });
  }
  // A transaction that can run several operations, for the atomic claim below.
  function txRaw(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(store, mode), out;
        fn(t.objectStore(store), function (v) { out = v; });
        t.oncomplete = function () { res(out); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error); };
      });
    });
  }
  var idbGet = function (s, k) { return tx(s, "readonly", function (o) { return o.get(k); }); };
  var idbAll = function (s) { return tx(s, "readonly", function (o) { return o.getAll(); }); };
  var idbPut = function (s, v, k) { return tx(s, "readwrite", function (o) { return o.put(v, k); }); };
  var idbDel = function (s, k) { return tx(s, "readwrite", function (o) { return o.delete(k); }); };

  // -------------------------------------------------------------------- token
  var LS_KEY = "bigbrain_token";
  function lsGet() { try { return g.localStorage && localStorage.getItem(LS_KEY); } catch (e) { return null; } }
  function lsSet(v) { try { localStorage.setItem(LS_KEY, v); } catch (e) {} }
  function lsDel() { try { localStorage.removeItem(LS_KEY); } catch (e) {} }

  // Reads localStorage first (instant, on pages), falls back to IndexedDB
  // (the only one a service worker can see).
  function getToken() {
    var v = lsGet();
    if (v) return Promise.resolve(v);
    return idbGet(KV, "token").then(function (t) { return t || ""; }).catch(function () { return ""; });
  }
  function setToken(v) { lsSet(v); return idbPut(KV, v, "token"); }
  function clearToken() { lsDel(); return idbDel(KV, "token").catch(function () {}); }

  // ------------------------------------------------------------------ network
  function uid() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  // A failure we should retry later (offline / server down) vs. one we
  // shouldn't (bad token, malformed payload). Only the former gets queued.
  function isTransient(err) { return !err || err.name === "TypeError" || err.transient === true; }

  function postJSON(token, payload) {
    return fetch("/save", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Token": token },
      body: JSON.stringify(payload),
    }).then(readSave);
  }
  function postBlob(token, blob, filename) {
    return fetch("/save", {
      method: "POST",
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
        "X-Filename": encodeURIComponent(filename || ""),
        "X-Auth-Token": token,
      },
      body: blob,
    }).then(readSave);
  }
  function readSave(res) {
    return res.json().catch(function () { return {}; }).then(function (d) {
      if (res.ok && d.ok) return d.ref;
      var e = new Error(d.error || ("save failed (" + res.status + ")"));
      e.status = res.status;
      // 5xx is worth retrying; 4xx means the request itself is wrong.
      e.transient = res.status >= 500;
      throw e;
    });
  }

  // ------------------------------------------------------------- offline queue
  // Queue items: {id, at, kind:"json"|"blob", payload|blob, filename, label}
  function queueCount() { return idbAll(QUEUE).then(function (a) { return a.length; }).catch(function () { return 0; }); }
  function queueAll() { return idbAll(QUEUE).catch(function () { return []; }); }

  function enqueue(item) {
    item.id = item.id || uid();
    item.at = item.at || Date.now();
    return idbPut(QUEUE, item).then(function () {
      // Ask the browser to flush for us as soon as there's a connection.
      if (g.registration && g.registration.sync) {
        try { g.registration.sync.register("bb-flush"); } catch (e) {}
      } else if (g.navigator && navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function (r) {
          if (r.sync) { try { r.sync.register("bb-flush"); } catch (e) {} }
        }).catch(function () {});
      }
      return item;
    });
  }

  // Three things can start a flush at once — the page on load, the window's
  // "online" event, and the service worker's background sync — and they run in
  // separate JS contexts sharing one database. Without claiming, they each read
  // the same pending item and the drop gets saved two or three times.
  //
  // So: take the oldest unclaimed item and mark it claimed inside a SINGLE
  // readwrite transaction, which IndexedDB serialises across contexts. A claim
  // older than CLAIM_TTL is assumed dead (tab closed mid-send) and retried.
  var CLAIM_TTL = 60000;

  function claimNext() {
    return txRaw(QUEUE, "readwrite", function (os, done) {
      var now = Date.now();
      // Keys are time-ordered, so a plain cursor walks oldest-first.
      var req = os.openCursor();
      req.onsuccess = function () {
        var cur = req.result;
        if (!cur) { done(null); return; }
        var v = cur.value;
        if (!v.claimedAt || now - v.claimedAt > CLAIM_TTL) {
          v.claimedAt = now;
          cur.update(v);
          done(v);
          return; // claimed one: stop walking
        }
        cur.continue();
      };
      req.onerror = function () { done(null); };
    }).catch(function () { return null; });
  }

  /** Give an item back to the queue after a failure we intend to retry. */
  function release(id) {
    return txRaw(QUEUE, "readwrite", function (os, done) {
      var r = os.get(id);
      r.onsuccess = function () {
        var v = r.result;
        if (v) { delete v.claimedAt; os.put(v); }
        done(true);
      };
      r.onerror = function () { done(false); };
    }).catch(function () {});
  }

  var flushing = false; // guards against two loops in THIS context

  /** Try to send everything queued. Resolves {sent, left}. */
  function flush() {
    if (flushing) return Promise.resolve({ sent: 0, left: -1, busy: true });
    flushing = true;
    return getToken().then(function (token) {
      if (!token) return { sent: 0, left: -1 };
      var sent = 0;
      function step() {
        return claimNext().then(function (it) {
          if (!it) return;
          var p = it.kind === "blob"
            ? postBlob(token, it.blob, it.filename)
            : postJSON(token, it.payload);
          return p.then(function () {
            sent++;
            return idbDel(QUEUE, it.id).then(step);
          }, function (err) {
            // Permanent failure (bad token, bad payload): drop it rather than
            // retry forever. Transient: put it back and stop for now.
            if (!isTransient(err)) return idbDel(QUEUE, it.id).then(step);
            return release(it.id);
          });
        });
      }
      return step().then(function () {
        return queueCount().then(function (left) { return { sent: sent, left: left }; });
      });
    }).catch(function () {
      return { sent: 0, left: -1 };
    }).then(function (r) {
      flushing = false;
      return r;
    });
  }

  /**
   * Save something. Tries the network; on a transient failure queues it.
   * Resolves {ref} when it landed, or {queued:true, item} when it didn't.
   */
  function save(item) {
    return getToken().then(function (token) {
      if (!token) { var e = new Error("No token yet"); e.noToken = true; throw e; }
      var p = item.kind === "blob"
        ? postBlob(token, item.blob, item.filename)
        : postJSON(token, item.payload);
      return p.then(function (ref) { return { ref: ref }; }, function (err) {
        if (!isTransient(err)) throw err;
        return enqueue(item).then(function (q) { return { queued: true, item: q }; });
      });
    });
  }

  /** Decide whether a bit of shared text is a URL or a note, and save it. */
  function saveText(text, extra) {
    text = (text || "").trim();
    if (!text) return Promise.resolve(null);
    // Share sheets often hand over "Some title https://the.link" — pull the URL.
    var m = text.match(/https?:\\/\\/[^\\s]+/);
    var payload;
    if (m) {
      payload = { url: m[0] };
      var rest = text.replace(m[0], "").trim();
      if (rest) payload.note = rest;
    } else if (/^[\\w-]+(\\.[\\w-]+)+(\\/\\S*)?$/.test(text)) {
      payload = { url: text };
    } else {
      payload = { text: text };
    }
    if (extra && extra.title && !payload.title) payload.title = extra.title;
    if (extra && extra.tags) payload.tags = extra.tags;
    return save({ kind: "json", payload: payload, label: payload.url || text.slice(0, 60) });
  }

  function saveFile(file) {
    return save({
      kind: "blob",
      blob: file,
      filename: file.name || "",
      label: file.name || (file.type || "file"),
    });
  }

  // ------------------------------------------------------- share-target stash
  // The service worker catches the shared POST and parks it here; the /share
  // page picks it up, because only the page can prompt for a token.
  function stashShare(payload) {
    payload.id = payload.id || uid();
    return idbPut(SHARE, payload).then(function () { return payload.id; });
  }
  function takeShares() {
    return idbAll(SHARE).then(function (all) {
      return Promise.all(all.map(function (s) { return idbDel(SHARE, s.id); })).then(function () { return all; });
    }).catch(function () { return []; });
  }

  g.BB = {
    open: open, idbGet: idbGet, idbPut: idbPut, idbDel: idbDel, idbAll: idbAll,
    STORES: { KV: KV, QUEUE: QUEUE, SHARE: SHARE },
    getToken: getToken, setToken: setToken, clearToken: clearToken,
    save: save, saveText: saveText, saveFile: saveFile,
    enqueue: enqueue, flush: flush, queueCount: queueCount, queueAll: queueAll,
    stashShare: stashShare, takeShares: takeShares,
    uid: uid,
  };
})(typeof self !== "undefined" ? self : this);
`;
