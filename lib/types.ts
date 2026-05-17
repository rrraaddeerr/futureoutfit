export type SourceOwner =
  | "RaderENT"
  | "VPC"
  | "VPE"
  | "partner_vendor"
  | "sourced_to_order";

export interface InventoryItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  era: string;
  /** Day rate in CAD. null = priced on inquiry / flexible deal. */
  price_day: number | null;
  /** Week rate in CAD. null = priced on inquiry. */
  price_week: number | null;
  /** Replacement value in CAD — used for the rental agreement, not a sale price. */
  replacement_value: number | null;
  dimensions: string;
  source_owner: SourceOwner;
  location: string;
  condition: string;
  availability_note: string;
  /** Image paths under /public. Empty = render the archive placeholder. */
  images: string[];
  /** Optional hand-picked related item ids. Falls back to tag/category overlap. */
  related_items?: string[];
  /** Surface on the home page. */
  featured?: boolean;
}

export type InquiryKind = "rental" | "consult" | "sourcing";

export interface InquiryPayload {
  kind: InquiryKind;
  fields: Record<string, string>;
  selected_items?: { id: string; title: string }[];
  attachments?: { name: string; size: number }[];
  submitted_at: string;
}
