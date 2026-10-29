/**
 * KV storage + feed ingestion.
 *
 * Keys (in this worker's own NEWS_KV namespace, never in save-ref's):
 *   news:item:<id>  -> item JSON. id comes from the normalised link
 *                      (see normalize.js), so the key's existence IS the
 *                      dedupe check. No separate index to keep in sync.
 *   news:meta       -> { lastRunAt, lastResults } for the health endpoint.
 *
 * Item shape:
 *   { id, sourceId, sourceName, title, url, urlNorm, guid,
 *     publishedAt, fetchedAt, excerpt, text }
 */

import { parseFeed } from "./feed.js";
import { dedupeIdFor } from "./normalize.js";

export const ITEM_PREFIX = "news:item:";
const RETENTION_DAYS = 60;
const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = "BigBrainNews/1.0 (+https://github.com/rrraaddeerr/futureoutfit)";

const itemKey = (id) => `${ITEM_PREFIX}${id}`;

/** Fetch one feed with a timeout; throws on non-200 so callers can record it. */
async function fetchFeedXml(feedUrl) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`feed fetch failed: HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Poll every source once. New items (by normalised link) are written; ones
 * already in KV are skipped untouched, so a re-poll is idempotent.
 * @returns {Promise<{ranAt: string, sources: Array<{sourceId, fetched, added, skipped, error?}>}>}
 */
export async function ingestAll(env, sources, fetchXml = fetchFeedXml) {
  const ranAt = new Date().toISOString();
  const results = [];

  for (const source of sources) {
    const r = { sourceId: source.id, fetched: 0, added: 0, skipped: 0 };
    try {
      const xml = await fetchXml(source.feedUrl);
      const items = parseFeed(xml);
      r.fetched = items.length;
      for (const item of items) {
        const d = await dedupeIdFor(item.link);
        if (!d) { r.skipped++; continue; }
        const key = itemKey(d.id);
        const existing = await env.NEWS_KV.get(key);
        if (existing) { r.skipped++; continue; }
        const record = {
          id: d.id,
          sourceId: source.id,
          sourceName: source.name,
          title: item.title,
          url: item.link,
          urlNorm: d.urlNorm,
          guid: item.guid,
          publishedAt: item.publishedAt,
          fetchedAt: ranAt,
          excerpt: item.excerpt,
          text: item.text,
        };
        await env.NEWS_KV.put(key, JSON.stringify(record));
        r.added++;
      }
    } catch (err) {
      r.error = String(err?.message || err);
    }
    results.push(r);
  }

  await env.NEWS_KV.put("news:meta", JSON.stringify({ lastRunAt: ranAt, lastResults: results }));
  return { ranAt, sources: results };
}

/** All stored items, newest first by publishedAt (falling back to fetchedAt). */
export async function listItems(env, limit = 500) {
  const items = [];
  let cursor;
  do {
    const page = await env.NEWS_KV.list({ prefix: ITEM_PREFIX, limit: 1000, cursor });
    for (const k of page.keys) {
      const item = await env.NEWS_KV.get(k.name, "json");
      if (item) items.push(item);
      if (items.length >= limit) break;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && items.length < limit);

  const when = (it) => it.publishedAt || it.fetchedAt || "";
  items.sort((a, b) => (when(a) < when(b) ? 1 : when(a) > when(b) ? -1 : 0));
  return items;
}

/** Delete items published (or fetched) more than RETENTION_DAYS ago. */
export async function pruneOld(env, now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let removed = 0;
  let cursor;
  do {
    const page = await env.NEWS_KV.list({ prefix: ITEM_PREFIX, limit: 1000, cursor });
    for (const k of page.keys) {
      const item = await env.NEWS_KV.get(k.name, "json");
      const when = item?.publishedAt || item?.fetchedAt || "";
      if (when && when < cutoff) {
        await env.NEWS_KV.delete(k.name);
        removed++;
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return removed;
}
