#!/usr/bin/env node
/**
 * Apply a /curate Export Picks JSON to data/inventory.json.
 *
 * Usage:
 *   node scripts/apply-picks.mjs path/to/rentco-curate-1234567890.json
 *
 * The picks file is the JSON you download from the "Export picks" button
 * on /curate. Shape:
 *   {
 *     keep: ["barcode", ...],        // items to include
 *     star: ["barcode", ...],        // subset of keep, marked featured
 *     cut: ["barcode", ...],         // informational only
 *     renames: { "VPC sub" : "rent.co sub" },
 *     subcategoryVerdicts: { ... }   // informational
 *   }
 *
 * Reads data/vpc_catalog.csv, builds a rent.co InventoryItem for every
 * kept barcode, applies the rename map to category, writes
 * data/inventory.json. Items marked star get tags=["Featured", ...].
 *
 * High-rez photos in public/inventory/<barcode>.jpg are linked when
 * present; otherwise the thumb path is used as the image so the archive
 * page still has something. Run scripts/download-vpc-photos.mjs after
 * this to backfill any missing high-rez photos for the kept set.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CATALOG = path.join(ROOT, "data/vpc_catalog.csv");
const INVENTORY = path.join(ROOT, "data/inventory.json");
const PHOTO_DIR = path.join(ROOT, "public/inventory");
const THUMB_DIR = path.join(ROOT, "public/inventory/thumbs");

const picksPath = process.argv[2];
if (!picksPath) {
  console.error("Usage: node scripts/apply-picks.mjs <picks.json>");
  process.exit(1);
}
if (!existsSync(picksPath)) {
  console.error(`Picks file not found: ${picksPath}`);
  process.exit(1);
}

function parseCsv(t) {
  const rows = [];
  let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') { f += '"'; i++; } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\r") {}
    else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

function parsePriceWeek(raw) {
  if (!raw) return null;
  const m = raw.match(/\$?\s*([\d.]+)/);
  return m ? Math.round(parseFloat(m[1])) : null;
}

// Mirror of lib/categorize.ts rules — kept in sync manually because this
// runs in Node and that file is TS-only.
const CATEGORY_RULES = {
  "Practical Seating": ["folding chair", "stacking chair", "stacking stool", "crew chair", "folding stool", "bleacher"],
  "Practical Lighting": ["work light", "shop light", "floodlight", "flood light", "utility light", "trouble light", "stand light"],
  "Pipe & Drape": ["pipe and drape", "drape", "curtain", "room divider", "divider screen", "backdrop", "valance", "tapestry"],
  "Water Stations": ["water cooler", "water station", "drinking fountain", "water fountain", "water dispenser", "hydration"],
  "Cases & Carts": ["road case", "hand truck", "cart", "trolley", "dolly", "case", "crate", "trunk", "luggage", "suitcase", "briefcase"],
  Seating: ["armchair", "chair", "sofa", "couch", "bench", "stool", "settee", "loveseat", "ottoman", "recliner", "throne", "pew", "rocker", "banquette"],
  Tables: ["table", "desk", "console", "nightstand", "vanity", "sideboard", "credenza", "workbench"],
  Lighting: ["chandelier", "candelabra", "candlestick", "candle", "lamp", "sconce", "lantern", "pendant light", "light fixture"],
  Signage: ["signage", "sign", "poster", "marquee", "letterboard", "billboard", "plaque", "banner", "neon", "artwork", "painting", "framed", "frame", "picture", "wall decor", "mirror"],
  Hospitality: ["bar", "fridge", "refrigerator", "stove", "oven", "kitchen", "dishware", "glassware", "catering", "buffet", "dining", "cutlery", "barbecue", "grill", "keg", "platter", "teapot", "coffee maker"],
  Greenery: ["plant", "tree", "flower", "floral", "fern", "palm", "topiary", "foliage", "shrub", "ivy", "hedge", "greenery"],
  Staging: ["platform", "riser", "stage deck", "easel", "pedestal", "podium", "pillar", "column", "rostrum"],
  Logistics: ["pallet", "ladder", "wheelbarrow", "generator", "compressor", "forklift", "tool box", "toolbox", "tool chest", "garage", "engine", "scaffold"],
  Storage: ["shelving", "shelf", "bookcase", "bookshelf", "cabinet", "locker", "cupboard", "armoire", "wardrobe", "storage rack", "filing", "bin", "tote", "barrel", "container", "drawer"],
};

const TAG_HINTS = [
  "Vintage", "Antique", "Aged", "Distressed", "Rustic", "Decorative",
  "Ornate", "Industrial", "Modern", "Folding", "Rolling", "Painted",
  "Wood", "Metal", "Brass", "Leather", "Hospital", "Institutional",
  "Retail", "Office", "Hotel", "Airport", "Neon",
];

const SUBCAT_ROOT_MAP = {
  Lighting: "Lighting", Candles: "Lighting", Neon: "Lighting", Lamp: "Lighting", Chandelier: "Lighting",
  Chair: "Seating", Stool: "Seating", Sofa: "Seating", Bench: "Seating", Ottoman: "Seating",
  Table: "Tables", Desk: "Tables", Counter: "Tables", Sideboard: "Tables", Credenza: "Tables", Vanity: "Tables", "Buffet/Hutch": "Tables",
  Cabinet: "Storage", Shelf: "Storage", Rack: "Storage", Locker: "Storage", Wardrobe: "Storage", Dresser: "Storage", Bin: "Storage", Crate: "Storage", Box: "Storage", Trunk: "Storage", Basket: "Storage", Bucket: "Storage", Safe: "Storage",
  Case: "Cases & Carts", Cart: "Cases & Carts", Luggage: "Cases & Carts",
  Sign: "Signage", Mirror: "Signage", Art: "Signage", "Wall Dec": "Signage", Tapestry: "Signage", Photography: "Signage",
  Plinth: "Staging", Podium: "Staging", Stand: "Staging", Stanchion: "Staging", Column: "Staging",
  Bar: "Hospitality", Restaurant: "Hospitality", Drinkware: "Hospitality", Cookware: "Hospitality", Bowl: "Hospitality",
  Plant: "Greenery", Garden: "Greenery",
  Tool: "Logistics", Hardware: "Logistics", Ladder: "Logistics", Garage: "Logistics", Industrial: "Logistics",
};

function classifyCategory(vpcSub, name, description) {
  const root = (vpcSub || "").split(",")[0].trim();
  if (root && SUBCAT_ROOT_MAP[root]) return SUBCAT_ROOT_MAP[root];
  const hay = `${vpcSub} ${name} ${description}`.toLowerCase();
  let best = null, bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_RULES)) {
    let s = 0;
    for (const kw of keywords) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(hay)) s += kw.includes(" ") ? 3 : 2;
    }
    if (s > bestScore) { best = cat; bestScore = s; }
  }
  return bestScore >= 2 ? best : null;
}

function tagsFor(item) {
  const blob = `${item.name} ${item.description}`.toLowerCase();
  return TAG_HINTS.filter((t) => blob.includes(t.toLowerCase()));
}

function titleCase(s) {
  return s
    .toLowerCase()
    .replace(/\b(\w)/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, "and")
    .replace(/\bOf\b/g, "of")
    .replace(/\bWith\b/g, "with");
}

function buildTitle(item) {
  // VPC names are catalog-style: "Chair, Lounge" → "Lounge Chair".
  // Splits on commas, reverses, trims, recombines, then sentence-cases.
  const parts = item.name.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return titleCase(item.name);
  const head = parts[0];
  const rest = parts.slice(1).join(" ");
  return titleCase(`${rest} ${head}`);
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const picks = JSON.parse(readFileSync(picksPath, "utf8"));
const keepSet = new Set(picks.keep ?? []);
const starSet = new Set(picks.star ?? []);
const renames = picks.renames ?? {};

if (keepSet.size === 0) {
  console.error("Picks file has no keep barcodes — nothing to do.");
  process.exit(1);
}

console.log(`picks: keep ${keepSet.size} (${starSet.size} starred)`);

const csv = readFileSync(CATALOG, "utf8");
const rows = parseCsv(csv);
const header = rows[0];
const ix = {
  barcode: header.findIndex((h) => h.trim() === "barcode"),
  category: header.findIndex((h) => h.trim() === "category"),
  subcategory: header.findIndex((h) => h.trim() === "subcategory"),
  name: header.findIndex((h) => h.trim() === "name"),
  description: header.findIndex((h) => h.trim() === "description"),
  size: header.findIndex((h) => h.trim() === "size"),
  price: header.findIndex((h) => h.trim() === "price"),
};

const found = new Map();
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const bc = (r[ix.barcode] || "").trim();
  if (!keepSet.has(bc)) continue;
  found.set(bc, {
    barcode: bc,
    category: (r[ix.category] || "").trim(),
    subcategory: (r[ix.subcategory] || "").trim(),
    name: (r[ix.name] || "").trim(),
    description: (r[ix.description] || "").trim(),
    size: (r[ix.size] || "").trim(),
    price: (r[ix.price] || "").trim(),
  });
}

const missing = [...keepSet].filter((bc) => !found.has(bc));
if (missing.length) {
  console.warn(`!! ${missing.length} barcodes in picks not found in vpc_catalog.csv (first 5): ${missing.slice(0, 5).join(", ")}`);
}

const items = [];
for (const it of found.values()) {
  const rawCat = it.subcategory || it.category || "Misc";
  const category =
    renames[rawCat] ??
    classifyCategory(it.subcategory, it.name, it.description) ??
    rawCat;
  const tags = tagsFor(it);
  if (starSet.has(it.barcode) && !tags.includes("Featured")) {
    tags.unshift("Featured");
  }
  const title = buildTitle(it);
  const slug = `${slugify(title)}-${it.barcode}`;
  const photoFull = path.join(PHOTO_DIR, `${it.barcode}.jpg`);
  const photoThumb = path.join(THUMB_DIR, `${it.barcode}.jpg`);
  const images = existsSync(photoFull)
    ? [`/inventory/${it.barcode}.jpg`]
    : existsSync(photoThumb)
    ? [`/inventory/thumbs/${it.barcode}.jpg`]
    : [];

  items.push({
    id: `vpc-${it.barcode}`,
    title,
    slug,
    description: it.description || title,
    category,
    tags,
    era: "Contemporary",
    price_day: null,
    price_week: parsePriceWeek(it.price),
    replacement_value: null,
    dimensions: it.size || "",
    source_owner: "VPC",
    location: "VPC · Vancouver",
    condition: "Operator-confirmed on request",
    availability_note: "Availability is not guaranteed live; confirmed manually on request.",
    images,
  });
}

items.sort((a, b) => a.title.localeCompare(b.title));

writeFileSync(INVENTORY, JSON.stringify(items, null, 2) + "\n");

// Summary
const withHighRez = items.filter((i) => i.images[0]?.startsWith("/inventory/") && !i.images[0]?.includes("/thumbs/")).length;
const withThumbOnly = items.filter((i) => i.images[0]?.includes("/thumbs/")).length;
const noImage = items.filter((i) => i.images.length === 0).length;
const cats = new Map();
for (const i of items) cats.set(i.category, (cats.get(i.category) ?? 0) + 1);

console.log(`wrote ${items.length} items to data/inventory.json`);
console.log(`  high-rez photo: ${withHighRez}  ·  thumb only: ${withThumbOnly}  ·  no image: ${noImage}`);
console.log(`  categories (${cats.size}):`);
for (const [c, n] of [...cats.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${String(n).padStart(4)}  ${c}`);
}
if (withThumbOnly > 0) {
  console.log(`\nBackfill high-rez photos for the ${withThumbOnly} thumb-only items:`);
  console.log(`  node scripts/download-vpc-photos.mjs`);
}
console.log(`\nCommit + push:`);
console.log(`  git add data/inventory.json && git commit -m 'Apply picks: ${items.length} items'`);
