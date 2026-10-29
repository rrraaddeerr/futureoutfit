/**
 * Big Brain News: one digest page for Rader's paid news.
 *
 * A cron polls his subscription feeds a few times a day, dedupes by
 * normalised link, and stores items in KV under news: keys. The digest
 * page groups what landed today and this week, by source, each headline
 * linking out to the original post. Scope and reasoning live in
 * ~/workspace/big-brain-news-module/scope.md (Option B).
 *
 * Endpoints
 *   GET    /            -> the digest page (public; headlines are public)
 *   GET    /health      -> { ok:true, lastRunAt } (public)
 *   GET    /api/items   -> stored items as JSON   (auth: X-Auth-Token)
 *   POST   /api/refresh -> poll the feeds now     (auth: X-Auth-Token)
 *
 * Storage (bound KV namespace NEWS_KV, this worker's own namespace)
 *   news:item:<id>  -> item JSON; id derives from the normalised link,
 *                      so the key's existence is the dedupe check
 *   news:meta       -> last ingest run summary
 *
 * This worker never touches save-ref, its KV, or its intake pipeline.
 * News items are kept for 60 days, then pruned by the cron run.
 */

import { SOURCES } from "./feeds.js";
import { ingestAll, listItems, pruneOld } from "./store.js";
import { renderDigest } from "./pages/digest.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

async function runIngest(env) {
  const result = await ingestAll(env, SOURCES);
  const pruned = await pruneOld(env);
  return { ...result, pruned };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (path === "/" && request.method === "GET") {
        const items = await listItems(env);
        return html(renderDigest(items));
      }

      if (path === "/health") {
        const meta = await env.NEWS_KV.get("news:meta", "json");
        return json({ ok: true, sources: SOURCES.map((s) => s.id), lastRunAt: meta?.lastRunAt ?? null });
      }

      if (path === "/api/items" && request.method === "GET") {
        const denied = requireToken(request, env);
        if (denied) return denied;
        const items = await listItems(env);
        return json({ ok: true, count: items.length, items });
      }

      if (path === "/api/refresh" && request.method === "POST") {
        const denied = requireToken(request, env);
        if (denied) return denied;
        const result = await runIngest(env);
        return json({ ok: true, ...result });
      }

      return json({ ok: false, error: "Not found" }, 404);
    } catch (err) {
      return json({ ok: false, error: String(err?.message || err) }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runIngest(env));
  },
};
