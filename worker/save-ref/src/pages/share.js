// The share-target landing page, served at GET /share.
//
// Three different things can land here, and all of them end up saved:
//   1. Android share sheet -> POST /share, caught by the service worker,
//      parked in IndexedDB, redirected here with ?handoff=1
//   2. iOS Shortcut / bookmarklet / any GET link -> /share?url=…&text=…
//   3. no service worker yet -> the Worker renders the POSTed values into
//      the page as a bootstrap payload
//
// The page is deliberately one screen: what got saved, where it went, and a
// tag box — because this is being used one-handed, on a set, in a hurry.
export const SHARE_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0f1115">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="icon" href="/icon-192.png" type="image/png">
<title>Saving to 🧠 Big Brain</title>
<style>
  :root{--bg:#0f1115;--panel:#161a22;--panel2:#1b2030;--line:#283042;--ink:#e7ecf5;--soft:#9aa6bd;--blue:#3b82f6;--ok:#22c55e;--warn:#f59e0b;--bad:#ef4444}
  *{box-sizing:border-box}
  body{margin:0;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink);
       min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:20px}
  .wrap{width:100%;max-width:440px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px;text-align:center}
  .spin{width:34px;height:34px;border:3px solid var(--line);border-top-color:var(--blue);border-radius:50%;margin:8px auto 14px;animation:s .8s linear infinite}
  @keyframes s{to{transform:rotate(360deg)}}
  .mark{font-size:44px;line-height:1;margin-bottom:6px}
  h1{font-size:20px;margin:0 0 4px}
  .sub{color:var(--soft);font-size:14px;margin:0}
  .chip{display:inline-block;background:var(--panel2);border:1px solid var(--line);border-radius:999px;
        padding:4px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-top:12px}
  .preview{display:flex;gap:12px;align-items:center;text-align:left;background:#0b0e14;border:1px solid var(--line);
           border-radius:12px;padding:12px;margin-top:16px}
  .preview img{width:54px;height:54px;object-fit:cover;border-radius:8px;flex:none;background:var(--panel2)}
  .preview .ph{width:54px;height:54px;border-radius:8px;flex:none;background:var(--panel2);display:flex;align-items:center;justify-content:center;font-size:24px}
  .preview .t{font-weight:700;font-size:14px;line-height:1.3;max-height:2.6em;overflow:hidden}
  .preview .h{color:var(--soft);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tags{display:flex;gap:8px;margin-top:14px}
  input{flex:1;background:#0b0e14;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:11px 13px;font:inherit;font-size:15px;min-width:0}
  button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:11px 16px;background:var(--blue);color:#fff;cursor:pointer}
  button.ghost{background:#222a39;color:var(--ink)}
  button:disabled{opacity:.5}
  .row{display:flex;gap:10px;margin-top:14px}
  .row button{flex:1}
  .quick{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:12px}
  .quick button{background:var(--panel2);border:1px solid var(--line);color:var(--soft);font-weight:600;font-size:13px;padding:6px 12px;border-radius:999px}
  .quick button.on{background:var(--blue);border-color:var(--blue);color:#fff}
  a{color:var(--blue)}
  .muted{color:var(--soft);font-size:13px;margin-top:14px}
  .hide{display:none}
  .queued .mark{color:var(--warn)}
</style>
</head>
<body>
<div class="wrap">
  <div class="card" id="card">
    <div id="busy">
      <div class="spin"></div>
      <h1>Saving…</h1>
      <p class="sub" id="busysub">Dropping this into your brain.</p>
    </div>

    <div id="done" class="hide">
      <div class="mark" id="mark">✅</div>
      <h1 id="headline">Saved</h1>
      <p class="sub" id="sub"></p>
      <div id="catchip" class="chip hide"></div>

      <div class="preview hide" id="preview">
        <span class="ph" id="pvph">🔗</span>
        <img class="hide" id="pvimg" alt="">
        <div style="min-width:0">
          <div class="t" id="pvt"></div>
          <div class="h" id="pvh"></div>
        </div>
      </div>

      <div id="tagbox">
        <div class="tags">
          <input id="tags" placeholder="Add tags (optional)" autocomplete="off" autocapitalize="none">
          <button id="addtags">Add</button>
        </div>
        <div class="quick" id="quick"></div>
      </div>

      <div class="row">
        <button class="ghost" id="more">Drop another</button>
        <button id="close">Done</button>
      </div>
      <p class="muted"><a href="/browse">Open the gallery →</a></p>
    </div>

    <div id="notoken" class="hide">
      <div class="mark">🔑</div>
      <h1>One-time setup</h1>
      <p class="sub">This device hasn't been connected to your brain yet.</p>
      <div class="row"><button id="tosetup">Set it up (30 seconds)</button></div>
    </div>
  </div>
</div>

<script src="/bb.js"></script>
<script>
var $ = function (s) { return document.querySelector(s); };
var params = new URLSearchParams(location.search);
var saved = [];        // refs that landed
var queuedCount = 0;   // items parked for later

// Tag presets: the fastest possible one-tap filing on a phone.
var QUICK_TAGS = ["set-dec", "props", "color", "texture", "lighting", "furniture", "wardrobe", "location"];

function show(which) {
  ["busy", "done", "notoken"].forEach(function (k) { $("#" + k).classList.toggle("hide", k !== which); });
}

// --- collect whatever was shared, from all three possible routes ------------
function collect() {
  var jobs = [];

  // route 3: values the Worker rendered into the page (no service worker yet)
  if (self.__BB_SHARE__ && (self.__BB_SHARE__.url || self.__BB_SHARE__.text)) {
    jobs.push(Promise.resolve([self.__BB_SHARE__]));
  }

  // route 2: plain query params (iOS Shortcut, bookmarklet, any GET link)
  var qUrl = params.get("url") || "";
  var qText = params.get("text") || "";
  var qTitle = params.get("title") || "";
  if (qUrl || qText) jobs.push(Promise.resolve([{ url: qUrl, text: qText, title: qTitle }]));

  // route 1: the service worker parked a POSTed share
  jobs.push(BB.takeShares());

  return Promise.all(jobs).then(function (lists) {
    return lists.reduce(function (a, b) { return a.concat(b || []); }, []);
  });
}

// --- save one shared payload ------------------------------------------------
function saveOne(item) {
  var out = [];
  var files = item.files || [];
  var chain = Promise.resolve();

  files.forEach(function (f) {
    chain = chain.then(function () {
      return BB.saveFile(f).then(function (r) { out.push(r); }, function (e) { out.push({ error: e }); });
    });
  });

  // Share sheets hand the link over in the url field on some apps and inside
  // the text field on others; prefer url, and only fall back to text, so that
  // nothing ever saves twice.
  var text = item.url || item.text || "";
  var title = item.title || "";
  if (text) {
    chain = chain.then(function () {
      return BB.saveText(text, { title: title }).then(function (r) { out.push(r); }, function (e) { out.push({ error: e }); });
    });
  } else if (title && !files.length) {
    chain = chain.then(function () {
      return BB.saveText(title).then(function (r) { out.push(r); }, function (e) { out.push({ error: e }); });
    });
  }
  return chain.then(function () { return out; });
}

function icon(c) {
  return ({ image: "🖼️", video: "🎬", audio: "🎵", post: "💬", article: "📰",
            code: "💻", shop: "🛍️", document: "📄", note: "📝" })[c] || "🔗";
}
function esc(s) { return (s || "").replace(/[&<>"]/g, function (m) {
  return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]; }); }

function render() {
  show("done");
  var n = saved.length;

  if (queuedCount && !n) {
    $("#card").classList.add("queued");
    $("#mark").textContent = "📥";
    $("#headline").textContent = queuedCount > 1 ? queuedCount + " saved offline" : "Saved offline";
    $("#sub").textContent = "No signal — it'll sync itself the moment you're back.";
    $("#tagbox").classList.add("hide");
    return;
  }

  $("#headline").textContent = n > 1 ? "Saved " + n + " things" : "Saved";
  var ref = saved[0];
  if (ref) {
    $("#sub").textContent = queuedCount ? "(+" + queuedCount + " waiting for signal)" : "";
    $("#catchip").textContent = ref.category || "";
    $("#catchip").classList.remove("hide");
    $("#preview").classList.remove("hide");
    $("#pvt").innerHTML = esc(ref.title || ref.text || ref.host || ref.url || "Untitled");
    $("#pvh").innerHTML = esc(ref.host || (ref.mime || ""));
    if (ref.image) {
      $("#pvimg").src = ref.image;
      $("#pvimg").classList.remove("hide");
      $("#pvph").classList.add("hide");
    } else {
      $("#pvph").textContent = icon(ref.category);
    }
  }

  // quick tags
  var q = $("#quick");
  QUICK_TAGS.forEach(function (t) {
    var b = document.createElement("button");
    b.textContent = t;
    b.onclick = function () {
      b.classList.toggle("on");
      var cur = $("#tags").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      var i = cur.indexOf(t);
      if (i >= 0) cur.splice(i, 1); else cur.push(t);
      $("#tags").value = cur.join(", ");
    };
    q.appendChild(b);
  });
}

function fail(msg) {
  show("done");
  $("#mark").textContent = "⚠️";
  $("#headline").textContent = "Couldn't save";
  $("#sub").textContent = msg || "Something went wrong.";
  $("#tagbox").classList.add("hide");
  $("#preview").classList.add("hide");
}

// --- wiring -----------------------------------------------------------------
$("#tosetup").onclick = function () { location.href = "/setup?next=" + encodeURIComponent(location.pathname + location.search); };
$("#more").onclick = function () { location.href = "/drop"; };
$("#close").onclick = function () {
  // A share-sheet popup can usually close itself; otherwise fall back.
  window.close();
  setTimeout(function () { location.href = "/drop"; }, 120);
};

$("#addtags").onclick = function () {
  var v = $("#tags").value.trim();
  if (!v || !saved.length) return;
  var btn = $("#addtags");
  btn.disabled = true;
  btn.textContent = "…";
  BB.getToken().then(function (token) {
    return Promise.all(saved.filter(function (r) { return r && r.id; }).map(function (r) {
      return fetch("/api/ref/" + encodeURIComponent(r.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token },
        body: JSON.stringify({ tags: v }),
      });
    }));
  }).then(function () {
    btn.textContent = "✓";
    $("#tags").disabled = true;
  }).catch(function () {
    btn.disabled = false;
    btn.textContent = "Retry";
  });
};

// --- go ---------------------------------------------------------------------
if (params.get("error")) {
  fail("The share didn't come through. Try again, or drop it manually.");
} else {
  BB.getToken().then(function (token) {
    if (!token) { show("notoken"); return; }
    return collect().then(function (items) {
      if (!items.length) { location.replace("/drop"); return; }
      $("#busysub").textContent = "Dropping " + (items.length > 1 ? items.length + " things" : "this") + " into your brain.";
      // Files shared before the service worker was active can't survive the
      // page load — say so plainly rather than failing silently.
      var lostFiles = self.__BB_SHARE__ && self.__BB_SHARE__.filesDropped;
      if (lostFiles && !items.some(function (i) { return i.url || i.text; })) {
        show("done");
        $("#mark").textContent = "📎";
        $("#headline").textContent = lostFiles > 1 ? lostFiles + " files need the app" : "That file needs the app";
        $("#sub").textContent = "Install Big Brain from /setup, then sharing files works. For now, drop them in directly.";
        $("#tagbox").classList.add("hide");
        $("#more").textContent = "Drop them now";
        return;
      }

      return items.reduce(function (chain, it) {
        return chain.then(function () {
          return saveOne(it).then(function (results) {
            results.forEach(function (r) {
              if (!r) return;
              if (r.ref) saved.push(r.ref);
              else if (r.queued) queuedCount++;
            });
          });
        });
      }, Promise.resolve()).then(function () {
        if (!saved.length && !queuedCount) fail("Nothing in that share could be saved.");
        else render();
      });
    });
  }).catch(function (e) { fail(e && e.message); });
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(function () {});
</script>
</body>
</html>`;
