import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { InquiryPayload } from "@/lib/types";

const VALID_KINDS = new Set(["rental", "consult", "sourcing"]);
const MAX_BODY_BYTES = 64_000;
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 8;

/**
 * Best-effort in-memory rate limit. Persists for the life of a server
 * process — effective for a long-running `next start`, and a partial guard on
 * serverless (per warm instance). For hard limits, front this with a managed
 * rate limiter or a form provider.
 */
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t > RATE_WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > RATE_MAX;
}

function isValid(body: unknown): body is InquiryPayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.kind === "string" &&
    VALID_KINDS.has(b.kind) &&
    typeof b.fields === "object" &&
    b.fields !== null
  );
}

/**
 * Receives a rental / consult / sourcing inquiry.
 *
 * Phase-1 MVP behaviour:
 *  - rejects oversized bodies and rate-limits by IP,
 *  - silently absorbs honeypot-tripped submissions (bot spam),
 *  - validates the payload,
 *  - logs it (visible to the operator running the app),
 *  - appends it to data/submissions/<kind>.ndjson when the filesystem is
 *    writable (skipped silently on read-only/serverless hosts),
 *  - forwards it to INQUIRY_WEBHOOK_URL if set — wire that to a CRM, an
 *    automation tool (Zapier / Make), or an email relay.
 *
 * No accounts, no payment: every request is confirmed manually by RaderENT.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      { status: 429 }
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Request too large." },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (!isValid(body)) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid inquiry fields." },
      { status: 400 }
    );
  }

  const inquiry = body as InquiryPayload;

  // Honeypot: a real visitor never fills the hidden field. Absorb silently so
  // the bot sees a success and doesn't adapt.
  if (typeof inquiry.hp === "string" && inquiry.hp.trim() !== "") {
    console.log(`[inquiry:${inquiry.kind}] honeypot tripped — discarded`);
    return NextResponse.json({ ok: true });
  }

  const record: InquiryPayload = {
    kind: inquiry.kind,
    fields: inquiry.fields,
    selected_items: inquiry.selected_items,
    attachments: inquiry.attachments,
    submitted_at: inquiry.submitted_at,
  };
  console.log(`[inquiry:${record.kind}]`, JSON.stringify(record));

  try {
    const dir = path.join(process.cwd(), "data", "submissions");
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(
      path.join(dir, `${record.kind}.ndjson`),
      JSON.stringify(record) + "\n",
      "utf8"
    );
  } catch {
    // Read-only filesystem (e.g. serverless) — logging + webhook still cover it.
  }

  const webhook = process.env.INQUIRY_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
    } catch (err) {
      console.error("[inquiry] webhook forward failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
