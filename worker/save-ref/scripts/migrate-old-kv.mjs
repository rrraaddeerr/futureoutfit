#!/usr/bin/env node
/**
 * Big Brain — migrate the ORIGINAL save-ref worker's KV namespace into the new
 * worker.
 *
 * Read-only until you pass --import. Three steps, in order:
 *
 *   1. npm run migrate -- --list
 *        Every KV namespace on your account (title + id).
 *
 *   2. npm run migrate -- --dump <namespace-id>
 *        Reads the namespace into ./old-refs.ndjson (+ ./old-blobs/ for any
 *        uploaded bytes) and prints a sample, so you can confirm it's the right
 *        namespace BEFORE anything is written to the new worker.
 *
 *   3. npm run migrate -- --import --url https://… --token <token>
 *        Refs go over HTTP to /api/import. Uploaded blobs can't go that way —
 *        /api/import only takes ref JSON — so they're written straight into the
 *        new namespace with `wrangler kv key put`.
 *
 * Nothing here ever writes to or deletes from the OLD namespace.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Where the dump lands. Overridable so the tests never clobber a real dump.
const OUT = process.env.BIGBRAIN_MIGRATE_DIR || ROOT;
const DUMP = join(OUT, "old-refs.ndjson");
const BLOBDIR = join(OUT, "old-blobs");
const BLOBIDX = join(BLOBDIR, "index.json");
const TOML = join(ROOT, "wrangler.toml");

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
  const v = i >= 0 ? argv[i + 1] : null;
  return v && !v.startsWith("--") ? v : null;
};

function die(msg, detail) {
  console.error(`\n${c.red("✗ " + msg)}`);
  if (detail) console.error(c.dim(String(detail).trim().split("\n").slice(-12).join("\n")));
  process.exit(1);
}

/**
 * Wrangler prints its banner, proxy notices and version warnings to STDOUT,
 * mixed in with real output. Drop those leading lines so they can't corrupt a
 * parsed value. Operates on a Buffer, because blob values are binary.
 */
