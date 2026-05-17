#!/usr/bin/env node
/**
 * rent.co — VPC catalog importer
 *
 * Transforms VPC's master catalog export (data/vpc_catalog.csv) into a
 * curated data/inventory.json for the rent.co archive.
 *
 *   node scripts/import-vpc.mjs [--count 600] [--in data/vpc_catalog.csv]
 *
 * VPC ships its own prop-house taxonomy (18 categories, 951 subcategories).
 * rent.co keeps its OWN category model, so every VPC row is classified into
 * one of the 14 rent.co practical categories by keyword. Rows that don't read
 * as one of those categories are left out — the archive stays on-brand.
 *
 * Per row it also: builds a readable title from the ALL-CAPS description,
 * derives condition and cultural/descriptive tags, and parses the weekly price.
 * The final set is curated across categories (sqrt-weighted, variety-first).
 */

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const argVal = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : def;
};
const TARGET = Number(argVal("--count", "600"));
const INPUT = argVal("--in", "data/vpc_catalog.csv");
const OUTPUT = "data/inventory.json";

// ---- rent.co taxonomy ------------------------------------------------------

const RENTCO_CATEGORIES = [
  "Seating", "Tables", "Lighting", "Practical Lighting", "Practical Seating",
  "Cases & Carts", "Pipe & Drape", "Water Stations", "Signage", "Hospitality",
  "Greenery", "Staging", "Logistics", "Storage",
];

// Keyword rules. Multi-word phrases score higher and are checked first.
const CATEGORY_RULES = {
  "Practical Seating": ["folding chair", "stacking chair", "stacking stool", "crew chair", "folding stool", "bleacher"],
  "Practical Lighting": ["work light", "shop light", "floodlight", "flood light", "utility light", "trouble light", "stand light"],
  "Pipe & Drape": ["pipe and drape", "drape", "curtain", "room divider", "divider screen", "backdrop", "valance", "tapestry"],
  "Water Stations": ["water cooler", "water station", "drinking fountain", "water fountain", "water dispenser", "hydration"],
  "Cases & Carts": ["road case", "hand truck", "cart", "trolley", "dolly", "case", "crate", "trunk", "luggage", "suitcase", "briefcase"],
  "Seating": ["armchair", "chair", "sofa", "couch", "bench", "stool", "settee", "loveseat", "ottoman", "recliner", "throne", "pew", "rocker", "banquette"],
  "Tables": ["table", "desk", "console", "nightstand", "vanity", "sideboard", "credenza", "workbench"],
  "Lighting": ["chandelier", "candelabra", "candlestick", "candle", "lamp", "sconce", "lantern", "pendant light", "light fixture"],
  "Signage": ["signage", "sign", "poster", "marquee", "letterboard", "billboard", "plaque", "banner", "neon", "artwork", "painting", "framed", "frame", "picture", "wall decor", "mirror"],
  "Hospitality": ["bar", "fridge", "refrigerator", "stove", "oven", "kitchen", "dishware", "glassware", "catering", "buffet", "dining", "cutlery", "barbecue", "grill", "keg", "platter", "teapot", "coffee maker"],
  "Greenery": ["plant", "tree", "flower", "floral", "fern", "palm", "topiary", "foliage", "shrub", "ivy", "hedge", "greenery"],
  "Staging": ["platform", "riser", "stage deck", "easel", "pedestal", "podium", "pillar", "column", "rostrum"],
  "Logistics": ["pallet", "ladder", "wheelbarrow", "generator", "compressor", "forklift", "tool box", "toolbox", "tool chest", "garage", "engine", "scaffold"],
  "Storage": ["shelving", "shelf", "bookcase", "bookshelf", "cabinet", "locker", "cupboard", "armoire", "wardrobe", "storage rack", "filing", "bin", "tote", "barrel", "container", "drawer"],
};

// A weak hint from VPC's own category — only nudges, never overrides keywords.
const VPC_PRIOR = {
  "Seating": "Seating",
  "Furniture": "Tables",
  "Lighting & Candles": "Lighting",
  "Art, Signage & Wall Decor": "Signage",
  "Luggage, Trunks & Bags": "Cases & Carts",
  "Containers": "Storage",
  "Garage & Tools": "Logistics",
  "Textiles": "Pipe & Drape",
};

// Cultural / vibe tags — rent.co's search vocabulary.
const CULTURAL_RULES = {
  Airport: ["airport", "airline", "terminal", "aviation"],
  Hotel: ["hotel", "motel", "lobby", "concierge"],
  Office: ["office", "cubicle", "boardroom", "filing", "corporate"],
  Institutional: ["institutional", "school", "hospital", "government", "courtroom", "library", "classroom"],
  Retail: ["retail", "store", "shop display", "display", "boutique"],
  Nightlife: ["nightclub", "cocktail", "lounge", "saloon", "tavern"],
  "Server Room": ["server", "computer", "data center", "mainframe"],
  Neon: ["neon"],
  Backstage: ["backstage", "dressing room"],
  Festival: ["festival", "fairground", "carnival"],
  Touring: ["road case", "touring", "flight case"],
};

// ---- helpers ---------------------------------------------------------------

