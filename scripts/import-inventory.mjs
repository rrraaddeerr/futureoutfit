#!/usr/bin/env node
/**
 * rent.co — inventory importer
 *
 * Converts a CSV or JSON export (e.g. a VPC inventory dump, a scraper's
 * output, or a hand-built spreadsheet) into data/inventory.json in the shape
 * the site expects.
 *
 *   node scripts/import-inventory.mjs <file.csv|file.json> [options]
 *
 * Options:
 *   --merge            Append to the existing inventory instead of replacing
 *                      it (skips rows whose slug already exists).
 *   --source <owner>   Default source/owner for rows that don't specify one.
 *                      One of: RaderENT VPC VPE partner_vendor sourced_to_order
 *   --dry-run          Parse and report, but don't write the file.
 *   --template         Write data/inventory-template.csv and exit.
 *
 * Column names are matched leniently (case / spacing / punctuation are
 * ignored), so "Day Rate", "day_rate" and "priceday" all map to price_day.
 * Multi-value fields (tags, images) may be separated by ; | or ,.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INVENTORY = path.join(ROOT, "data", "inventory.json");
const TEMPLATE = path.join(ROOT, "data", "inventory-template.csv");

const SOURCE_OWNERS = ["RaderENT", "VPC", "VPE", "partner_vendor", "sourced_to_order"];
const ERAS = ["1970s", "1980s", "1990s", "2000s", "2010s", "Contemporary"];

// Canonical field -> accepted aliases (normalised: lowercase, alphanumeric only).
const ALIASES = {
  id: ["id", "sku", "code", "itemid", "itemcode"],
  title: ["title", "name", "item", "itemname", "product", "productname"],
  slug: ["slug", "handle", "urlslug"],
  description: ["description", "desc", "details", "summary", "blurb"],
  category: ["category", "cat", "type", "department"],
  tags: ["tags", "tag", "vibe", "vibes", "keywords", "styles", "style"],
  era: ["era", "decade", "period", "year", "vintage"],
  price_day: ["priceday", "dayrate", "daily", "dailyrate", "dayprice", "perday"],
  price_week: ["priceweek", "weekrate", "weekly", "weeklyrate", "weekprice", "perweek"],
  replacement_value: ["replacementvalue", "replacement", "value", "retail", "retailvalue"],
  dimensions: ["dimensions", "dims", "size", "measurements", "dimension"],
  source_owner: ["sourceowner", "source", "owner", "vendor", "supplier"],
  location: ["location", "loc", "warehouse", "where", "hq"],
  condition: ["condition", "cond", "state", "quality"],
  availability_note: ["availabilitynote", "availability", "avail", "stocknote"],
  images: ["images", "image", "imageurl", "imageurls", "photos", "photo", "img", "picture"],
  featured: ["featured", "feature", "highlight", "hero"],
};

function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/** RFC4180-ish CSV parser — handles quoted fields, embedded commas/newlines. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // ignore
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/** Build a map from raw record keys to canonical field names. */
function buildHeaderMap(keys) {
  const map = {};
  for (const key of keys) {
    const n = norm(key);
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (aliases.includes(n)) {
        map[key] = field;
        break;
      }
    }
  }
  return map;
}

