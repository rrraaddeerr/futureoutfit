#!/usr/bin/env node
/**
 * Run Big Brain News locally with no Cloudflare account and no wrangler.
 *
 *   npm run dev:local            # http://localhost:8789/   token: dev
 *   PORT=9000 TOKEN=xyz npm run dev:local
 *
 * Serves the real Worker over plain Node HTTP with a Map-backed KV,
 * persisted to .bigbrain-news-dev.json so items survive a restart.
 * Local-only extras, intercepted before the Worker sees them:
 *   POST /__scheduled  -> runs the cron ingest now (real feeds, real fetch)
 *
 * This is for trying it out and for tests. Production runs on Workers.
 */

import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../src/index.js";
import { ingestAll, pruneOld } from "../src/store.js";
import { SOURCES } from "../src/feeds.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 8789);
const TOKEN = process.env.TOKEN || "dev";

const STATE =
  process.env.BB_STATE === "memory"
    ? null
    : process.env.BB_STATE || join(ROOT, ".bigbrain-news-dev.json");

// ---- a KV namespace backed by a Map, saved to disk -------------------------
function makeKV() {
  const store = new Map();
  if (STATE && existsSync(STATE)) {
    try {
      for (const [k, v] of JSON.parse(readFileSync(STATE, "utf8"))) store.set(k, v);
    } catch {
      /* corrupt state file: start clean rather than crash */
    }
  }
  let timer = null;
  const persist = () => {
    if (!STATE) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { writeFileSync(STATE, JSON.stringify([...store.entries()])); } catch { /* ignore */ }
    }, 250);
    if (timer.unref) timer.unref();
  };

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
    async put(name, value, opts = {}) {
      store.set(name, { value, metadata: opts.metadata ?? null });
      persist();
    },
    async delete(name) { store.delete(name); persist(); },
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
  };
}

const env = { AUTH_TOKEN: TOKEN, NEWS_KV: makeKV() };

// ---- Node req/res <-> web Request/Response ---------------------------------
const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  let out;
  try {
    if (req.url === "/__scheduled" && req.method === "POST") {
      const result = await ingestAll(env, SOURCES);
      const pruned = await pruneOld(env);
      out = new Response(JSON.stringify({ ok: true, ...result, pruned }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      const request = new Request(`http://localhost:${PORT}${req.url}`, {
        method: req.method,
        headers: req.headers,
        body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
      });
      out = await worker.fetch(request, env, {});
    }
  } catch (err) {
    out = new Response(String(err?.stack || err), { status: 500 });
  }

  const headers = {};
  out.headers.forEach((v, k) => { headers[k] = v; });
  res.writeHead(out.status, headers);
  res.end(Buffer.from(await out.arrayBuffer()));
});

server.listen(PORT, () => {
  console.log(`
🧠 Big Brain News (local)

   Digest   http://localhost:${PORT}/
   Ingest   curl -X POST http://localhost:${PORT}/__scheduled
   Token    ${TOKEN}
   Data     ${STATE || "in memory only: nothing is persisted"}

   Ctrl-C to stop.
`);
});
