#!/usr/bin/env node
/**
 * Big Brain — migrate refs out of the ORIGINAL save-ref worker's KV namespace
 * and into the new one, via POST /api/import.
 *
 * Read-only until you pass --import. Three steps, run them in order:
 *
 *   1. node scripts/migrate-old-kv.mjs --list
 *        Prints every KV namespace on your account (title + id).
 *
 *   2. node scripts/migrate-old-kv.mjs --dump <namespace-id>
 *        Reads every key out of that namespace into ./old-refs.ndjson and
 *        prints a sample so you can confirm it's the right one BEFORE anything
 *        is written to the new worker.
 *
 *   3. node scripts/migrate-old-kv.mjs --import --url https://… --token <token>
 *        POSTs the dump to /api/import on the new worker.
 *
 * Nothing here ever writes to or deletes from the old namespace.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DUMP = join(ROOT, "old-refs.ndjson");

const c = {
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : null;
};

function die(msg, detail) {
  console.error(`\n${c.red("✗ " + msg)}`);
  if (detail) console.error(c.dim(detail.trim().split("\n").slice(-12).join("\n")));
  process.exit(1);
}

/** Run wrangler, capturing output. Falls back to the v3 `kv:` command spelling. */
function wrangler(args) {
  const go = (a) =>
    spawnSync("npx", ["--no-install", "wrangler", ...a], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      shell: process.platform === "win32",
    });
  let r = go(args);
  if (r.status !== 0 && /unknown argument|did you mean|not a valid/i.test(`${r.stdout}${r.stderr}`)) {
    // wrangler 3: `kv namespace list` -> `kv:namespace list`
    const [a, b, ...rest] = args;
    if (a === "kv" && b) r = go([`kv:${b}`, ...rest]);
  }
  return { code: r.status, out: r.stdout || "", err: `${r.stdout || ""}${r.stderr || ""}` };
}

/** Pull the first JSON array out of wrangler's chatty output. */
function parseJsonArray(out, what) {
  const start = out.indexOf("[");
  const end = out.lastIndexOf("]");
  if (start < 0 || end < start) die(`Couldn't find ${what} in wrangler's output.`, out);
  try {
    return JSON.parse(out.slice(start, end + 1));
  } catch (e) {
    die(`Couldn't parse ${what}: ${e.message}`, out);
  }
}

// --- --list ----------------------------------------------------------------
if (has("--list")) {
  console.log(c.b("\nKV namespaces on this account:\n"));
  const r = wrangler(["kv", "namespace", "list"]);
  if (r.code !== 0) die("Couldn't list KV namespaces.", r.err);
  const list = parseJsonArray(r.out, "the namespace list");
  if (!list.length) die("No KV namespaces found on this account.");
  for (const ns of list) {
    console.log(`  ${c.b(ns.title || "(untitled)")}\n    ${c.dim(ns.id)}`);
  }
  console.log(
    `\n${c.dim("The original worker's namespace is usually the one bound in the OLD")}\n` +
      `${c.dim("worker's wrangler.toml. If two look alike, --dump each and compare the")}\n` +
      `${c.dim("samples — dumping is read-only.")}\n\n` +
      `Next: ${c.b("node scripts/migrate-old-kv.mjs --dump <id>")}\n`
  );
  process.exit(0);
}

// --- --dump ----------------------------------------------------------------
if (has("--dump")) {
  const id = val("--dump");
  if (!id || id.startsWith("--")) die("Usage: --dump <namespace-id>   (get the id from --list)");

  console.log(`\n${c.b("Listing keys")} ${c.dim(id)}`);
  const kr = wrangler(["kv", "key", "list", `--namespace-id=${id}`]);
  if (kr.code !== 0) die("Couldn't list keys in that namespace.", kr.err);
  const keys = parseJsonArray(kr.out, "the key list").map((k) => k.name).filter(Boolean);
  console.log(`  ${c.green("✓")} ${keys.length} key${keys.length === 1 ? "" : "s"}`);
  if (!keys.length) die("That namespace is empty — probably not the one you want.");

  const rows = [];
  let n = 0;
  for (const key of keys) {
    process.stdout.write(`\r  reading ${++n}/${keys.length}…`);
    const vr = wrangler(["kv", "key", "get", key, `--namespace-id=${id}`]);
    if (vr.code !== 0) {
      console.log(`\n  ${c.yellow("!")} skipped ${key}: ${vr.err.trim().split("\n").pop()}`);
      continue;
    }
    rows.push({ key, value: vr.out });
  }
  process.stdout.write("\n");

  writeFileSync(DUMP, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(`  ${c.green("✓")} wrote ${rows.length} rows to ${c.b("old-refs.ndjson")}`);

  console.log(`\n${c.b("Sample — confirm this is the right namespace:")}\n`);
  for (const r of rows.slice(0, 3)) {
    let preview = r.value.trim();
    try {
      preview = JSON.stringify(JSON.parse(r.value), null, 2);
    } catch {
      /* not JSON — show it raw */
    }
    console.log(`  ${c.b(r.key)}`);
    console.log(
      preview
        .split("\n")
        .slice(0, 12)
        .map((l) => `    ${c.dim(l.slice(0, 160))}`)
        .join("\n") + "\n"
    );
  }
  console.log(
    `${c.dim("Looks right?")}\n` +
      `Next: ${c.b("node scripts/migrate-old-kv.mjs --import --url https://… --token <token>")}\n`
  );
  process.exit(0);
}

// --- --import --------------------------------------------------------------
if (has("--import")) {
  const url = (val("--url") || "").replace(/\/+$/, "");
  const token = val("--token");
  if (!url || !token) die("Usage: --import --url https://save-ref-v2.<sub>.workers.dev --token <token>");
  if (!existsSync(DUMP)) die("No old-refs.ndjson here — run --dump first.");

  const rows = readFileSync(DUMP, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  // The old worker stored one JSON ref per key. Keep anything that parses as an
  // object; carry the KV key through as the id so re-running is idempotent.
  const refs = [];
  const skipped = [];
  for (const { key, value } of rows) {
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      skipped.push(key);
      continue;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      skipped.push(key);
      continue;
    }
    const id = typeof parsed.id === "string" && parsed.id ? parsed.id : key.replace(/^ref:/, "");
    refs.push({ ...parsed, id });
  }

  console.log(`\n${c.b("Importing")} ${refs.length} refs -> ${url}/api/import`);
  if (skipped.length) {
    console.log(`  ${c.yellow("!")} skipping ${skipped.length} non-JSON key(s): ${skipped.slice(0, 5).join(", ")}`);
  }
  if (!refs.length) die("Nothing importable in the dump.");

  const res = await fetch(`${url}/api/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Token": token },
    body: JSON.stringify(refs),
  }).catch((e) => die(`Request failed: ${e.message}`));

  const body = await res.text();
  if (!res.ok) die(`Import failed (HTTP ${res.status}).`, body);
  console.log(`  ${c.green("✓")} ${body}`);
  console.log(`\nCheck the gallery: ${c.b(`${url}/browse`)}\n`);
  process.exit(0);
}

console.log(
  `\n${c.b("Big Brain — migrate the old worker's KV into the new one")}\n\n` +
    `  1. node scripts/migrate-old-kv.mjs --list\n` +
    `  2. node scripts/migrate-old-kv.mjs --dump <namespace-id>      ${c.dim("(read-only, prints a sample)")}\n` +
    `  3. node scripts/migrate-old-kv.mjs --import --url https://… --token <token>\n\n` +
    `${c.dim("Never writes to the old namespace.")}\n`
);
