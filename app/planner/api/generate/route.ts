import { NextResponse } from "next/server";
import type { GenerateMode } from "@/lib/planner/ai";

const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-sonnet-4-6";

const SYSTEM_BY_MODE: Record<GenerateMode, string> = {
  ideas: `You help someone find unconventional ways to turn their interests, morals, skills, and dreams into a way of working and earning. Be specific, concrete, and gently bold. No generic advice. Each idea should reference at least one specific detail from her profile, name a tiny first step, and feel possible THIS month — not someday. Vary the kinds of work (service, product, event, role, partnership).`,
  affirmations: `You write short, true-sounding affirmations grounded in the person's own values, dreams, and signatures. No toxic positivity. No corporate self-help voice. Sound like the wisest friend who knows them. 1–2 sentences each.`,
  reframes: `You take a doubt the person has expressed and offer reframes that are honest, not saccharine. Each reframe should: (1) acknowledge the fear, (2) name what it's actually pointing at, (3) offer the next workable move. 2–3 sentences each.`,
  visualization: `You write a short, vivid visualization for the person to read and sit with. Concrete sensory details. Use 'you' voice. 4–6 sentences.`,
};

const USER_BY_MODE: Record<GenerateMode, (count: number, prompt?: string) => string> = {
  ideas: (n) =>
    `Generate ${n} unconventional, specific ideas based on the profile above. Each 2–4 sentences. Return ONLY a JSON array of strings — no preamble, no markdown.`,
  affirmations: (n) =>
    `Generate ${n} affirmations grounded in the profile above. Return ONLY a JSON array of strings — no preamble, no markdown.`,
  reframes: (_n, prompt) =>
    `The doubt: "${prompt ?? ""}". Generate 3 reframes for it. Return ONLY a JSON array of strings — no preamble, no markdown.`,
  visualization: (_n, prompt) =>
    `Write ONE visualization. Optional seed: "${prompt ?? "the version of you who already does this"}". Return ONLY a JSON array with a single string — no preamble, no markdown.`,
};

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        items: [],
        error:
          "AI mode is off — set ANTHROPIC_API_KEY in the server env (.env.local) and restart.",
      },
      { status: 400 }
    );
  }

  let body: { mode?: GenerateMode; profile?: string; prompt?: string; count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ items: [], error: "Bad JSON" }, { status: 400 });
  }

  const mode = body.mode ?? "ideas";
  const profile = (body.profile ?? "").slice(0, 8000);
  const count = Math.max(1, Math.min(10, body.count ?? 5));
  const system = SYSTEM_BY_MODE[mode];
  const userText = USER_BY_MODE[mode](count, body.prompt);

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: [
          { type: "text", text: system },
          {
            type: "text",
            text: `# Profile\n\n${profile || "(empty — be generous, ask her to fill in her buckets)"}`,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userText }],
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { items: [], error: err instanceof Error ? err.message : "Network error" },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { items: [], error: `Anthropic ${res.status}: ${text.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const data = (await res.json()) as { content?: { type: string; text: string }[] };
  const raw = data.content?.find((c) => c.type === "text")?.text ?? "[]";
  // Extract the first JSON array we can find.
  const match = raw.match(/\[[\s\S]*\]/);
  let items: string[] = [];
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) items = parsed.filter((x) => typeof x === "string");
    } catch {
      // fall through
    }
  }
  if (items.length === 0) {
    // Last-ditch: treat plain text as a single item.
    const fallback = raw.trim();
    if (fallback) items = [fallback];
  }
  return NextResponse.json({ items });
}
