import type { InquiryKind, InquiryPayload } from "./types";

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

/**
 * Posts an inquiry to the local API route. The route logs and stores it, and
 * forwards to INQUIRY_WEBHOOK_URL (CRM / email relay) if configured.
 */
export async function submitInquiry(
  kind: InquiryKind,
  fields: Record<string, string>,
  options: {
    selected_items?: { id: string; title: string }[];
    attachments?: { name: string; size: number }[];
  } = {}
): Promise<SubmitResult> {
  const payload: InquiryPayload = {
    kind,
    fields,
    selected_items: options.selected_items,
    attachments: options.attachments,
    submitted_at: new Date().toISOString(),
  };

  try {
    const res = await fetch("/api/inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, error: `Request failed (${res.status}).` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error — check your connection and retry." };
  }
}
