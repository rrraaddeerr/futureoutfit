// Integration test for the Worker's fetch + scheduled handlers, in plain
// Node. Mocks KV (Map-backed) and global fetch (the feed), so it needs no
// wrangler and no network. Run: node test/worker.test.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../src/index.js";

let pass = 0, fail = 0;
function ok(label, cond) { cond ? pass++ : (fail++, console.error("✗ " + label)); }
function eq(label, got, want) { ok(label + ` (got ${JSON.stringify(got)})`, got === want); }

function makeKV() {
  const store = new Map();
  return {
    async get(name, type) {
      const e = store.get(name);
      if (!e) return null;
      if (type === "json") return JSON.parse(e.value);
      return e.value;
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
      return { keys: slice.map((name) => ({ name })), list_complete: complete, cursor: complete ? undefined : slice[slice.length - 1] };
    },
    _store: store,
  };
}

const fixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "fixtures", "nates-feed.xml"), "utf8");
globalThis.fetch = async () => new Response(fixture, { headers: { "content-type": "application/rss+xml" } });

const env = { AUTH_TOKEN: "dev", NEWS_KV: makeKV() };
const TOK = { "X-Auth-Token": "dev" };
const req = (path, opts = {}) => new Request("http://localhost" + path, opts);
const call = (path, opts) => worker.fetch(req(path, opts), env, {});

const run = async () => {
  // health before any run
  let r = await call("/health");
  let d = await r.json();
  eq("health 200", r.status, 200);
  eq("health lastRunAt null", d.lastRunAt, null);

  // API is behind the token
  r = await call("/api/items");
  eq("items without token -> 401", r.status, 401);

  // first ingest, via the refresh endpoint
  r = await call("/api/refresh", { method: "POST", headers: TOK });
  d = await r.json();
  eq("refresh 200", r.status, 200);
  eq("fetched 3", d.sources[0].fetched, 3);
  eq("added 3", d.sources[0].added, 3);
  eq("skipped 0", d.sources[0].skipped, 0);

  // second ingest: dedupe means nothing new is written
  r = await call("/api/refresh", { method: "POST", headers: TOK });
  d = await r.json();
  eq("re-refresh added 0", d.sources[0].added, 0);
  eq("re-refresh skipped 3", d.sources[0].skipped, 3);

  // items endpoint
  r = await call("/api/items", { headers: TOK });
  d = await r.json();
  eq("items count 3", d.count, 3);
  eq("items carry the news: shape", d.items[0].sourceId, "nates");
  ok("items newest first", d.items[0].publishedAt >= d.items[1].publishedAt);

  // digest page renders from KV, no token needed
  r = await call("/");
  const page = await r.text();
  eq("digest 200", r.status, 200);
  ok("digest has the title", page.includes("Big Brain News"));
  ok("digest shows a headline", page.includes("Anthropic"));
  ok("digest links out", page.includes("https://natesnewsletter.substack.com/p/anthropic-ipo-s1-analysis"));
  ok("digest has no em dashes", !page.includes("\u2014"));

  // everything stored lives under news: keys only
  const keys = [...env.NEWS_KV._store.keys()];
  ok("all keys under news:", keys.every((k) => k.startsWith("news:")));
  eq("3 item keys + meta", keys.length, 4);

  // the scheduled handler ingests on a fresh store
  const env2 = { AUTH_TOKEN: "dev", NEWS_KV: makeKV() };
  let waited = null;
  await worker.scheduled({}, env2, { waitUntil: (p) => { waited = p; } });
  await waited;
  eq("scheduled stored 3 items",
    [...env2.NEWS_KV._store.keys()].filter((k) => k.startsWith("news:item:")).length, 3);

  // pruning: a 90-day-old item disappears on the next refresh
  const old = {
    id: "oldoldoldold0000", sourceId: "nates", sourceName: "Nate's AI News",
    title: "ancient", url: "https://natesnewsletter.substack.com/p/ancient",
    urlNorm: "https://natesnewsletter.substack.com/p/ancient", guid: "x",
    publishedAt: new Date(Date.now() - 90 * 864e5).toISOString(),
    fetchedAt: new Date(Date.now() - 90 * 864e5).toISOString(), excerpt: "", text: "",
  };
  await env.NEWS_KV.put("news:item:oldoldoldold0000", JSON.stringify(old));
  r = await call("/api/refresh", { method: "POST", headers: TOK });
  d = await r.json();
  eq("pruned 1", d.pruned, 1);
  ok("old key gone", !env.NEWS_KV._store.has("news:item:oldoldoldold0000"));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
