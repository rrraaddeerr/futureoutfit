/**
 * Big Brain — save-ref Worker (optimized rebuild)
 *
 * A drop-anything reference inbox. Drop a link, image, or note and it gets
 * auto-categorized and stored; browse/search them later in a gallery.
 *
 * Endpoints
 *   GET    /            -> redirect to /drop
 *   GET    /drop        -> the drop SPA (public page; actions need the token)
 *   GET    /browse      -> the gallery SPA
 *   GET    /health      -> { ok:true }
 *   POST   /save        -> save a ref            (auth: X-Auth-Token)
 *   GET    /api/list    -> list/search/filter    (auth)
 *   GET    /api/ref/:id -> one ref               (auth)
 *   DELETE /api/ref/:id -> delete a ref + blob   (auth)
 *   GET    /api/export  -> NDJSON of all refs     (auth)
 *   POST   /api/import  -> bulk insert refs        (auth)
 *   GET    /blob/:key   -> raw bytes for an upload (public; key is unguessable)
 *
 * Storage (bound KV namespace REFS_KV)
 *   ref:<id>     -> ref object JSON. id = reverse-timestamp + rand, so a plain
 *                   key-prefix list comes back newest-first with cursor paging.
 *   blob:<key>   -> uploaded bytes (KV). Set REFS_R2 to offload large blobs.
 *
 * Auth: every write/read API requires header `X-Auth-Token: <AUTH_TOKEN>`.
 * Blobs are served unauthenticated at /blob/<key> so <img> tags work; the
 * random key is the capability (same model as rentco-sets slugs).
 */

import { categorize, ALL_CATEGORIES, parseUrl } from "./categorize.js";
import { fetchMeta } from "./og.js";
import { DROP_HTML } from "./pages/drop.js";
import { BROWSE_HTML } from "./pages/browse.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
  "Access-Control-Max-Age": "86400",
};

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });

const html = (markup) =>
  new Response(markup, {
    headers: { "Content-Type": "text/html; charset=utf-8", ...CORS },
  });

function requireToken(request, env) {
  const token = request.headers.get("X-Auth-Token") || "";
  if (!env.AUTH_TOKEN) return json({ ok: false, error: "Worker missing AUTH_TOKEN secret" }, 500);
  if (token !== env.AUTH_TOKEN) return json({ ok: false, error: "Unauthorized" }, 401);
  return null;
}

// id whose lexical order is reverse-chronological (newest sorts first)
const TS_MAX = 10_000_000_000_000; // ~ year 2286 in ms
function newId() {
  const rev = (TS_MAX - Date.now()).toString().padStart(14, "0");
  const rand = crypto.randomUUID().slice(0, 8);
  return `${rev}-${rand}`;
}
const createdAtFromId = (id) => {
  const rev = parseInt(id.split("-")[0], 10);
  return Number.isFinite(rev) ? new Date(TS_MAX - rev).toISOString() : null;
};

