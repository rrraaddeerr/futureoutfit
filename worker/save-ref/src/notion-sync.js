/**
 * READY-TO-APPLY DRAFT — local only. Not pushed, not deployed.
 * Target home: worker/save-ref/src/notion-sync.js
 *
 * Option A bridge (see intake-redesign.md §3.6): KV is the intake of
 * record, Notion becomes a view. syncRefToNotion() creates or updates the
 * Big Brain Notion page for one enriched ref and returns the Notion page
 * id (or null). The id is stored on the ref as `notionPageId` — that is
 * what stops the sync itself becoming a duplicate factory: a ref with an
 * id is PATCHed, never re-created.
 *
 * Hard rules:
 *  - NO-OP unless both env.NOTION_API_KEY (wrangler secret) and
 *    env.BB_NOTION_DB_ID (var, 32–36 char Notion database id) are set.
 *    A placeholder / malformed DB id is treated as "not configured".
 *  - NEVER throws. Every failure returns null; the caller (enrich.js)
 *    leaves notionPageId null and a null id is the retry queue — a later
 *    pass syncs any enriched ref whose notionPageId is still null.
 *  - needs_review refs DO sync, flagged, so the flag is visible on the
 *    By-Category board where Rader actually looks.
 *
 * Assumed Big Brain DB schema (from intake-redesign.md §1 — the fields
 * that exist today): Name (title), Look (rich_text), Notes, Source App,
 * Tags (multi_select), Type, URL. Plus ONE new property this sync wants:
 * "Needs review" (checkbox) — it does NOT exist in the DB yet and adding
 * it is a one-time schema change for Rader to approve. Until it exists,
 * the full payload 400s and sync falls back to a minimal payload without
 * it (and without Type, whose property type is unverified), so sync does
 * not hard-fail on the missing property.
 */

const NOTION_VERSION = "2022-06-28"; // pin; bump deliberately, not silently
const API = "https://api.notion.com/v1";
const DB_ID_RE = /^[0-9a-fA-F]{32}$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function notionConfigured(env) {
  return Boolean(
    env?.NOTION_API_KEY &&
      typeof env.BB_NOTION_DB_ID === "string" &&
      DB_ID_RE.test(env.BB_NOTION_DB_ID),
  );
}

const rt = (content) =>
  content ? [{ type: "text", text: { content: String(content).slice(0, 2000) } }] : [];

/**
 * Build the Notion properties object for a ref. Pure — unit-testable.
 * minimal=true drops the two unverified properties ("Needs review"
 * checkbox, Type select) for the 400-fallback attempt.
 */
export function notionProperties(ref, { minimal = false } = {}) {
  const props = {
    Name: { title: rt(ref.title || "Untitled") },
    Look: { rich_text: rt(ref.look || "") },
    Tags: {
      multi_select: (Array.isArray(ref.bbTags) ? ref.bbTags : []).map((name) => ({ name })),
    },
    URL: { url: ref.url || null },
  };
  if (!minimal) {
    props["Source App"] = { rich_text: rt(ref.host || "") };
    if (ref.category) props.Type = { select: { name: ref.category } };
    props["Needs review"] = { checkbox: (ref.status || "needs_review") === "needs_review" };
  }
  return props;
}

async function notionFetch(env, path, method, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

/**
 * Create or update the ref's Notion page.
 * @returns {Promise<string|null>} Notion page id, or null on no-op/failure
 */
export async function syncRefToNotion(env, ref) {
  try {
    if (!notionConfigured(env) || !ref) return null;

    const attempt = async (minimal) => {
      const properties = notionProperties(ref, { minimal });
      if (ref.notionPageId) {
        return notionFetch(env, `/pages/${ref.notionPageId}`, "PATCH", { properties });
      }
      return notionFetch(env, "/pages", "POST", {
        parent: { database_id: env.BB_NOTION_DB_ID },
        properties,
      });
    };

    let r = await attempt(false);
    // A 400 here is most likely the not-yet-created "Needs review"
    // property or a Type property-type mismatch. Retry once, minimal.
    if (!r.ok && r.status === 400) r = await attempt(true);
    if (!r.ok) return null;
    return typeof r.data?.id === "string" ? r.data.id : ref.notionPageId || null;
  } catch {
    return null; // sync failure never fails a save or an enrichment
  }
}
