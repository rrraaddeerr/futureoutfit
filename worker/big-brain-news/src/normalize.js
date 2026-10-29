/**
 * URL normalisation + dedupe keys. Pure functions, no I/O.
 *
 * The normalisation rules mirror the ones specced for the save-ref intake
 * redesign (lowercase host, strip www., drop tracking params, drop the
 * fragment, sort what is left, collapse the trailing slash), reimplemented
 * here so this worker never has to import from, or change, save-ref.
 */

const TRACKING_PARAMS = new Set(["fbclid", "igshid", "gclid", "dclid", "mc_cid", "mc_eid", "ref"]);

/** Canonical form of a URL for dedupe, or null if it does not parse. */
export function normalizeUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  u.hash = "";
  u.protocol = "https:";

  const kept = [];
  for (const [k, v] of u.searchParams.entries()) {
    const lk = k.toLowerCase();
    if (lk.startsWith("utm_") || TRACKING_PARAMS.has(lk)) continue;
    kept.push([k, v]);
  }
  kept.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  u.search = kept.length ? `?${new URLSearchParams(kept).toString()}` : "";

  // Collapse a trailing slash, but keep the root path as "/".
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.replace(/\/+$/, "");
  }
  return u.toString();
}

/** SHA-256 hex of a string, via WebCrypto (Workers and modern Node both have it). */
export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The dedupe id for an item link: first 16 hex chars of the SHA-256 of its
 * normalised URL. 64 bits is far beyond collision risk at personal-feed scale,
 * and because the id is derived from the link, the KV item key doubles as the
 * dedupe index: if the key exists, the item has been seen.
 */
export async function dedupeIdFor(rawUrl) {
  const norm = normalizeUrl(rawUrl);
  if (!norm) return null;
  const hex = await sha256Hex(norm);
  return { id: hex.slice(0, 16), urlNorm: norm };
}