const NOISE = [
  /^Proxy environment variables detected/,
  /^\s*⛅️\s*wrangler/,
  /^\s*-{5,}\s*$/,
  /^\s*$/,
  /^\s*▲?\s*\[?WARNING\]?/,
  /^\s*Please update to the latest version/,
  /^\s*Run `npm install/,
  /^\s*After installation, run Wrangler/,
  /^\s*Note that there is a newer version/,
  /^\s*🪵/,
];
function stripNoise(buf) {
  let rest = buf;
  for (;;) {
    const nl = rest.indexOf(0x0a);
    if (nl < 0) break;
    const line = rest.subarray(0, nl).toString("utf8").replace(/\x1b\[[0-9;]*m/g, "");
    if (!NOISE.some((re) => re.test(line))) break;
    rest = rest.subarray(nl + 1);
  }
  return rest;
}

/** Run wrangler, capturing stdout as a Buffer. Falls back to v3 `kv:` spelling. */
function wrangler(args) {
  const go = (a) =>
    spawnSync("npx", ["--no-install", "wrangler", ...a], {
      cwd: ROOT,
      maxBuffer: 512 * 1024 * 1024,
      shell: process.platform === "win32",
    });
  let r = go(args);
  const text = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status !== 0 && /unknown argument|did you mean|not a valid|Unknown command/i.test(text)) {
    const [a, b, ...rest] = args;
    if (a === "kv" && b) r = go([`kv:${b}`, ...rest]);
  }
  return {
    code: r.status,
    stdout: stripNoise(r.stdout || Buffer.alloc(0)),
    err: `${r.stdout || ""}${r.stderr || ""}`,
  };
}

/**
 * Pull a JSON array out of wrangler's output. Tries every `[` as a starting
 * point (a stray "[WARNING]" must not win) and keeps the largest array parsed.
 */
function parseJsonArray(text, what) {
  let best = null;
  for (let i = text.indexOf("["); i >= 0; i = text.indexOf("[", i + 1)) {
    for (let j = text.lastIndexOf("]"); j > i; j = text.lastIndexOf("]", j - 1)) {
      try {
        const v = JSON.parse(text.slice(i, j + 1));
        if (Array.isArray(v) && (!best || v.length > best.length)) best = v;
        break;
      } catch {
        /* keep shrinking */
      }
    }
    if (best) break;
  }
  if (!best) die(`Couldn't find ${what} in wrangler's output.`, text);
  return best;
}

const safeName = (key) => key.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
const isBlob = (key) => key.startsWith("blob:");

// --- --list ----------------------------------------------------------------
if (has("--list")) {
  console.log(c.b("\nKV namespaces on this account:\n"));
  const r = wrangler(["kv", "namespace", "list"]);
  if (r.code !== 0) die("Couldn't list KV namespaces.", r.err);
  const list = parseJsonArray(r.stdout.toString("utf8"), "the namespace list");
  if (!list.length) die("No KV namespaces found on this account.");
  for (const ns of list) console.log(`  ${c.b(ns.title || "(untitled)")}\n    ${c.dim(ns.id)}`);
  console.log(
    `\n${c.dim("The old worker's namespace is the one bound in the OLD worker's")}\n` +
      `${c.dim("wrangler.toml. If two look alike, --dump each and compare — dumping")}\n` +
      `${c.dim("is read-only.")}\n\n` +
      `Next: ${c.b("npm run migrate -- --dump <id>")}\n`
  );
  process.exit(0);
}

// --- --dump ----------------------------------------------------------------
if (has("--dump")) {
  const id = val("--dump");
  if (!id) die("Usage: --dump <namespace-id>   (get the id from --list)");

  console.log(`\n${c.b("Listing keys")} ${c.dim(id)}`);
  const kr = wrangler(["kv", "key", "list", `--namespace-id=${id}`]);
  if (kr.code !== 0) die("Couldn't list keys in that namespace.", kr.err);
  const entries = parseJsonArray(kr.stdout.toString("utf8"), "the key list").filter((k) => k && k.name);
  if (!entries.length) die("That namespace is empty — probably not the one you want.");

  const refKeys = entries.filter((k) => !isBlob(k.name));
  const blobKeys = entries.filter((k) => isBlob(k.name));
  console.log(`  ${c.green("✓")} ${entries.length} keys — ${refKeys.length} refs, ${blobKeys.length} uploaded blobs`);

  const rows = [];
  let n = 0;
  for (const k of refKeys) {
    process.stdout.write(`\r  reading refs ${++n}/${refKeys.length}…`);
    const vr = wrangler(["kv", "key", "get", k.name, `--namespace-id=${id}`]);
    if (vr.code !== 0) {
      console.log(`\n  ${c.yellow("!")} skipped ${k.name}: ${vr.err.trim().split("\n").pop()}`);
      continue;
    }
    rows.push({ key: k.name, value: vr.stdout.toString("utf8") });
  }
  if (refKeys.length) process.stdout.write("\n");
  writeFileSync(DUMP, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(`  ${c.green("✓")} wrote ${rows.length} refs to ${c.b("old-refs.ndjson")}`);

  if (blobKeys.length) {
    mkdirSync(BLOBDIR, { recursive: true });
    const index = [];
    n = 0;
    for (const k of blobKeys) {
      process.stdout.write(`\r  reading blobs ${++n}/${blobKeys.length}…`);
      const vr = wrangler(["kv", "key", "get", k.name, `--namespace-id=${id}`]);
      if (vr.code !== 0) {
        console.log(`\n  ${c.yellow("!")} skipped ${k.name}: ${vr.err.trim().split("\n").pop()}`);
        continue;
      }
      const file = `${safeName(k.name)}.bin`;
      writeFileSync(join(BLOBDIR, file), vr.stdout);
      index.push({ key: k.name, file, metadata: k.metadata ?? null, bytes: vr.stdout.length });
    }
    process.stdout.write("\n");
    writeFileSync(BLOBIDX, JSON.stringify(index, null, 2));
    console.log(`  ${c.green("✓")} wrote ${index.length} blobs to ${c.b("old-blobs/")}`);
  }

  console.log(`\n${c.b("Sample — confirm this is the right namespace:")}\n`);
  for (const r of rows.slice(0, 3)) {
    let preview = r.value.trim();
    try {
      preview = JSON.stringify(JSON.parse(r.value), null, 2);
    } catch {
      /* not JSON — show it raw */
    }
    console.log(`  ${c.b(r.key)}`);
    console.log(preview.split("\n").slice(0, 12).map((l) => `    ${c.dim(l.slice(0, 160))}`).join("\n") + "\n");
  }
  if (!rows.length) console.log(`  ${c.yellow("(no ref-shaped keys — this may be the wrong namespace)")}\n`);
  console.log(`${c.dim("Looks right?")}\nNext: ${c.b("npm run migrate -- --import --url https://… --token <token>")}\n`);
  process.exit(0);
}

// --- --import --------------------------------------------------------------
if (has("--import")) {
  const url = (val("--url") || "").replace(/\/+$/, "");
  const token = val("--token");
  if (!url || !token) die("Usage: --import --url https://save-ref-v2.<sub>.workers.dev --token <token>");
  if (!existsSync(DUMP)) die("No old-refs.ndjson here — run --dump first.");

  const rows = readFileSync(DUMP, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

  // One JSON ref per key. Carry the KV key through as the id so a re-run
  // overwrites the same records instead of duplicating them.
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

  // --- blobs: straight into the new namespace, since /api/import won't take them
  if (existsSync(BLOBIDX)) {
    const index = JSON.parse(readFileSync(BLOBIDX, "utf8"));
    const nsId =
      val("--namespace-id") || (readFileSync(TOML, "utf8").match(/^\s*id\s*=\s*"([0-9a-fA-F]{32})"/m) || [])[1];
    if (!nsId) {
      console.log(
        `  ${c.yellow("!")} ${index.length} blobs NOT migrated: no KV id in wrangler.toml.\n` +
          `    Re-run with --namespace-id <new-id> once the new worker is deployed.`
      );
    } else {
      console.log(`\n${c.b("Copying")} ${index.length} blobs -> namespace ${c.dim(nsId)}`);
      let done = 0;
      for (const b of index) {
        const args = ["kv", "key", "put", b.key, `--namespace-id=${nsId}`, `--path=${join(BLOBDIR, b.file)}`];
        if (b.metadata) args.push(`--metadata=${JSON.stringify(b.metadata)}`);
        let r = wrangler(args);
        if (r.code !== 0 && b.metadata) {
          // older wrangler builds have no --metadata; keep the bytes at least
          r = wrangler(args.filter((a) => !a.startsWith("--metadata=")));
          if (r.code === 0) console.log(`  ${c.yellow("!")} ${b.key}: copied without metadata`);
        }
        if (r.code !== 0) console.log(`  ${c.yellow("!")} ${b.key} failed: ${r.err.trim().split("\n").pop()}`);
        else done++;
      }
      console.log(`  ${c.green("✓")} ${done}/${index.length} blobs copied`);
    }
  }

  console.log(`\nCheck the gallery: ${c.b(`${url}/browse`)}\n`);
  process.exit(0);
}

console.log(
  `\n${c.b("Big Brain — migrate the old worker's KV into the new one")}\n\n` +
    `  1. npm run migrate -- --list\n` +
    `  2. npm run migrate -- --dump <namespace-id>      ${c.dim("(read-only, prints a sample)")}\n` +
    `  3. npm run migrate -- --import --url https://… --token <token>\n\n` +
    `${c.dim("Never writes to the old namespace.")}\n`
);
