/**
 * READY-TO-APPLY DRAFT — local only. Not pushed, not deployed.
 * Target home: worker/save-ref/src/enrich.js
 *
 * enrichRef() is the ctx.waitUntil() payload scheduled by handleSave()
 * (see the index.js patch / INTEGRATION-NOTES.md §1). It runs AFTER the
 * save response has already gone out, so share-sheet UX is unchanged:
 *
 *   describe the image (describe.js) -> classify onto the 16 tags
 *   (taxonomy.js) -> optionally sync to Notion (notion-sync.js, Option A)
 *   -> one final KV put of the same ref:<id> key.
 *
 * Invariants:
 *  - NEVER throws, NEVER blanks. Any failure leaves the ref exactly as
 *    saved: status "needs_review", visible and retryable.
 *  - The ref is RE-READ from KV after the (slow) describe call, so a
 *    human PATCH that landed during enrichment is never overwritten
 *    from a stale copy — in particular ref.tags is preserved as re-read.
 *  - Human tags supplied at save time count as curation (redesign §3.4):
 *    hints.humanTagged can flip status to "ready" even when the model
 *    abstains or taxonomy is ambiguous. It never invents bbTags.
 *  - bbTags is only written when taxonomy returns status "ready"
 *    (applyThreshold accepted >= 1 tag). On needs_review the proposals
 *    still land in tagScores so a human sees what the model almost said.
 */

import { describeRef } from "./describe.js";
import { classifyRef } from "./taxonomy.js";
import { syncRefToNotion } from "./notion-sync.js";

/**
 * @param {object} env - Worker env (REFS_KV, AI, optional Notion config)
 * @param {string} id - ref id to enrich
 * @param {object} [hints]
 * @param {ArrayBuffer|Uint8Array} [hints.imageBytes] - raw-branch blob bytes
 * @param {string} [hints.imageUrl] - og:image URL for URL refs
 * @param {string} [hints.caption] - share text / OG description (context only)
 * @param {string} [hints.title] - title at save time (context only)
 * @param {boolean} [hints.humanTagged] - human tags were supplied at save time
 * @returns {Promise<object|null>} the enriched ref as stored, or null
 */
export async function enrichRef(env, id, hints = {}) {
  try {
    if (!env?.REFS_KV || !id) return null;

    // Describe FIRST (slow, AI) — then re-read, so nothing below works
    // from a copy that predates a possible human PATCH.
    const described = await describeRef(env, hints);

    const ref = await env.REFS_KV.get(`ref:${id}`, "json");
    if (!ref) return null; // deleted while we were thinking

    if (described) {
      ref.look = described.look;
      const verdict = classifyRef(described);
      ref.tagScores = verdict.scores;
      if (verdict.status === "ready") {
        ref.bbTags = verdict.accepted;
        ref.status = "ready";
      }
    }
    if (ref.status !== "ready" && hints.humanTagged) {
      ref.status = "ready"; // human curation at save time counts
    }

    // Option A: no-ops (returns null) until NOTION_API_KEY +
    // BB_NOTION_DB_ID are configured. Its failure never blocks the put.
    const pageId = await syncRefToNotion(env, ref);
    if (pageId) ref.notionPageId = pageId;

    await env.REFS_KV.put(`ref:${id}`, JSON.stringify(ref));
    return ref;
  } catch {
    return null; // ref stays needs_review — visible, retryable, never blank
  }
}