const SMALL = new Set([
  "a", "an", "and", "the", "of", "or", "on", "in", "with", "to", "for",
  "at", "by", "from", "&",
]);
const NOISE_LEAD = new Set(["clearable", "public domain"]);
// VPC subcategories that lead with a domain/room word rather than the object.
const DOMAIN_SUBCATS = new Set([
  "Music", "Garage", "Plumbing", "Electrical", "Building", "Hardware",
  "Art Supplies", "Science", "Sports", "Decorative", "Medical", "Bathroom",
  "Nautical", "Commercial", "Office", "Kitchen", "Industrial",
]);
const DESCRIPTIVE_TAGS = [
  "Vintage", "Antique", "Aged", "Distressed", "Rustic", "Decorative",
  "Ornate", "Industrial", "Modern", "Folding", "Rolling", "Painted",
  "Wood", "Metal", "Brass", "Leather",
];

function parseCSV(t) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") { /* skip */ }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

function titleCase(s) {
  const lifted = s.toLowerCase().replace(/\b[a-z][a-z']*\b/g, (w) => w[0].toUpperCase() + w.slice(1));
  return lifted.replace(/\b[A-Z][a-z']*\b/g, (w, off) =>
    off > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w
  );
}

function expand(s) {
  return s
    .replace(/\bw\/o\b/gi, "without")
    .replace(/\bw\//gi, "with ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitNote(desc) {
  const m = desc.match(/\s[-*]\s+\*?/);
  if (m && m.index > 18) {
    return [desc.slice(0, m.index).trim(), desc.slice(m.index).replace(/^[\s\-*]+/, "").trim()];
  }
  return [desc.trim(), ""];
}

function buildTitle(subcategory, description) {
  const [body] = splitNote(description);
  let parts = body.split(",").map((p) => p.trim()).filter(Boolean);
  while (parts.length > 1 && NOISE_LEAD.has(parts[0].toLowerCase())) parts.shift();

  let title = "";
  for (const p of parts) {
    const next = title ? `${title}, ${p}` : p;
    if (title && next.length > 44) break;
    title = next;
  }
  title = titleCase(expand(title)) || titleCase(expand(subcategory));

  // Lead the title with the object type drawn from the subcategory. VPC
  // subcategories are "Object, Variant" (Bench, Misc) but sometimes
  // "Domain, Object" (Music, Case) — so skip domain words and use the object.
  const segs = subcategory.split(",").map((s) => titleCase(expand(s)).trim()).filter(Boolean);
  let type = segs[0] || "";
  if (DOMAIN_SUBCATS.has(type) && segs[1] && segs[1].toLowerCase() !== "misc") {
    type = segs[1];
  }
  type = type.replace(/\bmisc\b/i, "").trim();
  const firstTypeWord = type.toLowerCase().split(/\s+/)[0] || "";
  const haveType = firstTypeWord.length > 2 && title.toLowerCase().includes(firstTypeWord);
  if (!haveType && type) {
    title = `${type} — ${title}`;
  }
  return title.slice(0, 60).replace(/[\s,—-]+$/, "");
}

function cleanDescription(description) {
  const [body, note] = splitNote(description);
  let text = titleCase(expand(body));
  if (text && !/[.!?]$/.test(text)) text += ".";
  return { text, note: note ? titleCase(expand(note)) : "" };
}

function cleanSize(size) {
  const s = expand(size);
  if (!s) return "Confirmed on request";
  const parts = [];
  for (const [label, key] of [["Height", "H"], ["Width", "W"], ["Depth", "D"]]) {
    const m = s.match(new RegExp(`${label}\\s*([\\d.]+)`, "i"));
    if (m) parts.push(`${m[1]}" ${key}`);
  }
  return parts.length ? parts.join("  ·  ") : s;
}

function parsePrice(price) {
  const n = Number(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function deriveCondition(desc) {
  const d = desc.toUpperCase();
  if (/\bBRAND NEW\b/.test(d)) return "New";
  if (/ANTIQUE|VINTAGE/.test(d)) return "Vintage — period piece";
  if (/RUSTY|DISTRESSED|UNEARTHED|DIRTY|WEATHERED/.test(d)) return "Distressed — character piece";
  if (/AGED|\bUSED\b|WORN/.test(d)) return "Aged — honest wear";
  return "Good — rental stock";
}

/** Score the row against every rent.co category; return the best fit or null. */
function classify(haystack, vpcCategory) {
  const scores = {};
  for (const [cat, keywords] of Object.entries(CATEGORY_RULES)) {
    let score = 0;
    for (const kw of keywords) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(haystack)) score += kw.includes(" ") ? 3 : 2;
    }
    if (score) scores[cat] = score;
  }
  const prior = VPC_PRIOR[vpcCategory];
  if (prior) scores[prior] = (scores[prior] || 0) + 1;

  let best = null, bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) { best = cat; bestScore = score; }
  }
  return bestScore >= 2 ? best : null;
}

/**
 * Tags are a deliberately bounded vocabulary — cultural/vibe tags first, then
 * descriptive material/condition tags. Free-form subcategory words are kept
 * out so the archive's tag filter stays a usable set, not a 200-chip wall.
 */
function deriveTags(haystack) {
  const tags = new Set();
  for (const [tag, keywords] of Object.entries(CULTURAL_RULES)) {
    if (keywords.some((kw) => new RegExp(`\\b${kw}\\b`, "i").test(haystack))) tags.add(tag);
  }
  for (const tag of DESCRIPTIVE_TAGS) {
    if (tags.size >= 6) break;
    if (new RegExp(`\\b${tag}\\b`, "i").test(haystack)) tags.add(tag);
  }
  return [...tags].slice(0, 6);
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---- load & classify -------------------------------------------------------

const rows = parseCSV(readFileSync(INPUT, "utf8"));
const header = rows[0];
const records = rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));

const classified = [];
for (const r of records) {
  const price = parsePrice(r.price);
  if (!price || !r.name || !r.category) continue;
  if (/thrilled to announce|acquisition of the/i.test(r.description)) continue;

  const haystack = `${r.subcategory} ${r.name} ${r.description}`.toLowerCase();
  // Classify on the subcategory only — VPC's subcategory is a clean object-type
  // label, while descriptions add noise ("in case of fire", "lantern clock").
  const category = classify(r.subcategory.toLowerCase(), r.category);
  if (!category) continue;
  classified.push({ ...r, _category: category, _price: price, _haystack: haystack });
}

// ---- curate across rent.co categories --------------------------------------

const byCategory = {};
for (const r of classified) (byCategory[r._category] ??= []).push(r);

const present = Object.keys(byCategory);
const weight = (n) => Math.sqrt(n);
const totalWeight = present.reduce((s, c) => s + weight(byCategory[c].length), 0);

const curated = [];
for (const cat of present) {
  const pool = byCategory[cat];
  const target = Math.min(
    pool.length,
    Math.max(8, Math.round((TARGET * weight(pool.length)) / totalWeight))
  );

  const bySub = {};
  const seenDesc = new Set();
  for (const r of pool) {
    const key = r.description.trim().toLowerCase();
    if (seenDesc.has(key)) continue;
    seenDesc.add(key);
    (bySub[r.subcategory] ??= []).push(r);
  }
  for (const list of Object.values(bySub)) {
    list.sort((a, b) => (b.size.trim() ? 1 : 0) - (a.size.trim() ? 1 : 0));
  }

  const subLists = Object.values(bySub);
  const picked = [];
  let round = 0;
  while (picked.length < target && subLists.some((l) => l[round])) {
    for (const list of subLists) {
      if (picked.length >= target) break;
      if (list[round]) picked.push(list[round]);
    }
    round++;
  }
  curated.push(...picked);
}

// ---- transform -------------------------------------------------------------

const FEATURE_CATEGORIES = new Set([
  "Seating", "Lighting", "Signage", "Cases & Carts", "Hospitality", "Staging",
]);
const featured = new Set();
const slugs = new Set();

const items = curated.map((r) => {
  const { text, note } = cleanDescription(r.description);
  const title = buildTitle(r.subcategory, r.description);
  let slug = `${slugify(title)}-${r.barcode}`;
  while (slugs.has(slug)) slug += "-x";
  slugs.add(slug);

  const item = {
    id: `vpc-${r.barcode}`,
    title,
    slug,
    description: text,
    category: r._category,
    tags: deriveTags(r._haystack),
    era: "Contemporary",
    price_day: null,
    price_week: r._price,
    replacement_value: null,
    dimensions: cleanSize(r.size),
    source_owner: "VPC",
    location: "VPC · Vancouver",
    condition: deriveCondition(r.description),
    availability_note: note
      ? `${note}. Availability confirmed manually on request.`
      : "Availability is not guaranteed live; confirmed manually on request.",
    images: [],
  };
  if (FEATURE_CATEGORIES.has(r._category) && !featured.has(r._category)) {
    item.featured = true;
    featured.add(r._category);
  }
  return item;
});

// Interleave categories so the default archive view shows a varied mix
// rather than long runs of one category (and one placeholder glyph).
const buckets = {};
for (const it of items) (buckets[it.category] ??= []).push(it);
for (const list of Object.values(buckets)) list.sort((a, b) => a.title.localeCompare(b.title));
const order = Object.keys(buckets).sort();
const ordered = [];
for (let round = 0; ordered.length < items.length; round++) {
  for (const cat of order) if (buckets[cat][round]) ordered.push(buckets[cat][round]);
}
writeFileSync(OUTPUT, JSON.stringify(ordered, null, 2) + "\n", "utf8");

console.log("VPC catalog import");
console.log(`  source         ${INPUT}`);
console.log(`  classified     ${classified.length} of ${records.length} rows fit a rent.co category`);
console.log(`  curated        ${items.length} items`);
console.log("  by category:");
const finalCounts = {};
for (const it of items) finalCounts[it.category] = (finalCounts[it.category] || 0) + 1;
for (const c of RENTCO_CATEGORIES) {
  if (finalCounts[c]) console.log(`    ${String(finalCounts[c]).padStart(4)}  ${c}`);
}
console.log(`  written        ${OUTPUT}`);
