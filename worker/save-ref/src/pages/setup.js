// The phone-onboarding page, served at GET /setup.
//
// This is the page that decides whether Big Brain actually gets used. It does
// exactly two things: takes the token, then shows the ONE card for the device
// you're holding that puts Big Brain in that device's share sheet.
//
// The token is only ever read client-side, so the Apple Shortcut recipe below
// can be rendered with the real value already filled in without the Worker
// ever echoing a secret back over the wire.
export const SETUP_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0f1115">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="icon" href="/icon-192.png" type="image/png">
<title>🧠 Big Brain — set up this device</title>
<style>
  :root{--bg:#0f1115;--panel:#161a22;--panel2:#1b2030;--line:#283042;--ink:#e7ecf5;--soft:#9aa6bd;--blue:#3b82f6;--blue2:#2563eb;--ok:#22c55e;--warn:#f59e0b;--bad:#ef4444}
  *{box-sizing:border-box}
  body{margin:0;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
  .wrap{max-width:560px;margin:0 auto;padding:26px 18px 90px}
  header{text-align:center;margin-bottom:6px}
  h1{font-size:26px;margin:0}
  .sub{color:var(--soft);text-align:center;margin:6px 0 22px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px;margin:14px 0}
  .card h2{font-size:16px;margin:0 0 4px;display:flex;align-items:center;gap:8px}
  .card .why{color:var(--soft);font-size:13px;margin:0 0 14px}
  label{font-weight:600;display:block;margin-bottom:8px}
  input[type=text],input[type=password]{width:100%;background:#0b0e14;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:12px 14px;font:inherit}
  button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:11px 18px;background:var(--blue);color:#fff;cursor:pointer}
  button:hover{background:var(--blue2)}
  button.ghost{background:#222a39;color:var(--ink)}
  button:disabled{opacity:.45;cursor:default}
  .bar{display:flex;gap:10px}
  .bar input{flex:1;min-width:0}
  ol{margin:0;padding-left:22px}
  ol li{margin-bottom:10px}
  ol li b{color:#fff}
  .kv{background:#0b0e14;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:8px 0;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
      word-break:break-all;display:flex;gap:10px;align-items:flex-start}
  .kv .k{color:var(--soft);flex:none;min-width:88px}
  .kv .v{flex:1;min-width:0}
  .copy{background:#222a39;border:1px solid var(--line);color:var(--ink);font-size:12px;font-weight:600;padding:5px 10px;border-radius:8px;flex:none;cursor:pointer}
  .copy.done{background:var(--ok);border-color:var(--ok);color:#06210f}
  .tabs{display:flex;gap:8px;margin-bottom:14px}
  .tabs button{flex:1;background:var(--panel2);border:1px solid var(--line);color:var(--soft);border-radius:999px;padding:9px}
  .tabs button.on{background:var(--blue);border-color:var(--blue);color:#fff}
  .status{display:flex;align-items:center;gap:10px;font-size:14px;padding:11px 14px;border-radius:12px;background:var(--panel2);border:1px solid var(--line);margin:10px 0}
  .dot{width:9px;height:9px;border-radius:50%;background:var(--soft);flex:none}
  .dot.ok{background:var(--ok)}.dot.warn{background:var(--warn)}.dot.bad{background:var(--bad)}
  .muted{color:var(--soft);font-size:13px}
  a{color:var(--blue)}
  .hide{display:none}
  .done-badge{color:var(--ok);font-size:13px;font-weight:700}
</style>
</head>
<body>
<div class="wrap">
  <header><h1>🧠 Big Brain</h1></header>
  <p class="sub">Two minutes to connect this device. Then it's just: share → done.</p>

  <!-- 1. token -->
  <div class="card" id="tokcard">
    <h2>1 · Connect this device <span id="tokdone" class="done-badge hide">✓ connected</span></h2>
    <p class="why">Paste the token <code>npm run setup</code> printed. Stored only on this device.</p>
    <div id="tokform">
      <div class="bar">
        <input id="tok" type="password" placeholder="Your Big Brain token" autocomplete="off" autocapitalize="none" spellcheck="false">
        <button id="savetok">Connect</button>
      </div>
      <p id="tokmsg" class="muted"></p>
    </div>
    <div id="tokok" class="hide">
      <div class="status"><span class="dot ok"></span><span>This device can save to your brain.</span></div>
      <button class="ghost" id="forget">Disconnect this device</button>
    </div>
  </div>

  <!-- 2. install -->
  <div class="card" id="installcard">
    <h2>2 · Put it in your share sheet</h2>
    <p class="why">So you can save from Instagram, Pinterest, Safari, Photos — without opening anything.</p>

    <div class="tabs">
      <button data-p="ios">iPhone</button>
      <button data-p="android">Android</button>
      <button data-p="desktop">Desktop</button>
    </div>

    <!-- iPhone -->
    <div class="pane hide" data-pane="ios">
      <ol>
        <li><b>Add to Home Screen.</b> In Safari, tap <b>Share</b> → <b>Add to Home Screen</b>. That gives you the app icon and lets it work offline.</li>
        <li><b>Add the share-sheet Shortcut.</b> iPhone can't add web apps to the share sheet on its own, so this one Shortcut does it. Open the <b>Shortcuts</b> app → <b>+</b> → add the action <b>Get Contents of URL</b>, then set:
          <div class="kv"><span class="k">URL</span><span class="v" id="ios-url">…</span><button class="copy" data-copy="ios-url">Copy</button></div>
          <div class="kv"><span class="k">Method</span><span class="v">POST</span></div>
          <div class="kv"><span class="k">Header</span><span class="v">X-Auth-Token = <span id="ios-tok">…</span></span><button class="copy" data-copy="ios-tok">Copy</button></div>
          <div class="kv"><span class="k">Header</span><span class="v">Content-Type = application/json</span></div>
          <div class="kv"><span class="k">Body</span><span class="v">JSON · key <b>url</b> (Text) = <b>Shortcut Input</b></span></div>
        </li>
        <li><b>Turn on the share sheet.</b> Tap the Shortcut's <b>ⓘ</b> → enable <b>Show in Share Sheet</b> → set accepted input to <b>URLs</b> and <b>Text</b>. Name it <b>Big Brain</b>.</li>
        <li><b>Done.</b> Anywhere on your phone: <b>Share → Big Brain</b>.</li>
      </ol>
      <p class="muted">Photos and screenshots: open the app icon and drop them there — the Shortcut above handles links and text.</p>
    </div>

    <!-- Android -->
    <div class="pane hide" data-pane="android">
      <ol>
        <li><b>Install the app.</b> <button id="installbtn" class="ghost">Install Big Brain</button>
          <span id="installhint" class="muted">If nothing happens, use Chrome's ⋮ menu → <b>Install app</b> / <b>Add to Home screen</b>.</span></li>
        <li><b>That's it.</b> Android reads the app's share target automatically — Big Brain now appears in the system share sheet for links, text, images and video.</li>
        <li>Test it: open any app → <b>Share</b> → <b>Big Brain</b>.</li>
      </ol>
    </div>

    <!-- Desktop -->
    <div class="pane hide" data-pane="desktop">
      <ol>
        <li><b>Bookmarklet.</b> Drag this to your bookmarks bar, then click it on any page to save that page:
          <div class="kv"><span class="k">Drag me →</span><span class="v"><a id="bmk" href="#">🧠 Big Brain</a></span><button class="copy" data-copy="bmk-src">Copy code</button></div>
          <span id="bmk-src" class="hide"></span>
        </li>
        <li><b>Or install it.</b> In Chrome/Edge, the ⊕ icon in the address bar installs Big Brain as a desktop app.</li>
        <li><b>Or just drop.</b> <a href="/drop">/drop</a> takes drag-and-drop and ⌘V paste, many files at once.</li>
      </ol>
    </div>
  </div>

  <!-- 3. status -->
  <div class="card">
    <h2>3 · Status</h2>
    <div class="status"><span class="dot" id="d-net"></span><span id="s-net">Checking connection…</span></div>
    <div class="status"><span class="dot" id="d-sw"></span><span id="s-sw">Checking offline support…</span></div>
    <div class="status"><span class="dot" id="d-q"></span><span id="s-q">Checking the queue…</span></div>
    <div class="bar" style="margin-top:12px">
      <button class="ghost" id="syncnow">Sync now</button>
      <a href="/drop" style="flex:1"><button style="width:100%">Open Big Brain</button></a>
    </div>
  </div>
</div>

<script src="/bb.js"></script>
<script>
var $ = function (s) { return document.querySelector(s); };
var params = new URLSearchParams(location.search);
var ORIGIN = location.origin;

// ---- token ----------------------------------------------------------------
function paintToken(token) {
  var on = !!token;
  $("#tokform").classList.toggle("hide", on);
  $("#tokok").classList.toggle("hide", !on);
  $("#tokdone").classList.toggle("hide", !on);
  if (on) {
    $("#ios-tok").textContent = token;
    $("#ios-url").textContent = ORIGIN + "/save";
    buildBookmarklet();
  }
}

$("#savetok").onclick = function () {
  var v = $("#tok").value.trim();
  if (!v) return;
  $("#tokmsg").textContent = "Checking…";
  fetch("/api/list?limit=1", { headers: { "X-Auth-Token": v } }).then(function (r) {
    if (!r.ok) { $("#tokmsg").textContent = r.status === 401 ? "That token was rejected." : "Worker error (" + r.status + ")."; return; }
    return BB.setToken(v).then(function () {
      $("#tokmsg").textContent = "";
      paintToken(v);
      var next = params.get("next");
      if (next && next.charAt(0) === "/") location.href = next;
    });
  }).catch(function () { $("#tokmsg").textContent = "Couldn't reach the Worker. Check your connection."; });
};
$("#tok").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#savetok").click(); });
$("#forget").onclick = function () { BB.clearToken().then(function () { paintToken(""); }); };

// ---- platform tabs --------------------------------------------------------
var ua = navigator.userAgent;
var isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
var isAndroid = /Android/.test(ua);
var platform = isIOS ? "ios" : isAndroid ? "android" : "desktop";

function selectPlatform(p) {
  platform = p;
  [].forEach.call(document.querySelectorAll(".tabs button"), function (b) { b.classList.toggle("on", b.dataset.p === p); });
  [].forEach.call(document.querySelectorAll(".pane"), function (el) { el.classList.toggle("hide", el.dataset.pane !== p); });
}
[].forEach.call(document.querySelectorAll(".tabs button"), function (b) {
  b.onclick = function () { selectPlatform(b.dataset.p); };
});
selectPlatform(platform);

// ---- copy buttons ---------------------------------------------------------
[].forEach.call(document.querySelectorAll(".copy"), function (b) {
  b.onclick = function () {
    var el = document.getElementById(b.dataset.copy);
    var text = el ? (el.dataset.raw || el.textContent) : "";
    var done = function () { b.textContent = "Copied"; b.classList.add("done"); setTimeout(function () { b.textContent = "Copy"; b.classList.remove("done"); }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  };
});

function buildBookmarklet() {
  var code = "javascript:(function(){window.open('" + ORIGIN +
    "/share?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'_blank');})()";
  var a = $("#bmk");
  a.href = code;
  a.onclick = function (e) { e.preventDefault(); };
  $("#bmk-src").dataset.raw = code;
}

// ---- install prompt (Android / desktop Chrome) ----------------------------
var deferredPrompt = null;
window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  deferredPrompt = e;
  $("#installhint").classList.add("hide");
});
$("#installbtn").onclick = function () {
  if (!deferredPrompt) { $("#installhint").classList.remove("hide"); return; }
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
};

// ---- status ---------------------------------------------------------------
function setStatus(dot, text, cls) {
  $("#d-" + dot).className = "dot " + (cls || "");
  $("#s-" + dot).textContent = text;
}
function refreshStatus() {
  setStatus("net", navigator.onLine ? "Online." : "Offline — drops will queue and sync later.",
    navigator.onLine ? "ok" : "warn");

  if (!("serviceWorker" in navigator)) setStatus("sw", "This browser can't work offline.", "bad");
  else navigator.serviceWorker.getRegistration().then(function (r) {
    setStatus("sw", r && r.active ? "Offline mode is on." : "Offline mode starting…", r && r.active ? "ok" : "warn");
  });

  BB.queueCount().then(function (n) {
    setStatus("q", n ? n + " waiting to sync." : "Nothing waiting — all synced.", n ? "warn" : "ok");
  });
}
$("#syncnow").onclick = function () {
  var b = $("#syncnow");
  b.disabled = true; b.textContent = "Syncing…";
  BB.flush().then(function (r) {
    b.disabled = false;
    b.textContent = r.sent ? "Sent " + r.sent : "Sync now";
    refreshStatus();
    setTimeout(function () { b.textContent = "Sync now"; }, 1800);
  });
};
window.addEventListener("online", refreshStatus);
window.addEventListener("offline", refreshStatus);

BB.getToken().then(function (t) { paintToken(t); refreshStatus(); });
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(function () {});
  // register() resolves before the worker is running; ready() waits for active,
  // otherwise the status sits on "starting…" forever.
  navigator.serviceWorker.ready.then(refreshStatus).catch(function () {});
}
</script>
</body>
</html>`;
