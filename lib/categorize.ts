/**
 * Shared categorization for VPC items → rent.co categories.
 * Used by:
 *   - app/curate/* to show the predicted rent.co category per VPC item
 *   - scripts/apply-picks.mjs to build inventory.json from picks
 *   - scripts/import-vpc.mjs (legacy 590-item curation)
 */

const CATEGORY_RULES: Record<string, string[]> = {
  "Practical Seating": [
    "folding chair",
    "stacking chair",
    "stacking stool",
    "crew chair",
    "folding stool",
    "bleacher",
  ],
  "Practical Lighting": [
    "work light",
    "shop light",
    "floodlight",
    "flood light",
    "utility light",
    "trouble light",
    "stand light",
  ],
  "Pipe & Drape": [
    "pipe and drape",
    "drape",
    "curtain",
    "room divider",
    "divider screen",
    "backdrop",
    "valance",
    "tapestry",
  ],
  "Water Stations": [
    "water cooler",
    "water station",
    "drinking fountain",
    "water fountain",
    "water dispenser",
    "hydration",
  ],
  "Cases & Carts": [
    "road case",
    "hand truck",
    "cart",
    "trolley",
    "dolly",
    "case",
    "crate",
    "trunk",
    "luggage",
    "suitcase",
    "briefcase",
  ],
  Seating: [
    "armchair",
    "chair",
    "sofa",
    "couch",
    "bench",
    "stool",
    "settee",
    "loveseat",
    "ottoman",
    "recliner",
    "throne",
    "pew",
    "rocker",
    "banquette",
  ],
  Tables: [
    "table",
    "desk",
    "console",
    "nightstand",
    "vanity",
    "sideboard",
    "credenza",
    "workbench",
  ],
  Lighting: [
    "chandelier",
    "candelabra",
    "candlestick",
    "candle",
    "lamp",
    "sconce",
    "lantern",
    "pendant light",
    "light fixture",
  ],
  Signage: [
    "signage",
    "sign",
    "poster",
    "marquee",
    "letterboard",
    "billboard",
    "plaque",
    "banner",
    "neon",
    "artwork",
    "painting",
    "framed",
    "frame",
    "picture",
    "wall decor",
    "mirror",
  ],
  Hospitality: [
    "bar",
    "fridge",
    "refrigerator",
    "stove",
    "oven",
    "kitchen",
    "dishware",
    "glassware",
    "catering",
    "buffet",
    "dining",
    "cutlery",
    "barbecue",
    "grill",
    "keg",
    "platter",
    "teapot",
    "coffee maker",
  ],
  Greenery: [
    "plant",
    "tree",
    "flower",
    "floral",
    "fern",
    "palm",
    "topiary",
    "foliage",
    "shrub",
    "ivy",
    "hedge",
    "greenery",
  ],
  Staging: ["platform", "riser", "stage deck", "easel", "pedestal", "podium", "pillar", "column", "rostrum"],
  Logistics: [
    "pallet",
    "ladder",
    "wheelbarrow",
    "generator",
    "compressor",
    "forklift",
    "tool box",
    "toolbox",
    "tool chest",
    "garage",
    "engine",
    "scaffold",
  ],
  Storage: [
    "shelving",
    "shelf",
    "bookcase",
    "bookshelf",
    "cabinet",
    "locker",
    "cupboard",
    "armoire",
    "wardrobe",
    "storage rack",
    "filing",
    "bin",
    "tote",
    "barrel",
    "container",
    "drawer",
  ],
};

const CULTURAL_RULES: Record<string, string[]> = {
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

const DESCRIPTIVE_TAGS = [
  "Vintage",
  "Antique",
  "Aged",
  "Distressed",
  "Rustic",
  "Decorative",
  "Ornate",
  "Industrial",
  "Modern",
  "Folding",
  "Rolling",
  "Painted",
  "Wood",
  "Metal",
  "Brass",
  "Leather",
];

function score(haystack: string, rules: Record<string, string[]>): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const [cat, keywords] of Object.entries(rules)) {
    let s = 0;
    for (const kw of keywords) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(haystack)) s += kw.includes(" ") ? 3 : 2;
    }
    if (s) scores[cat] = s;
  }
  return scores;
}

/**
 * Best rent.co category for a VPC item. `vpcSubcategory` is the catalog-style
 * "Chair, Lounge" string; `name`/`description` are the VPC text fields. Returns
 * null if nothing scores — caller can fall back to "Misc" or the raw VPC value.
 */
export function classifyCategory(
  vpcSubcategory: string,
  name: string,
  description: string
): string | null {
  const haystack = `${vpcSubcategory} ${name} ${description}`.toLowerCase();
  const scores = score(haystack, CATEGORY_RULES);
  let best: string | null = null;
  let bestScore = 0;
  for (const [cat, s] of Object.entries(scores)) {
    if (s > bestScore) {
      best = cat;
      bestScore = s;
    }
  }
  return bestScore >= 2 ? best : null;
}

/**
 * Cultural / vibe tags inferred from VPC fields — Airport, Hotel, Neon, etc.
 */
export function culturalTags(
  vpcSubcategory: string,
  name: string,
  description: string
): string[] {
  const haystack = `${vpcSubcategory} ${name} ${description}`.toLowerCase();
  const scores = score(haystack, CULTURAL_RULES);
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

/**
 * Descriptive material/condition tags — Vintage, Brass, Folding, etc.
 */
export function descriptiveTags(name: string, description: string): string[] {
  const blob = `${name} ${description}`.toLowerCase();
  return DESCRIPTIVE_TAGS.filter((t) => blob.includes(t.toLowerCase()));
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_RULES);
