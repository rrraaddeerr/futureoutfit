import type { Metadata } from "next";
import { getVPCItems } from "@/lib/vpc-catalog";
import { SortBrowser } from "./SortBrowser";

export const metadata: Metadata = {
  title: "Sort subcategories",
  robots: { index: false, follow: false },
};

export default function CurateSortPage() {
  const items = getVPCItems();
  // Group barcodes + sample thumbs per subcategory so the client receives a
  // compact payload instead of all 7,207 items.
  const map = new Map<
    string,
    {
      subcategory: string;
      count: number;
      withPhoto: number;
      thumbs: string[];
      samples: string[];
      priceWeek: number | null;
    }
  >();

  for (const it of items) {
    const key = it.subcategory || "(uncategorized)";
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        subcategory: key,
        count: 0,
        withPhoto: 0,
        thumbs: [],
        samples: [],
        priceWeek: it.priceWeek,
      };
      map.set(key, bucket);
    }
    bucket.count++;
    if (it.thumb) {
      bucket.withPhoto++;
      if (bucket.thumbs.length < 4) bucket.thumbs.push(it.thumb);
    }
    if (it.name && bucket.samples.length < 3 && !bucket.samples.includes(it.name)) {
      bucket.samples.push(it.name);
    }
  }

  const subcategories = [...map.values()].sort((a, b) =>
    a.subcategory.localeCompare(b.subcategory)
  );

  return (
    <div className="curate">
      <SortBrowser subcategories={subcategories} />
    </div>
  );
}
