import { NextResponse } from "next/server";
import { getSet, putSet, newSetId, newSlug, setsConfigured } from "@/lib/sets";

export async function POST(request: Request) {
  if (!setsConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Sets not configured" },
      { status: 500 }
    );
  }
  let body: { from?: string } = {};
  try {
    body = await request.json();
  } catch {}
  const from = body.from;
  if (!from) {
    return NextResponse.json(
      { ok: false, error: "Missing 'from' id" },
      { status: 400 }
    );
  }
  try {
    const data = await getSet(from);
    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Source set not found" },
        { status: 404 }
      );
    }
    const id = newSetId();
    const slug = newSlug();
    const now = new Date().toISOString();
    const copy = {
      ...data.set,
      id,
      slug,
      name: `${data.set.name} (copy)`,
      unpublished: true,
      locked: false,
      created_at: now,
      updated_at: now,
    };
    await putSet(copy);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
