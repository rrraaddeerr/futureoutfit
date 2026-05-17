import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { InquiryPayload } from "@/lib/types";

const VALID_KINDS = new Set(["rental", "consult", "sourcing"]);

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
  let body: unknown;
  try {
    body = await request.json();
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
  console.log(`[inquiry:${inquiry.kind}]`, JSON.stringify(inquiry));

  try {
    const dir = path.join(process.cwd(), "data", "submissions");
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(
      path.join(dir, `${inquiry.kind}.ndjson`),
      JSON.stringify(inquiry) + "\n",
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
        body: JSON.stringify(inquiry),
      });
    } catch (err) {
      console.error("[inquiry] webhook forward failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
