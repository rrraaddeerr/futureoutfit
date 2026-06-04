import type { Metadata } from "next";
import { getVPCItems, getSubcategoryStats } from "@/lib/vpc-catalog";
import { CurateBrowser } from "./CurateBrowser";

export const metadata: Metadata = {
  title: "Curate",
  robots: { index: false, follow: false },
};

export default function CuratePage() {
  const items = getVPCItems();
  const subs = getSubcategoryStats();
  return (
    <div className="curate">
      <CurateBrowser items={items} subcategories={subs} />
    </div>
  );
}
