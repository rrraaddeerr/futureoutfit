import { NextResponse } from "next/server";
import { newSetId, newSlug, putSet, setsConfigured } from "@/lib/sets";
import { getAllItems } from "@/lib/inventory";

/**
 * Generates a fully-loaded sample set so the operator can demo the flow
 * without manually building one. Pulls real archive items grouped by
 * rent.co category and lands them in a Lounge-style proposal.
 */
export async function POST() {
  if (!setsConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Sets not configured" },
      { status: 500 }
    );
  }

  const inventory = getAllItems();
  // Group by rent.co category, pick a few visual items per relevant category
  const byCategory = new Map<string, typeof inventory>();
  for (const it of inventory) {
    const arr = byCategory.get(it.category) ?? [];
    arr.push(it);
    byCategory.set(it.category, arr);
  }
  function pick(cat: string, n: number) {
    const arr = (byCategory.get(cat) ?? []).filter((i) => i.images.length > 0);
    return arr.slice(0, n);
  }

  const seatingItems = [
    ...pick("Seating", 3),
    ...pick("Practical Seating", 2),
  ].slice(0, 4);
  const tableItems = pick("Tables", 3);
  const lightingItems = pick("Lighting", 3);
  const decorItems = [...pick("Signage", 2), ...pick("Greenery", 1)].slice(0, 3);

  const now = new Date().toISOString();
  const id = newSetId();
  const slug = newSlug();

  await putSet({
    id,
    slug,
    name: "Sample proposal — Lounge build",
    client: "Sample director",
    intro:
      "This is a demo set generated from the rent.co archive — feel free to vote on items to see how the flow works. Real proposals get a real intro here.",
    groups: [
      {
        id: "g_seating_" + Math.random().toString(36).slice(2, 8),
        label: "Lounge seating",
        pick: "one",
        note: "Pick one direction for the centerpiece. I'll style around it.",
        items: seatingItems.map((it, i) => ({
          barcode: it.id.replace(/^vpc-/, ""),
          operatorPick: i === 0,
          note: i === 0 ? "My pick — best patina for the room." : undefined,
        })),
      },
      {
        id: "g_tables_" + Math.random().toString(36).slice(2, 8),
        label: "Side tables",
        pick: "any",
        note: "Mix and match — happy to pull 2-3 of any.",
        items: tableItems.map((it) => ({ barcode: it.id.replace(/^vpc-/, "") })),
      },
      {
        id: "g_lighting_" + Math.random().toString(36).slice(2, 8),
        label: "Lighting",
        pick: "one",
        note: "Direction-setter. Brass reads warmer, industrial reads sharper.",
        items: lightingItems.map((it, i) => ({
          barcode: it.id.replace(/^vpc-/, ""),
          operatorPick: i === 0,
        })),
      },
      {
        id: "g_decor_" + Math.random().toString(36).slice(2, 8),
        label: "Dressing",
        pick: "any",
        items: decorItems.map((it) => ({ barcode: it.id.replace(/^vpc-/, "") })),
      },
    ],
    unpublished: false,
    locked: false,
    created_at: now,
    updated_at: now,
  });

  return NextResponse.json({ ok: true, id, slug });
}
