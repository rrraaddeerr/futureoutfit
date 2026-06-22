import {
  IDEA_TEMPLATES,
  REFRAME_TEMPLATES,
  REFRAME_FALLBACK,
  AFFIRMATION_SEEDS,
  type BucketKey,
} from "./data";
import type { Buckets } from "./types";

function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate one idea from her own buckets. Returns null if she has too little.
export function remixIdea(buckets: Buckets): string | null {
  const usable = shuffle(IDEA_TEMPLATES).filter((t) => {
    const counts: Partial<Record<BucketKey, number>> = {};
    for (const need of t.needs) counts[need] = (counts[need] ?? 0) + 1;
    return Object.entries(counts).every(([k, n]) => buckets[k as BucketKey].length >= (n ?? 0));
  });
  if (usable.length === 0) return null;
  const tpl = usable[0];

  // Build a map of bucket key → randomly chosen entry text.
  // If a template needs the same bucket twice, draw two different entries.
  const usedByBucket: Partial<Record<BucketKey, Set<string>>> = {};
  const e: Partial<Record<BucketKey, string>> = {};
  for (const need of tpl.needs) {
    const pool = buckets[need].filter((x) => !usedByBucket[need]?.has(x.id));
    const choice = pickRandom(pool);
    if (!choice) continue;
    e[need] = choice.text;
    (usedByBucket[need] ??= new Set()).add(choice.id);
  }
  return tpl.render(e);
}

// Generate up to N unique remixes.
export function remixIdeas(buckets: Buckets, n = 5): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (out.length < n && attempts < n * 6) {
    attempts++;
    const idea = remixIdea(buckets);
    if (!idea) break;
    if (seen.has(idea)) continue;
    seen.add(idea);
    out.push(idea);
  }
  return out;
}

// Pull a daily affirmation. Deterministic by date so the home screen feels stable.
export function affirmationOfTheDay(custom: string[], date = new Date()): string {
  const all = [...AFFIRMATION_SEEDS, ...custom];
  if (all.length === 0) return "Today, the next small step counts.";
  const dayIndex =
    date.getFullYear() * 1000 + date.getMonth() * 50 + date.getDate();
  return all[dayIndex % all.length];
}

// Affirmation derived from a single bucket entry — a "your own words back to you".
export function affirmationFromValue(value: string): string {
  return `I am someone who cares about ${value}. That's a feature, not a flaw.`;
}

// Generate reframes for a typed-in doubt. Pattern-matches; falls back to generic.
export function reframeDoubt(doubt: string): string[] {
  const d = doubt.trim();
  if (!d) return [];
  for (const r of REFRAME_TEMPLATES) {
    const m = d.match(r.match);
    if (m) {
      const captured = (m[2] ?? m[1] ?? "").trim();
      return r.reframes(captured);
    }
  }
  return REFRAME_FALLBACK;
}

// Find paths whose pullsFrom heavily overlaps with the buckets she's actually filled.
export function rankPaths<T extends { pullsFrom: BucketKey[]; featured?: boolean }>(
  paths: T[],
  buckets: Buckets
): { item: T; score: number; matchedBuckets: BucketKey[] }[] {
  return paths
    .map((p) => {
      const matched = p.pullsFrom.filter((k) => buckets[k].length > 0);
      const score = matched.length + (p.featured ? 0.5 : 0);
      return { item: p, score, matchedBuckets: matched };
    })
    .sort((a, b) => b.score - a.score);
}
