import type { Metadata } from "next";
import { getVPCItems } from "@/lib/vpc-catalog";
import { PreviewBrowser } from "./PreviewBrowser";

export const metadata: Metadata = {
  title: "Preview picks",
  robots: { index: false, follow: false },
};

export default function CuratePreviewPage() {
  // Send a slim item shape to keep payload reasonable.
  const items = getVPCItems().map((it) => ({
    barcode: it.barcode,
    name: it.name,
    subcategory: it.subcategory,
    description: it.description,
    size: it.size,
    priceWeek: it.priceWeek,
    thumb: it.thumb,
    photo: it.photo,
  }));
  return (
    <div className="curate">
      <PreviewBrowser items={items} />
    </div>
  );
}
