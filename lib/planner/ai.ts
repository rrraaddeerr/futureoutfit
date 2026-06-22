// Client-side wrapper for the AI generate endpoint.
// The actual Anthropic call happens server-side in /planner/api/generate
// so the API key never leaves the server.

export type GenerateMode = "ideas" | "affirmations" | "reframes" | "visualization";

export type GenerateRequest = {
  mode: GenerateMode;
  profile: string;
  prompt?: string;
  count?: number;
};

export type GenerateResponse = { items: string[]; error?: string };

export async function generateAI(req: GenerateRequest): Promise<GenerateResponse> {
  try {
    const res = await fetch("/planner/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { items: [], error: body.error ?? `HTTP ${res.status}` };
    }
    const data = (await res.json()) as GenerateResponse;
    return data;
  } catch (err) {
    return { items: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

// Render the buckets into a compact text profile the AI can use as context.
import { BUCKETS } from "./data";
import type { Buckets } from "./types";

export function profileText(buckets: Buckets, ownerName: string): string {
  const lines: string[] = [];
  if (ownerName) lines.push(`Person: ${ownerName}`);
  for (const b of BUCKETS) {
    const entries = buckets[b.key];
    if (entries.length === 0) continue;
    lines.push(`\n## ${b.title}`);
    for (const e of entries) {
      lines.push(`- ${e.text}${e.note ? ` (${e.note})` : ""}`);
    }
  }
  return lines.join("\n").trim();
}