// Accept tags as an array or a comma/space-separated string; dedupe + cap.
function normalizeTags(input) {
  let arr = [];
  if (Array.isArray(input)) arr = input;
  else if (typeof input === "string") arr = input.split(/[,\n]/);
  return [...new Set(arr.map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 30);
}

async function putBlob(env, bytes, contentType) {
  const key = crypto.randomUUID().replace(/-/g, "");
  if (env.REFS_R2) {
    await env.REFS_R2.put(`blob:${key}`, bytes, {
      httpMetadata: { contentType: contentType || "application/octet-stream" },
    });
    return { key, store: "r2" };
  }
  await env.REFS_KV.put(`blob:${key}`, bytes, {
    metadata: { contentType: contentType || "application/octet-stream" },
  });
  return { key, store: "kv" };
}

async function getBlob(env, key) {
  if (env.REFS_R2) {
    const obj = await env.REFS_R2.get(`blob:${key}`);
    if (!obj) return null;
    return { body: obj.body, contentType: obj.httpMetadata?.contentType };
  }
  const { value, metadata } = await env.REFS_KV.getWithMetadata(`blob:${key}`, "arrayBuffer");
  if (!value) return null;
  return { body: value, contentType: metadata?.contentType };
}

async function deleteBlob(env, key) {
  if (!key) return;
  if (env.REFS_R2) await env.REFS_R2.delete(`blob:${key}`).catch(() => {});
  else await env.REFS_KV.delete(`blob:${key}`).catch(() => {});
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      // ---- pages ----
      if (path === "/") return Response.redirect(`${url.origin}/drop`, 302);
      if (path === "/drop" && request.method === "GET") return html(DROP_HTML);
      if (path === "/browse" && request.method === "GET") return html(BROWSE_HTML);
      if (path === "/health") return json({ ok: true, categories: ALL_CATEGORIES });

      // ---- public blob read (key is the capability) ----
      if (path.startsWith("/blob/") && request.method === "GET") {
        const key = path.slice(6);
        const blob = await getBlob(env, key);
        if (!blob) return json({ ok: false, error: "Not found" }, 404);
        return new Response(blob.body, {
          headers: {
            "Content-Type": blob.contentType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            ...CORS,
          },
        });
      }

      // ---- POST /save ----
      if (path === "/save" && request.method === "POST") {
        const fail = requireToken(request, env);
        if (fail) return fail;
        return await handleSave(request, env, ctx, url);
      }

      // ---- GET /api/list ----
      if (path === "/api/list" && request.method === "GET") {
        const fail = requireToken(request, env);
        if (fail) return fail;
        return await handleList(env, url);
      }

      // ---- /api/ref/:id ----
      if (path.startsWith("/api/ref/")) {
        const fail = requireToken(request, env);
        if (fail) return fail;
        const id = decodeURIComponent(path.slice("/api/ref/".length));
        if (!id) return json({ ok: false, error: "Missing id" }, 400);
        if (request.method === "GET") {
          const ref = await env.REFS_KV.get(`ref:${id}`, "json");
          return ref ? json({ ok: true, ref }) : json({ ok: false, error: "Not found" }, 404);
        }
        if (request.method === "PATCH") {
          const ref = await env.REFS_KV.get(`ref:${id}`, "json");
          if (!ref) return json({ ok: false, error: "Not found" }, 404);
          const body = await request.json().catch(() => null);
          if (!body || typeof body !== "object") return json({ ok: false, error: "Invalid body" }, 400);
          if (body.category !== undefined) {
            const c = String(body.category).trim().toLowerCase();
            if (!ALL_CATEGORIES.includes(c)) {
              return json({ ok: false, error: `Unknown category. Use one of: ${ALL_CATEGORIES.join(", ")}` }, 400);
            }
            ref.category = c;
          }
          if (body.tags !== undefined) ref.tags = normalizeTags(body.tags);
          if (body.title !== undefined) ref.title = String(body.title).slice(0, 300);
          await env.REFS_KV.put(`ref:${id}`, JSON.stringify(ref));
          return json({ ok: true, ref });
        }
        if (request.method === "DELETE") {
          const ref = await env.REFS_KV.get(`ref:${id}`, "json");
          if (ref?.blobKey) await deleteBlob(env, ref.blobKey);
          await env.REFS_KV.delete(`ref:${id}`);
          return json({ ok: true });
        }
      }

      // ---- GET /api/export (NDJSON) ----
      if (path === "/api/export" && request.method === "GET") {
        const fail = requireToken(request, env);
        if (fail) return fail;
        const refs = await listAll(env);
        const body = refs.map((r) => JSON.stringify(r)).join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "application/x-ndjson",
            "Content-Disposition": 'attachment; filename="bigbrain-export.ndjson"',
            ...CORS,
          },
        });
      }

      // ---- POST /api/import ----
      if (path === "/api/import" && request.method === "POST") {
        const fail = requireToken(request, env);
        if (fail) return fail;
        const body = await request.json().catch(() => null);
        const items = Array.isArray(body) ? body : body?.refs;
        if (!Array.isArray(items)) return json({ ok: false, error: "Expected an array of refs" }, 400);
        let n = 0;
        for (const r of items) {
          if (!r || typeof r !== "object") continue;
          const id = typeof r.id === "string" && r.id ? r.id : newId();
          const ref = { ...r, id };
          await env.REFS_KV.put(`ref:${id}`, JSON.stringify(ref));
          n++;
        }
        return json({ ok: true, imported: n });
      }

      return json({ ok: false, error: "Not found", path }, 404);
    } catch (err) {
      return json({ ok: false, error: String(err?.message ?? err) }, 500);
    }
  },
};

