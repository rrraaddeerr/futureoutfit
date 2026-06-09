import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSet, setsConfigured } from "@/lib/sets";
import { getAllItems } from "@/lib/inventory";
import { getVPCItems } from "@/lib/vpc-catalog";
import { SetEditor } from "./SetEditor";

export const metadata: Metadata = {
  title: "Edit set",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!setsConfigured()) {
    return (
      <div className="ops">
        <div className="wrap">
          <h1 style={{ marginTop: 24 }}>Sets not configured</h1>
        </div>
      </div>
    );
  }
  const data = await getSet(id);
  if (!data) notFound();

  // Build a slim catalog of pickable items for the editor: prefer items
  // already in /archive (high-rez), fall back to thumbnails-only from the
  // VPC catalog so you can drop in anything regardless of curation status.
  const archive = getAllItems().map((i) => ({
    barcode: i.id.replace(/^vpc-/, ""),
    title: i.title,
    subcategory: i.category,
    priceWeek: i.price_week,
    thumb: i.images[0] ?? null,
  }));
  const vpc = getVPCItems().map((i) => ({
    barcode: i.barcode,
    title: i.name,
    subcategory: i.subcategory,
    priceWeek: i.priceWeek,
    thumb: i.thumb ?? i.photo ?? null,
  }));
  // De-duplicate by barcode — archive entries win
  const seen = new Set<string>();
  const merged = [...archive, ...vpc].filter((i) => {
    if (seen.has(i.barcode)) return false;
    seen.add(i.barcode);
    return true;
  });

  return (
    <SetEditor
      initialSet={data.set}
      initialResponses={data.responses}
      catalog={merged}
    />
  );
}
