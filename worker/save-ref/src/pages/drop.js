// The drop SPA. Served at GET /drop. Self-contained: no external assets.
export const DROP_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0f1115">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Big Brain">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="icon" href="/icon-192.png" type="image/png">
<title>🧠 Big Brain</title>
<style>
  :root{--bg:#0f1115;--panel:#161a22;--panel2:#1b2030;--line:#283042;--ink:#e7ecf5;--soft:#9aa6bd;--blue:#3b82f6;--blue2:#2563eb;--ok:#22c55e;--bad:#ef4444}
  *{box-sizing:border-box}
  body{margin:0;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
  .wrap{max-width:760px;margin:0 auto;padding:28px 18px 80px}
  header{text-align:center;margin:14px 0 8px}
  h1{font-size:30px;margin:0}
  .sub{color:var(--soft);margin:6px 0 22px;text-align:center}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px;margin:14px 0}
  .setup{background:var(--panel2);border:1px solid #2c61b0}
  label{font-weight:600;display:block;margin-bottom:8px}
  input[type=text],input[type=password],textarea{width:100%;background:#0b0e14;border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:12px 14px;font:inherit}
  textarea{min-height:70px;resize:vertical}
  button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:11px 18px;background:var(--blue);color:#fff;cursor:pointer}
  button:hover{background:var(--blue2)}
  button.ghost{background:#222a39;color:var(--ink)}
  .row{display:flex;gap:10px;align-items:center}
  .drop{border:2px dashed #2f3b55;border-radius:18px;padding:46px 18px;text-align:center;background:var(--panel2);transition:.15s;cursor:pointer}
  .drop.hot{border-color:var(--blue);background:#16233c;transform:scale(1.01)}
  .drop .big{font-size:20px;font-weight:800;color:var(--blue);margin-bottom:6px}
  .drop .hint{color:var(--soft);font-size:14px}
  .barwrap{display:flex;gap:10px;margin-top:14px}
  .barwrap input{flex:1}
  .muted{color:var(--soft);font-size:13px}
  .toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#0b0e14;border:1px solid var(--line);border-radius:12px;padding:12px 16px;box-shadow:0 12px 40px #000a;opacity:0;pointer-events:none;transition:.2s;max-width:90vw}
  .toast.show{opacity:1}
  .toast.ok{border-color:#1f6b3a}.toast.bad{border-color:#7a2727}
  .recent{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px;margin-top:8px}
  .tile{background:#0b0e14;border:1px solid var(--line);border-radius:10px;overflow:hidden;aspect-ratio:1;position:relative;display:flex;align-items:center;justify-content:center;text-align:center}
  .tile img{width:100%;height:100%;object-fit:cover}
  .tile .ph{font-size:12px;color:var(--soft);padding:6px;word-break:break-word}
  .badge{position:absolute;left:5px;top:5px;background:#000a;border:1px solid var(--line);border-radius:999px;font-size:10px;padding:2px 7px;text-transform:uppercase;letter-spacing:.04em}
  .links{display:flex;gap:16px;justify-content:center;margin-top:18px;flex-wrap:wrap}
  a{color:var(--blue)}
  .hide{display:none}
  /* offline / queue banner — the thing that makes this trustworthy on set */
  .queue{display:flex;align-items:center;gap:10px;background:#2a2113;border:1px solid #6b4f14;color:#fde68a;
         border-radius:12px;padding:10px 14px;margin:12px 0;font-size:14px}
  .queue button{background:#6b4f14;color:#fde68a;font-size:13px;padding:6px 12px}
  .queue .grow{flex:1}
  .tile.pending{opacity:.55;border-style:dashed}
</style>
</head>
<body>
<div class="wrap">
  <header><h1>🧠 Big Brain</h1></header>
  <p class="sub">Drop a link, image, or note — it gets auto-categorized into your brain.</p>

  <div id="setup" class="card setup hide">
    <label for="tok">First-time setup: paste your Big Brain token</label>
    <p class="muted" style="margin-top:-2px">Stored only in this browser (localStorage) — sent only to your Worker as <code>X-Auth-Token</code>.</p>
    <div class="barwrap">
      <input id="tok" type="password" placeholder="X-Auth-Token (the long hex string)" autocomplete="off">
      <button id="savetok">Save</button>
    </div>
    <p id="tokmsg" class="muted"></p>
  </div>

  <div id="app" class="hide">
    <div id="queue" class="queue hide">
      <span>📥</span>
      <span class="grow" id="queuetext"></span>
      <button id="syncnow">Sync now</button>
    </div>

    <div id="zone" class="drop" tabindex="0" role="button" aria-label="Drop files here or click to pick">
      <div class="big">⬇ Drop here</div>
      <div class="hint">Files, screenshots, or images — drag in, paste (⌘V), or click to pick. Multiple at once is fine.</div>
    </div>

    <div class="barwrap">
      <input id="urlin" type="text" placeholder="…or paste a URL / note and hit Enter" autocomplete="off">
      <button id="pick" class="ghost">Pick file</button>
      <button id="add">Save</button>
    </div>
    <input id="file" type="file" multiple class="hide" accept="image/*,video/*,application/pdf">

    <div class="card">
      <div class="row" style="justify-content:space-between">
        <strong>Recent</strong>
        <a href="/browse">Browse all →</a>
      </div>
      <div id="recent" class="recent"></div>
      <p id="emptyrecent" class="muted hide">Nothing yet. Drop something above.</p>
    </div>
  </div>

  <div class="links">
    <a href="/browse">Gallery</a>
    <a href="/setup">Phone setup</a>
    <a href="#" id="logout">Reset token</a>
  </div>
</div>
<div id="toast" class="toast"></div>

<script src="/bb.js"></script>
<script>
let token="";
const $=s=>document.querySelector(s);
const setup=$("#setup"),app=$("#app");

function show(){ if(token){setup.classList.add("hide");app.classList.remove("hide");loadRecent();refreshQueue();} else {setup.classList.remove("hide");app.classList.add("hide");} }
function toast(msg,kind){const t=$("#toast");t.textContent=msg;t.className="toast show "+(kind||"");setTimeout(()=>t.className="toast",2200);}

async function api(path,opts={}){
  const headers=Object.assign({"X-Auth-Token":token},opts.headers||{});
  const res=await fetch(path,Object.assign({},opts,{headers}));
  if(res.status===401){toast("Bad token — reset it","bad");await BB.clearToken();token="";show();throw new Error("401");}
  return res;
}

$("#savetok").onclick=async()=>{
  const v=$("#tok").value.trim(); if(!v){return;}
  try{const r=await fetch("/api/list?limit=1",{headers:{"X-Auth-Token":v}});
    if(r.ok){await BB.setToken(v);token=v;$("#tokmsg").textContent="✓ Saved";show();}
    else{$("#tokmsg").textContent="That token was rejected.";}
  }catch(e){$("#tokmsg").textContent="Couldn't reach the Worker.";}
};
$("#logout").onclick=async e=>{e.preventDefault();await BB.clearToken();token="";show();};

// ---- saving (via BB: queues to IndexedDB when there's no signal) ----
async function handleText(text){
  try{
    const r=await BB.saveText(text);
    if(!r)return;
    if(r.queued){toast("No signal — queued","");pendingTile(text);refreshQueue();}
    else{toast("Saved → "+r.ref.category,"ok");prepend(r.ref);}
  }catch(e){toast("Failed: "+e.message,"bad");}
}
async function handleFiles(files){
  for(const f of files){
    try{
      const r=await BB.saveFile(f);
      if(r.queued){toast("No signal — queued","");pendingTile(f.name||"file");refreshQueue();}
      else{toast("Saved → "+r.ref.category,"ok");prepend(r.ref);}
    }catch(e){toast("Failed: "+e.message,"bad");}
  }
}

// ---- offline queue ----
async function refreshQueue(){
  const n=await BB.queueCount();
  const box=$("#queue");
  box.classList.toggle("hide",!n);
  if(n)$("#queuetext").textContent=n+(n===1?" drop is":" drops are")+" waiting for signal.";
}
async function syncNow(){
  const b=$("#syncnow");b.disabled=true;b.textContent="Syncing…";
  const r=await BB.flush();
  b.disabled=false;b.textContent="Sync now";
  if(r.sent){toast("Synced "+r.sent,"ok");loadRecent();}
  else if(r.left>0)toast("Still no signal","bad");
  refreshQueue();
}
$("#syncnow").onclick=syncNow;
window.addEventListener("online",()=>{toast("Back online — syncing","ok");syncNow();});
function pendingTile(label){
  const r=$("#recent");$("#emptyrecent").classList.add("hide");
  const d=document.createElement("span");d.className="tile pending";
  d.innerHTML='<span class="badge">queued</span><span class="ph">'+
    (label||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m])).slice(0,40)+'</span>';
  r.prepend(d);while(r.children.length>12)r.removeChild(r.lastChild);
}

// ---- recent strip ----
function tile(ref){
  const d=document.createElement("a");d.className="tile";d.href=ref.url||("/browse#"+ref.id);d.target=ref.url?"_blank":"_self";
  d.innerHTML='<span class="badge">'+ref.category+'</span>'+(ref.image?'<img loading="lazy" src="'+ref.image+'">':'<span class="ph">'+(ref.title||ref.host||ref.category)+'</span>');
  return d;
}
function prepend(ref){const r=$("#recent");$("#emptyrecent").classList.add("hide");r.prepend(tile(ref));while(r.children.length>12)r.removeChild(r.lastChild);}
async function loadRecent(){
  try{const r=await api("/api/list?limit=12");const d=await r.json();const box=$("#recent");box.innerHTML="";
    if(!d.refs||!d.refs.length){$("#emptyrecent").classList.remove("hide");return;}
    $("#emptyrecent").classList.add("hide");d.refs.forEach(ref=>box.appendChild(tile(ref)));
  }catch(e){}
}

// ---- wiring ----
const zone=$("#zone");
["dragenter","dragover"].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add("hot");}));
["dragleave","drop"].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove("hot");}));
zone.addEventListener("drop",e=>{
  const files=[...(e.dataTransfer.files||[])];
  if(files.length)return handleFiles(files);
  const u=e.dataTransfer.getData("text/uri-list")||e.dataTransfer.getData("text/plain");
  if(u)handleText(u);
});
zone.onclick=()=>$("#file").click();
zone.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();$("#file").click();}};
$("#pick").onclick=()=>$("#file").click();
$("#file").onchange=e=>{handleFiles([...e.target.files]);e.target.value="";};
$("#add").onclick=()=>{const v=$("#urlin").value;$("#urlin").value="";handleText(v);};
$("#urlin").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();const v=e.target.value;e.target.value="";handleText(v);}});
window.addEventListener("paste",e=>{
  if(document.activeElement===$("#urlin")||document.activeElement===$("#tok"))return;
  const items=[...(e.clipboardData?.items||[])];
  const imgs=items.filter(i=>i.type.startsWith("image/")).map(i=>i.getAsFile()).filter(Boolean);
  if(imgs.length){e.preventDefault();return handleFiles(imgs);}
  const text=e.clipboardData?.getData("text");if(text){e.preventDefault();handleText(text);}
});

BB.getToken().then(t=>{
  token=t||"";
  show();
  // Anything captured offline goes up the moment the page can reach the net.
  if(token)BB.flush().then(r=>{if(r.sent){toast("Synced "+r.sent,"ok");loadRecent();}refreshQueue();});
});
if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});
</script>
</body>
</html>`;
