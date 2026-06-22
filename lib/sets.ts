/**
 * Sets client — talks to the rentco-sets Cloudflare worker.
 *
 * Requires env vars (server-side only):
 *   RENTCO_SETS_URL    — e.g. https://rentco-sets.raderturner.workers.dev
 *   RENTCO_SETS_TOKEN  — the OPERATOR_TOKEN secret set on the worker
 *
 * Operator calls go from Next.js API routes, never from the browser, so the
 * token never ships to a client.
 *
 * Client-facing reads (public sets) and writes (responses) hit the worker
 * directly from the browser with no token — the slug is the auth.
 */

export type SetItem = {
  /** VPC barcode (also serves as the inventory ref) */
  barcode: string;
  /** Override title if the operator wants to rename for this set */
  title?: string;
  /** Operator note for this item — "my pick", "happy to swap", etc. */
  note?: string;
  /** Operator flag — "I think this is the move" */
  operatorPick?: boolean;
};

export type SetGroup = {
  /** Local id for stable React keys + decision lookup */
  id: string;
  /** Group label e.g. "Seating", "Lighting", "Bar" */
  label: string;
  /** Operator note shown above the items */
  note?: string;
  /** Selection rule for the client */
  pick?: "any" | "one" | "all";
  items: SetItem[];
};

export type SetStage =
  | "draft"
  | "sent"
  | "reviewing"
  | "approved"
  | "production"
  | "delivered"
  | "returned";

export type SetDoc = {
  id: string;
  /** Random short slug used in the public URL — different from id */
  slug: string;
  /** Operator's title for the set — "Astra Tour 2026 / NYC" */
  name: string;
  /** Client / director the set is for */
  client?: string;
  /** Top-level note from the operator */
  intro?: string;
  groups: SetGroup[];
  /** Hide from public view until ready */
  unpublished?: boolean;
  /** Stop accepting new responses */
  locked?: boolean;
  /**
   * Production lifecycle stage. Optional — if unset, derive from
   * unpublished/locked for backward compat with older docs.
   */
  stage?: SetStage;
  created_at: string;
  updated_at: string;
};

/** Ordered list of stages, in the order they progress. */
export const SET_STAGES: SetStage[] = [
  "draft",
  "sent",
  "reviewing",
  "approved",
  "production",
  "delivered",
  "returned",
];

/** Human label + slate label for each stage. */
export const SET_STAGE_LABELS: Record<SetStage, { short: string; long: string }> = {
  draft: { short: "DRAFT", long: "Draft — not shared" },
  sent: { short: "SENT", long: "Sent — awaiting response" },
  reviewing: { short: "REVIEWING", long: "Reviewing — responses coming in" },
  approved: { short: "APPROVED", long: "Approved — direction locked" },
  production: { short: "PRODUCTION", long: "In production — being prepared" },
  delivered: { short: "DELIVERED", long: "Delivered — on set" },
  returned: { short: "RETURNED", long: "Returned — closed" },
};

/** Derive a stage from a set if not explicitly set. */
export function deriveStage(set: SetDoc): SetStage {
  if (set.stage) return set.stage;
  if (set.unpublished) return "draft";
  if (set.locked) return "approved";
  return "sent";
}

export type SetResponse = {
  visitor: string;
  name: string;
  decisions: Record<string, "approve" | "maybe" | "pass">;
  note?: string;
  updated_at: string;
};

function workerBase(): { url: string; token: string } | null {
  const url = process.env.RENTCO_SETS_URL;
  const token = process.env.RENTCO_SETS_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

export function setsConfigured(): boolean {
  return workerBase() !== null;
}

export async function listSets(): Promise<SetDoc[]> {
  const cfg = workerBase();
  if (!cfg) throw new Error("RENTCO_SETS_URL / RENTCO_SETS_TOKEN not set");
  const res = await fetch(`${cfg.url}/sets`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Worker ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { sets: SetDoc[] };
  return json.sets ?? [];
}

export async function getSet(
  id: string
): Promise<{ set: SetDoc; responses: SetResponse[] } | null> {
  const cfg = workerBase();
  if (!cfg) throw new Error("RENTCO_SETS_URL / RENTCO_SETS_TOKEN not set");
  // Use operator token so we can fetch unpublished sets too
  const res = await fetch(`${cfg.url}/set/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Worker ${res.status}: ${await res.text()}`);
  return (await res.json()) as { set: SetDoc; responses: SetResponse[] };
}

export async function putSet(set: SetDoc): Promise<SetDoc> {
  const cfg = workerBase();
  if (!cfg) throw new Error("RENTCO_SETS_URL / RENTCO_SETS_TOKEN not set");
  const res = await fetch(`${cfg.url}/set/${encodeURIComponent(set.id)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(set),
  });
  if (!res.ok) throw new Error(`Worker ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { set: SetDoc };
  return json.set;
}

export async function deleteSet(id: string): Promise<void> {
  const cfg = workerBase();
  if (!cfg) throw new Error("RENTCO_SETS_URL / RENTCO_SETS_TOKEN not set");
  const res = await fetch(`${cfg.url}/set/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  if (!res.ok) throw new Error(`Worker ${res.status}: ${await res.text()}`);
}

export function newSetId(): string {
  // Short URL-safe random id used as both the storage key and an
  // internal handle. Slug for public URLs is generated separately.
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 8);
}

export function newSlug(): string {
  // 22-char URL-safe slug — hard to guess, fine for public links.
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined") crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 22);
}