function toNumberOrNull(v) {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function splitMulti(v) {
  if (!v) return [];
  return String(v)
    .split(/[;|]|,(?![^()]*\))/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normaliseEra(v) {
  if (!v) return "Contemporary";
  const s = String(v).trim();
  if (ERAS.includes(s)) return s;
  const year = s.match(/(19|20)\d{2}/);
  if (year) {
    const y = Number(year[0]);
    if (y >= 2020) return "Contemporary";
    return `${Math.floor(y / 10) * 10}s`;
  }
  const decade = s.match(/(\d0)s?/);
  if (decade) {
    const d = Number(decade[1]);
    return d >= 70 ? `19${d}s` : `20${String(d).padStart(2, "0")}s`;
  }
  return "Contemporary";
}

function normaliseSource(v, fallback) {
  if (!v) return fallback;
  const n = norm(v);
  for (const owner of SOURCE_OWNERS) {
    if (norm(owner) === n) return owner;
  }
  if (n.includes("vanprop") || n === "vpc") return "VPC";
  if (n === "vpe") return "VPE";
  if (n.includes("rader")) return "RaderENT";
  if (n.includes("partner") || n.includes("vendor")) return "partner_vendor";
  if (n.includes("order") || n.includes("custom")) return "sourced_to_order";
  return fallback;
}

function truthy(v) {
  const n = norm(v);
  return n === "true" || n === "yes" || n === "y" || n === "1";
}

function recordToItem(raw, ctx) {
  const get = (field) => {
    const value = raw[field];
    return value == null ? "" : String(value).trim();
  };

  const title = get("title");
  if (!title) return null;

  let slug = get("slug") || slugify(title);
  while (ctx.slugs.has(slug)) slug = `${slug}-${ctx.dupes++}`;
  ctx.slugs.add(slug);

  let id = get("id");
  if (!id || ctx.ids.has(id)) {
    id = `rc-${String(ctx.nextId++).padStart(3, "0")}`;
  }
  ctx.ids.add(id);

  return {
    id,
    title,
    slug,
    description: get("description") || `${title}. Details confirmed on request.`,
    category: get("category") || "Storage",
    tags: splitMulti(get("tags")),
    era: normaliseEra(get("era")),
    price_day: toNumberOrNull(get("price_day")),
    price_week: toNumberOrNull(get("price_week")),
    replacement_value: toNumberOrNull(get("replacement_value")),
    dimensions: get("dimensions") || "Confirmed on request",
    source_owner: normaliseSource(get("source_owner"), ctx.defaultSource),
    location: get("location") || "Vancouver HQ",
    condition: get("condition") || "Good — honest wear",
    availability_note:
      get("availability_note") || "Availability confirmed manually on request.",
    images: splitMulti(get("images")),
    ...(truthy(get("featured")) ? { featured: true } : {}),
  };
}

const TEMPLATE_CSV = `title,category,description,tags,era,price_day,price_week,replacement_value,dimensions,source_owner,location,condition,availability_note,images,featured
Example Brass Floor Lamp,Lighting,Tall brass floor lamp with a warm shade.,Hotel;Institutional,1980s,32,105,480,38 dia x 165H cm,VPC,VPC · Vancouver,Vintage — patina,Single unit. Confirm dates.,/inventory/example-1.jpg,false
`;

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const sourceIdx = args.indexOf("--source");
  const defaultSource =
    sourceIdx >= 0 ? normaliseSource(args[sourceIdx + 1], "partner_vendor") : "partner_vendor";
  const inputFile = args.find((a) => !a.startsWith("--") && a !== args[sourceIdx + 1]);

  if (flags.has("--template")) {
    await fs.writeFile(TEMPLATE, TEMPLATE_CSV, "utf8");
    console.log(`Wrote import template -> ${path.relative(ROOT, TEMPLATE)}`);
    return;
  }

  if (!inputFile) {
    console.error(
      "Usage: node scripts/import-inventory.mjs <file.csv|file.json> [--merge] [--source VPC] [--dry-run]\n" +
        "       node scripts/import-inventory.mjs --template"
    );
    process.exit(1);
  }

  const text = await fs.readFile(path.resolve(ROOT, inputFile), "utf8");
  let records;
  if (inputFile.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(text);
    records = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error("CSV has no data rows.");
    const headers = rows[0];
    records = rows.slice(1).map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? "";
      });
      return obj;
    });
  }

  // Normalise each raw record's keys to canonical field names.
  const normalised = records.map((rec) => {
    const map = buildHeaderMap(Object.keys(rec));
    const out = {};
    for (const [k, v] of Object.entries(rec)) {
      if (map[k]) out[map[k]] = v;
    }
    return out;
  });

  let existing = [];
  if (flags.has("--merge")) {
    try {
      existing = JSON.parse(await fs.readFile(INVENTORY, "utf8"));
    } catch {
      existing = [];
    }
  }

  const ctx = {
    slugs: new Set(existing.map((i) => i.slug)),
    ids: new Set(existing.map((i) => i.id)),
    nextId:
      existing.reduce((max, i) => {
        const m = /rc-(\d+)/.exec(i.id || "");
        return m ? Math.max(max, Number(m[1])) : max;
      }, 0) + 1,
    dupes: 2,
    defaultSource,
  };

  const imported = [];
  let skipped = 0;
  for (const rec of normalised) {
    const item = recordToItem(rec, ctx);
    if (item) imported.push(item);
    else skipped++;
  }

  const result = [...existing, ...imported];

  console.log("rent.co inventory import");
  console.log(`  input          ${inputFile}`);
  console.log(`  rows imported  ${imported.length}`);
  if (skipped) console.log(`  rows skipped   ${skipped} (no title)`);
  console.log(`  mode           ${flags.has("--merge") ? "merge" : "replace"}`);
  console.log(`  total items    ${result.length}`);

  const unknownCat = imported.filter(
    (i) => i.category === "Storage" && !norm(i.title).includes("storage")
  ).length;
  if (unknownCat) {
    console.log(
      `  note           ${unknownCat} item(s) had no recognised category — defaulted to "Storage"; review data/inventory.json`
    );
  }

  if (flags.has("--dry-run")) {
    console.log("  (dry run — no file written)");
    return;
  }

  await fs.writeFile(INVENTORY, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(`  written        ${path.relative(ROOT, INVENTORY)}`);
}

main().catch((err) => {
  console.error("Import failed:", err.message);
  process.exit(1);
});
