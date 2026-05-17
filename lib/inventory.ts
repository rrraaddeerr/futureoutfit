import inventoryData from "@/data/inventory.json";
import type { InventoryItem } from "./types";

const inventory = inventoryData as unknown as InventoryItem[];

export function getAllItems(): InventoryItem[] {
  return inventory;
}

export function getItemBySlug(slug: string): InventoryItem | undefined {
  return inventory.find((item) => item.slug === slug);
}

export function getItemsByIds(ids: string[]): InventoryItem[] {
  const byId = new Map(inventory.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((i): i is InventoryItem => Boolean(i));
}

export function getFeaturedItems(limit = 6): InventoryItem[] {
  return inventory.filter((item) => item.featured).slice(0, limit);
}

/**
 * Related items: hand-picked ids first, then filled out by category and tag
 * overlap so every item page has a useful "related" rail.
 */
export function getRelatedItems(item: InventoryItem, limit = 4): InventoryItem[] {
  const picked = item.related_items
    ? getItemsByIds(item.related_items).filter((i) => i.id !== item.id)
    : [];
  if (picked.length >= limit) return picked.slice(0, limit);

  const scored = inventory
    .filter((i) => i.id !== item.id && !picked.some((p) => p.id === i.id))
    .map((i) => {
      let score = i.category === item.category ? 3 : 0;
      score += i.tags.filter((t) => item.tags.includes(t)).length;
      if (i.era === item.era) score += 1;
      return { item: i, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return [...picked, ...scored.map((s) => s.item)].slice(0, limit);
}

/** Distinct facet values present in the inventory — drives the archive filters. */
export function getFacets() {
  const categories = new Set<string>();
  const tags = new Set<string>();
  for (const item of inventory) {
    categories.add(item.category);
    item.tags.forEach((t) => tags.add(t));
  }
  return {
    categories: [...categories].sort(),
    tags: [...tags].sort(),
  };
}

/** CAD price formatting. null prices read as an inquiry. */
export function formatPrice(value: number | null): string {
  if (value == null) return "On inquiry";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact price teaser for archive cards — prefers the day rate, else weekly. */
export function priceTeaser(item: InventoryItem): string {
  if (item.price_day != null) return `From ${formatPrice(item.price_day)} / day`;
  if (item.price_week != null) return `From ${formatPrice(item.price_week)} / week`;
  return "Pricing on inquiry";
}
