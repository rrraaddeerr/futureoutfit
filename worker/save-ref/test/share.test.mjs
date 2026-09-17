// Tests for the PWA / share-target layer: the manifest, the service worker,
// the shared client library, the icons, and the /share routes.
//
// These run in plain Node with a Map-backed KV, like worker.test.mjs — no
// wrangler, no network, no browser. Run: node test/share.test.mjs
import worker from "../src/index.js";
import { MANIFEST, SW_JS } from "../src/pwa.js";
import { BB_JS } from "../src/pages/bb.js";
import { ICONS, iconBytes } from "../src/icons.js";

let pass = 0, fail = 0;
function ok(label, cond) { cond ? pass++ : (fail++, console.error("✗ " + label)); }
function eq(label, got, want) { ok(label + ` (got ${JSON.stringify(got)})`, got === want); }

function makeKV() {
  const store = new Map();
  return {
    async get(name, type) {
      const e = store.get(name);
      if (!e) return null;
      return type === "json" ? JSON.parse(e.value) : e.value;
    },
    async getWithMetadata(name) {
      const e = store.get(name);
      return e ? { value: e.value, metadata: e.metadata ?? null } : { value: null, metadata: null };
    },
    async put(name, value, opts = {}) { store.set(name, { value, metadata: opts.metadata ?? null }); },
    async delete(name) { store.delete(name); },
    async list({ prefix = "", limit = 1000, cursor } = {}) {
      const names = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? names.indexOf(cursor) + 1 : 0;
      const slice = names.slice(start, start + limit);
      const complete = start + limit >= names.length;
      return {
        keys: slice.map((name) => ({ name })),
        list_complete: complete,
        cursor: complete ? undefined : slice[slice.length - 1],
      };
    },
    _store: store,
  };
}

const env = { AUTH_TOKEN: "dev", REFS_KV: makeKV() };
const TOK = { "X-Auth-Token": "dev" };
const call = (path, opts) => worker.fetch(new Request("http://localhost" + path, opts), env, {});

// OG scraping must not hit the network.
globalThis.fetch = async () =>
  new Response("<html><head><title>T</title></head></html>", { headers: { "content-type": "text/html" } });