async function handleSave(request, env, ctx, url) {
  const contentType = request.headers.get("content-type") || "";
  let ref;

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ ok: false, error: "Invalid body" }, 400);
    const cls = categorize({ url: body.url, text: body.text });

    ref = baseRef(cls);
    if (cls.kind === "url") {
      ref.url = parseUrl(body.url).toString();
      ref.title = (body.title || "").slice(0, 300);
      // enrich with OG metadata (best-effort, doesn't block the response long)
      const meta = await fetchMeta(ref.url);
      ref.title = ref.title || meta.title || ref.host;
      ref.desc = (body.note || meta.description || "").slice(0, 600);
      ref.image = meta.image || "";
    } else if (cls.kind === "note") {
      ref.text = body.text.slice(0, 5000);
      ref.title = (body.title || ref.text.split("\n")[0] || "Note").slice(0, 200);
    } else {
      return json({ ok: false, error: "Nothing to save" }, 400);
    }
  } else {
    // raw bytes (file upload / pasted image)
    const bytes = await request.arrayBuffer();
    if (!bytes || bytes.byteLength === 0) return json({ ok: false, error: "Empty upload" }, 400);
    const filename = request.headers.get("x-filename") || "";
    const cls = categorize({ isBlob: true, filename, contentType });
    const { key } = await putBlob(env, bytes, contentType);
    ref = baseRef(cls);
    ref.blobKey = key;
    ref.image = `${url.origin}/blob/${key}`;
    ref.title = (filename || `${cls.category} ${new Date().toLocaleDateString()}`).slice(0, 200);
    ref.bytes = bytes.byteLength;
    ref.mime = contentType;
  }

  await env.REFS_KV.put(`ref:${ref.id}`, JSON.stringify(ref));
  return json({ ok: true, ref }, 201);
}

function baseRef(cls) {
  const id = newId();
  return {
    id,
    kind: cls.kind,
    category: cls.category,
    host: cls.host || null,
    tags: cls.tags || [],
    title: "",
    desc: "",
    image: "",
    createdAt: createdAtFromId(id),
  };
}

async function handleList(env, url) {
  const q = (url.searchParams.get("q") || "").toLowerCase().trim();
  const cat = (url.searchParams.get("cat") || "").trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "60", 10) || 60, 200);
  const cursor = url.searchParams.get("cursor") || undefined;

  // When filtering/searching we may need to scan more than one KV page.
  const out = [];
  let kvCursor = cursor;
  let complete = false;
  let scanned = 0;
  while (out.length < limit && scanned < 1000) {
    const page = await env.REFS_KV.list({ prefix: "ref:", limit: 100, cursor: kvCursor });
    for (const k of page.keys) {
      const ref = await env.REFS_KV.get(k.name, "json");
      scanned++;
      if (!ref) continue;
      if (cat && ref.category !== cat) continue;
      if (q && !matches(ref, q)) continue;
      out.push(ref);
      if (out.length >= limit) break;
    }
    if (page.list_complete) { complete = true; kvCursor = undefined; break; }
    kvCursor = page.cursor;
    if (!q && !cat) break; // unfiltered: one page is enough, return its cursor
  }
  return json({ ok: true, refs: out, cursor: complete ? null : kvCursor, categories: ALL_CATEGORIES });
}

function matches(ref, q) {
  return (
    (ref.title && ref.title.toLowerCase().includes(q)) ||
    (ref.desc && ref.desc.toLowerCase().includes(q)) ||
    (ref.url && ref.url.toLowerCase().includes(q)) ||
    (ref.host && ref.host.toLowerCase().includes(q)) ||
    (ref.text && ref.text.toLowerCase().includes(q)) ||
    (ref.tags && ref.tags.join(" ").toLowerCase().includes(q))
  );
}

async function listAll(env) {
  const refs = [];
  let cursor;
  do {
    const page = await env.REFS_KV.list({ prefix: "ref:", limit: 1000, cursor });
    for (const k of page.keys) {
      const ref = await env.REFS_KV.get(k.name, "json");
      if (ref) refs.push(ref);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return refs;
}
