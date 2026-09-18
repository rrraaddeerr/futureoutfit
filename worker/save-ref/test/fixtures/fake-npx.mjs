#!/usr/bin/env node
// Stands in for `npx --no-install wrangler …` in the migration tests.
// Reproduces real wrangler behaviour: chatter on STDOUT before the value,
// a "[WARNING]" line that must not be mistaken for the JSON array, and raw
// binary for blob values.
import { writeFileSync, readFileSync, appendFileSync } from "node:fs";

const a = process.argv.slice(2);
if (a[0] !== "--no-install" || a[1] !== "wrangler") { process.exit(127); }
const args = a.slice(2);
const LOG = process.env.FAKE_WRANGLER_LOG;
const flag = (n) => (args.find((x) => x.startsWith(`--${n}=`)) || "").split("=").slice(1).join("=");

// wrangler 3 spelling (hyphen rule) and wrangler 4 spelling (box-drawing rule).
// FAKE_WRANGLER_V4 picks the v4 banner, which is what a real Mac install prints.
const noise = process.env.FAKE_WRANGLER_V4
  ? "\n \u26c5\ufe0f wrangler 4.115.0\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n"
  : "Proxy environment variables detected. We'll use your proxy for fetch requests.\n" +
    "\n \u26c5\ufe0f wrangler 3.114.17\n------------------------------------------------\n" +
    "\u25b2 [WARNING] The version of Wrangler you are using is now out-of-date.\n\n";

const NS = [
  { id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1", title: "save-ref-worker-REFS_KV", supports_url_encoding: true },
  { id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb2", title: "unrelated-cache", supports_url_encoding: true },
];
const KEYS = [
  { name: "ref:abc123", metadata: null },
  { name: "ref:def456", metadata: null },
  { name: "_schema_version", metadata: null },
  { name: "blob:img1", metadata: { type: "image/png" } },
];
const VALUES = {
  "ref:abc123": '{"id":"abc123","title":"Brass sconce","url":"https://ex.com/1","category":"lighting"}',
  "ref:def456": '{"title":"Velvet swatch","category":"fabric"}',
  _schema_version: "3",
};
// bytes that are NOT valid utf8 — proves the blob path stays byte-exact
const BLOB = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe, 0x00, 0x01, 0x80]);

const sub = args.slice(0, 3).join(" ");
if (sub === "kv namespace list") {
  process.stdout.write(noise + JSON.stringify(NS, null, 2) + "\n");
} else if (sub === "kv key list") {
  if (process.env.FAKE_WRANGLER_V4 && !args.includes("--remote")) {
    process.stdout.write(noise + "[]\n"); // local storage: empty, but exit 0
    process.exit(0);
  }
  if (process.env.FAKE_WRANGLER_NO_REMOTE && args.includes("--remote")) {
    process.stderr.write("Unknown argument: remote\n");
    process.exit(1);
  }
  process.stdout.write(noise + JSON.stringify(KEYS, null, 2) + "\n");
} else if (sub === "kv key get") {
  const key = args[3];
  if (process.env.FAKE_WRANGLER_V4 && !args.includes("--remote")) {
    // wrangler 4 reads LOCAL storage without --remote: empty, exit 0, no error
    process.stdout.write(noise);
    process.exit(0);
  }
  process.stdout.write(noise);
  if (key.startsWith("blob:")) process.stdout.write(BLOB);
  else if (key in VALUES) process.stdout.write(VALUES[key]);
  else { process.stderr.write("key not found\n"); process.exit(1); }
} else if (sub === "kv key put") {
  const key = args[3];
  const path = flag("path");
  const meta = flag("metadata");
  if (meta && process.env.FAKE_WRANGLER_NO_METADATA) {
    process.stderr.write("Unknown argument: metadata\n");
    process.exit(1);
  }
  const bytes = path ? readFileSync(path) : Buffer.alloc(0);
  if (LOG) appendFileSync(LOG, JSON.stringify({ key, meta: meta || null, sha: bytes.toString("hex") }) + "\n");
  process.stdout.write(noise + "Writing the value to key.\n");
} else {
  process.stderr.write(`Unknown command: ${sub}\n`);
  process.exit(1);
}