const run = async () => {
  // ---------------------------------------------------------------- manifest
  const m = JSON.parse(MANIFEST);
  eq("manifest start_url", m.start_url, "/drop");
  eq("manifest display", m.display, "standalone");
  eq("share_target action", m.share_target.action, "/share");
  eq("share_target method", m.share_target.method, "POST");
  eq("share_target enctype", m.share_target.enctype, "multipart/form-data");
  ok("share_target accepts files", m.share_target.params.files[0].name === "files");
  ok("manifest has a maskable icon", m.icons.some((i) => i.purpose === "maskable"));
  ok(
    "every manifest icon has a route",
    m.icons.every((i) => Object.keys(ICONS).includes(i.src.slice(1))),
  );

  let r = await call("/manifest.webmanifest");
  eq("manifest 200", r.status, 200);
  eq("manifest content-type", r.headers.get("content-type"), "application/manifest+json");

  // ---------------------------------------------------------------- scripts
  r = await call("/sw.js");
  eq("sw.js 200", r.status, 200);
  // Without this header the SW can't control the whole origin, so the share
  // target silently never fires — worth asserting.
  eq("sw.js allows root scope", r.headers.get("service-worker-allowed"), "/");
  ok("sw.js content-type is js", /javascript/.test(r.headers.get("content-type")));

  r = await call("/bb.js");
  eq("bb.js 200", r.status, 200);

  // Both scripts ship as strings, so a syntax error would only show up in the
  // browser. Parse them here instead.
  ok("bb.js parses", (() => { try { new Function(BB_JS); return true; } catch (e) { console.error(e.message); return false; } })());
  ok("sw.js parses", (() => { try { new Function(SW_JS); return true; } catch (e) { console.error(e.message); return false; } })());
  ok("bb.js exposes BB", /g\.BB\s*=/.test(BB_JS));
  ok("sw.js imports bb.js", /importScripts\("\/bb\.js"\)/.test(SW_JS));
  ok("sw.js never caches the API", /\/api\//.test(SW_JS));

  // ------------------------------------------------------------------ icons
  for (const name of Object.keys(ICONS)) {
    const bytes = iconBytes(name);
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    ok(`${name} is a real PNG`, isPng);
    const res = await call("/" + name);
    eq(`${name} 200`, res.status, 200);
    eq(`${name} content-type`, res.headers.get("content-type"), "image/png");
  }
  eq("unknown icon 404s", iconBytes("nope.png"), null);

  // ------------------------------------------------------------------ pages
  r = await call("/setup");
  eq("setup 200", r.status, 200);
  let body = await r.text();
  ok("setup loads bb.js", body.includes('src="/bb.js"'));
  ok("setup has the iOS Shortcut recipe", body.includes("X-Auth-Token"));
  ok("setup never embeds a token server-side", !body.includes("dev\""));

  r = await call("/share");
  eq("share GET 200", r.status, 200);
  ok("share loads bb.js", (await r.text()).includes('src="/bb.js"'));

  // ------------------------------------------ share POST (no-service-worker)
  const fd = new FormData();
  fd.set("title", "A cool chair");
  fd.set("url", "https://example.com/chair");
  r = await call("/share", { method: "POST", body: fd });
  eq("share POST 200", r.status, 200);
  body = await r.text();
  ok("share POST embeds the payload", body.includes("__BB_SHARE__"));
  ok("share POST carries the url through", body.includes("https://example.com/chair"));
  ok("share POST carries the title through", body.includes("A cool chair"));

  // A payload containing markup must not be able to close the script tag.
  const evil = new FormData();
  evil.set("title", "</script><img src=x onerror=alert(1)>");
  evil.set("url", "https://example.com/x");
  r = await call("/share", { method: "POST", body: evil });
  body = await r.text();
  ok("share POST escapes </script>", !body.includes("</script><img"));
  ok("share POST escapes it as a unicode escape", body.includes("\\u003c/script"));

  // Files shared before the SW is active are reported, not silently dropped.
  const withFile = new FormData();
  withFile.set("files", new File([new Uint8Array([1, 2, 3])], "ref.png", { type: "image/png" }));
  r = await call("/share", { method: "POST", body: withFile });
  body = await r.text();
  ok("share POST reports dropped files", /"filesDropped":1/.test(body));

  // A malformed share must still render the page rather than 500.
  r = await call("/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: "not a form" });
  eq("share POST with junk body still renders", r.status, 200);

  // ------------------------------------------------------- tags on save
  r = await call("/save", {
    method: "POST",
    headers: { ...TOK, "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://example.com/a", tags: "Set-Dec, props, set-dec" }),
  });
  let d = await r.json();
  eq("save with tags -> 201", r.status, 201);
  ok("tags are lowercased + deduped", JSON.stringify(d.ref.tags.filter((t) => t === "set-dec")) === '["set-dec"]');
  ok("tags include props", d.ref.tags.includes("props"));

  // Tags supplied as an array work too (that's what the Shortcut sends).
  r = await call("/save", {
    method: "POST",
    headers: { ...TOK, "Content-Type": "application/json" },
    body: JSON.stringify({ text: "a note", tags: ["Lighting"] }),
  });
  d = await r.json();
  ok("array tags accepted", d.ref.tags.includes("lighting"));

  // ------------------------------------------------------------- still open
  // The PWA routes must not have become authenticated by accident — the
  // service worker fetches them with no token.
  for (const p of ["/manifest.webmanifest", "/sw.js", "/bb.js", "/setup", "/share", "/icon-192.png"]) {
    const res = await call(p);
    ok(`${p} is reachable without a token`, res.status === 200);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
};

run();
