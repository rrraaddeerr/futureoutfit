/**
 * READY-TO-APPLY DRAFT — local only. Not pushed, not deployed.
 * Target home: worker/save-ref/src/dedupe.js
 *
 * Duplicate detection for refs, in two halves:
 *   pure:  normalizeUrl(), sha256Hex()          — no I/O, plain-node tests
 *   KV:    find / write index helpers           — env.REFS_KV, the same
 *          namespace and access patterns index.js already uses
 *          (get(key, "json") for refs; plain put/get for these indexes)
 *
 * Index keys live in REFS_KV beside the existing key families, so the
 * prefix-scoped code that exists today is untouched by them:
 *   url:<sha256(normalised url)>   -> ref id (string)
 *   hash:<sha256(blob bytes)>     -> ref id (string)
 *   (existing: ref:<id> -> ref JSON, blob:<key> -> bytes)
 *
 * NOTE on placement: the redesign draft put normalizeUrl() in
 * categorize.js. It is drafted here instead so categorize.js stays
 * untouched; index.js can re-export it from here if a second caller
 * ever wants it. Function identical either way.
 *
 * KV is eventually consistent: two saves of the same thing inside the
 * same second can both miss the index and both land. Accepted for a
 * single-user inbox (redesign §3.5); browse-time dupe grouping stays
 * the backstop. Also: handleList()/listAll() and /api/export only scan
 * the ref: prefix, so indexes never leak into listings — but they are
 * also NOT exported, so a re-import must rebuild them (see
 * INTEGRATION-NOTES.md).
 */

import { parseUrl } from "./categorize.js";

// Tracking parameters that never change what a URL points at.
// ("ref" is deliberately NOT stripped — on some shops it selects content.)
const TRACKING_PARAMS = [
  /^utm_/i,
  /^(fbclid|gclid|dclid|igshid|igsh|mc_cid|mc_eid|msclkid|twclid)$/i,
  /^(si|feature)$/i, // youtube share cruft
];

/**
 * Canonical form of a URL for dedupe, or null if it isn't a usable URL.
 * Lowercase host (via URL), www. stripped, tracking params removed,
 * remaining params sorted, fragment dropped, trailing slash collapsed.
 * The path's case is PRESERVED — some servers are case-sensitive.
 */
export function normalizeUrl(raw) {
  const u = parseUrl(raw);
  if (!u) return null;
  u.hostname = u.hostname.replace(/^www\./, "");
  u.hash = "";
  const kept = [];
  for (const [k, v] of u.searchParams) {
    if (!TRACKING_PARAMS.some((re) => re.test(k))) kept.push([k, v]);
  }
  kept.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  u.search = "";
  for (const [k, v] of kept) u.searchParams.append(k, v);
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
  return u.toString();
}

/**
 * SHA-256 hex of a string (UTF-8) or byte array. WebCrypto —
 * available in Workers and in Node 19+, so the pure half still tests
 * with plain node.
 * @param {string|ArrayBuffer|Uint8Array} data
 * @returns {Promise<string>} 64-char lowercase hex
 */
export async function sha256Hex(data) {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
        ? data
        : new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const urlIndexKey = async (urlNorm) => `url:${await sha256Hex(urlNorm)}`;
const hashIndexKey = (contentHash) => `hash:${contentHash}`;

/** @returns {Promise<string|null>} existing ref id for this normalised URL */
export async function findByUrl(env, urlNorm) {
  if (!urlNorm) return null;
  return (await env.REFS_KV.get(await urlIndexKey(urlNorm))) || null;
}

/** @returns {Promise<string|null>} existing ref id for this content hash */
export async function findByHash(env, contentHash) {
  if (!contentHash) return null;
  return (await env.REFS_KV.get(hashIndexKey(contentHash))) || null;
}

/**
 * One lookup for handleSave()/import: URL first (redesign §3.5 order),
 * then blob hash.
 * @returns {Promise<{id: string, via: "url"|"hash"}|null>}
 */
export async function findDuplicate(env, { urlNorm = null, contentHash = null } = {}) {
  const byUrl = await findByUrl(env, urlNorm);
  if (byUrl) return { id: byUrl, via: "url" };
  const byHash = await findByHash(env, contentHash);
  if (byHash) return { id: byHash, via: "hash" };
  return null;
}

/**
 * Write the index entries for a ref that was just stored. Call AFTER
 * the ref:<id> put succeeds (same request), so an index never points
 * at a ref that failed to land.
 */
export async function writeIndexes(env, ref) {
  if (ref?.urlNorm) await env.REFS_KV.put(await urlIndexKey(ref.urlNorm), ref.id);
  if (ref?.contentHash) await env.REFS_KV.put(hashIndexKey(ref.contentHash), ref.id);
}

/**
 * Remove a ref's index entries (for the DELETE /api/ref/:id path, so a
 * deleted ref's URL/hash become saveable again instead of pointing at
 * a ghost).
 */
export async function deleteIndexes(env, ref) {
  if (ref?.urlNorm) await env.REFS_KV.delete(await urlIndexKey(ref.urlNorm)).catch(() => {});
  if (ref?.contentHash) await env.REFS_KV.delete(hashIndexKey(ref.contentHash)).catch(() => {});
}
