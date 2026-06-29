import { getAllItems } from "@/lib/inventory";
import { getVPCItems } from "@/lib/vpc-catalog";
import type { SetDoc } from "@/lib/sets";

/**
 * Build a barcode → thumbnail-url lookup across the full archive + VPC
 * catalog. Inventory photos win; VPC thumb/photo is the fallback.
 * Build this once per request and pass it to previewThumbs().
 */
export function buildThumbLookup(): Map<string, string> {
  const thumbByBarcode = new Map<string, string>();
  for (const it of getAllItems()) {
    const bc = it.id.replace(/^vpc-/, "");
    if (it.images[0]) thumbByBarcode.set(bc, it.images[0]);
  }
  for (const it of getVPCItems()) {
    if (thumbByBarcode.has(it.barcode)) continue;
    const t = it.thumb ?? it.photo;
    if (t) thumbByBarcode.set(it.barcode, t);
  }
  return thumbByBarcode;
}

/** Pull up to `n` distinct thumbnails for the items inside a set. */
export function previewThumbs(
  set: SetDoc,
  lookup: Map<string, string>,
  n = 3
): string[] {
  const out: string[] = [];
  for (const g of set.groups ?? []) {
    for (const it of g.items ?? []) {
      const t = lookup.get(it.barcode);
      if (t && !out.includes(t)) {
        out.push(t);
        if (out.length >= n) return out;
      }
    }
  }
  return out;
}
