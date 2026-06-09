import { NextResponse } from "next/server";
import { putSet, deleteSet, getSet, setsConfigured } from "@/lib/sets";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!setsConfigured()) {
    return NextResponse.json({ ok: false, error: "Sets not configured" }, { status: 500 });
  }
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const set = body as Parameters<typeof putSet>[0];
  if (set.id !== id) {
    return NextResponse.json({ ok: false, error: "ID mismatch" }, { status: 400 });
  }
  try {
    const stored = await putSet(set);
    return NextResponse.json({ ok: true, set: stored });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!setsConfigured()) {
    return NextResponse.json({ ok: false, error: "Sets not configured" }, { status: 500 });
  }
  const { id } = await context.params;
  try {
    await deleteSet(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!setsConfigured()) {
    return NextResponse.json({ ok: false, error: "Sets not configured" }, { status: 500 });
  }
  const { id } = await context.params;
  try {
    const data = await getSet(id);
    if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
