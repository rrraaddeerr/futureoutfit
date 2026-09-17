#!/usr/bin/env node
/**
 * Run Big Brain locally with no Cloudflare account and no wrangler.
 *
 *   npm run dev:local            # http://localhost:8788/drop   token: dev
 *   PORT=9000 TOKEN=xyz npm run dev:local
 *
 * Serves the real Worker over plain Node HTTP with a Map-backed KV, persisted
 * to .bigbrain-dev.json so refs survive a restart. Service workers and PWA
 * installs are allowed on localhost without HTTPS, so the share sheet, the
 * offline queue and Add-to-Home-Screen can all be exercised here.
 *
 * This is for trying it out and for tests — production still runs on Workers.
 */

import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../src/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE = join(ROOT, ".bigbrain-dev.json");
const PORT = Number(process.env.PORT || 8788);
const TOKEN = process.env.TOKEN || "dev";

// ---- a KV namespace backed by a Map, saved to disk -------------------------
function makeKV() {
  const store = new Map();
  if (existsSync(STATE)) {
    try {
      for (const [k, v] of JSON.parse(readFileSync(STATE, "utf8"))) store.set(k, v);
    } catch {
      /* corrupt state file: start clean rather than crash */
    }
  }
  let timer = null;
  const persist = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      // Blobs are raw bytes; skip them so the JSON stays valid and small.
      const rows = [...store.entries()].filter(([k]) => !k.startsWith("blob:"));
      try { writeFileSync(STATE, JSON.stringify(rows)); } catch { /* ignore */ }
    }, 250);
    if (timer.unref) timer.unref();
  };

  return {
    async get(name, type) {
      const e = store.get(name);
      if (!e) return null;
      if (type === "json") return JSON.parse(e.value);
      if (type === "arrayBuffer") return e.value;
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

const env = { AUTH_TOKEN: TOKEN, REFS_KV: makeKV() };

// ---- Node req/res <-> web Request/Response ---------------------------------
const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const request = new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
  });

  let out;
  try {
    out = await worker.fetch(request, env, {});
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
🧠 Big Brain (local)

   Drop     http://localhost:${PORT}/drop
   Gallery  http://localhost:${PORT}/browse
   Setup    http://localhost:${PORT}/setup

   Token    ${TOKEN}
   Data     ${STATE}

   Service workers and PWA installs work on localhost, so the share target
   and the offline queue can be tested here. Ctrl-C to stop.
`);
});
