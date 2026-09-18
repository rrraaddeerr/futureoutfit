/**
 * Migration script tests. No network and no Cloudflare account: a fake wrangler
 * on PATH stands in for the real CLI, and a local HTTP server stands in for the
 * deployed worker.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "migrate-old-kv.mjs");
const FAKE = join(ROOT, "test", "fixtures", "fake-npx.mjs");
const BLOB = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe, 0x00, 0x01, 0x80]);

const readRows = (f) =>
  existsSync(f)
    ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];

const tryParse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

let pass = 0;
let fail = 0;
const ok = (cond, name) => (cond ? (pass++, true) : (fail++, console.log(`  ✗ ${name}`), false));

// Put a fake `npx` first on PATH.
const bin = mkdtempSync(join(tmpdir(), "fakebin-"));
writeFileSync(join(bin, "npx"), `#!/bin/sh\nexec "${process.execPath}" "${FAKE}" "$@"\n`);
chmodSync(join(bin, "npx"), 0o755);

// Dump into a temp dir: `npm test` must never touch a real in-progress dump.
const OUT = mkdtempSync(join(tmpdir(), "bigbrain-migrate-"));
const DUMP = join(OUT, "old-refs.ndjson");
const BLOBDIR = join(OUT, "old-blobs");
const clean = () => {
  rmSync(DUMP, { force: true });
  rmSync(BLOBDIR, { recursive: true, force: true });
};

function run(args, env = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, BIGBRAIN_MIGRATE_DIR: OUT, ...env },
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

clean();

// --- --list ----------------------------------------------------------------
{
  const r = run(["--list"]);
  ok(r.code === 0, "--list exits 0");
  // The real bug this guards: "▲ [WARNING] …" appears before the JSON array.
  ok(r.out.includes("save-ref-worker-REFS_KV"), "--list finds the namespace past the [WARNING] noise");
  ok(r.out.includes("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1"), "--list prints the namespace id");
  ok(r.out.includes("unrelated-cache"), "--list prints every namespace");
  ok(!r.out.includes("WARNING] The version"), "--list doesn't echo wrangler noise as data");
}

// --- --dump ----------------------------------------------------------------
{
  const r = run(["--dump", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1"]);
  ok(r.code === 0, "--dump exits 0");
  ok(existsSync(DUMP), "--dump writes old-refs.ndjson");

  const rows = readFileSync(DUMP, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  ok(rows.length === 3, `--dump captures the 3 non-blob keys (got ${rows.length})`);
  ok(!rows.some((x) => x.key.startsWith("blob:")), "--dump keeps blobs out of the refs file");

  const abc = rows.find((x) => x.key === "ref:abc123");
  ok(abc && tryParse(abc.value)?.title === "Brass sconce", "--dump strips noise from ref values");

  ok(r.out.includes("3 refs, 1 uploaded blobs"), "--dump reports the refs/blobs split");
  ok(r.out.includes("Brass sconce"), "--dump prints a sample before anything is imported");

  const idx = JSON.parse(readFileSync(join(BLOBDIR, "index.json"), "utf8"));
  ok(idx.length === 1 && idx[0].key === "blob:img1", "--dump indexes the blob");
  ok(idx[0].metadata && idx[0].metadata.type === "image/png", "--dump keeps blob metadata from the key list");

  const bytes = readFileSync(join(BLOBDIR, idx[0].file));
  ok(bytes.equals(BLOB), "--dump writes blob bytes byte-exact (non-utf8 survives)");
}

// --- --import --------------------------------------------------------------
// The stub worker runs as its own process: run() uses spawnSync, which blocks
// this file's event loop, so an in-process server could never answer.
const STUB = join(ROOT, "test", "fixtures", "stub-worker.mjs");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function withServer(fn) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const log = join(tmpdir(), `stublog-${port}.ndjson`);
  const ready = join(tmpdir(), `stubready-${port}`);
  rmSync(log, { force: true });
  rmSync(ready, { force: true });
  const srv = spawn(process.execPath, [STUB, String(port), log, ready], { stdio: "ignore" });
  try {
    for (let i = 0; i < 100 && !existsSync(ready); i++) sleep(50);
    if (!existsSync(ready)) throw new Error("stub worker never came up");
    return fn(port, () =>
      existsSync(log)
        ? readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
        : []
    );
  } finally {
    srv.kill();
    rmSync(log, { force: true });
    rmSync(ready, { force: true });
  }
}

withServer((port, requests) => {
  const log = join(BLOBDIR, "put.log");
  const r = run(
    ["--import", "--url", `http://127.0.0.1:${port}`, "--token", "tok123", "--namespace-id", "c".repeat(32)],
    { NO_PROXY: "127.0.0.1", no_proxy: "127.0.0.1", FAKE_WRANGLER_LOG: log }
  );
  ok(r.code === 0, "--import exits 0");
  const seen = requests();
  ok(seen.length === 1 && seen[0].url === "/api/import", "--import POSTs to /api/import");
  ok(seen[0].token === "tok123", "--import sends the auth token");

  const refs = JSON.parse(seen[0].body);
  ok(refs.length === 2, `--import posts the 2 object-shaped refs (got ${refs.length})`);
  ok(refs.find((x) => x.id === "abc123").title === "Brass sconce", "--import preserves an existing id");
  ok(!!refs.find((x) => x.id === "def456"), "--import derives a missing id from the KV key");
  ok(!refs.some((x) => JSON.stringify(x).includes("WARNING")), "--import never posts wrangler noise");
  ok(/skipping 1 non-JSON key/.test(r.out), "--import reports the scalar key it skipped");

  const puts = readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  ok(puts.length === 1 && puts[0].key === "blob:img1", "--import copies the blob into the new namespace");
  ok(puts[0].sha === BLOB.toString("hex"), "--import copies blob bytes byte-exact");
  ok(puts[0].meta && JSON.parse(puts[0].meta).type === "image/png", "--import re-applies blob metadata");
});

// blobs must still land on a wrangler build with no --metadata flag
withServer((port) => {
  const log = join(BLOBDIR, "put2.log");
  const r = run(
    ["--import", "--url", `http://127.0.0.1:${port}`, "--token", "tok123", "--namespace-id", "c".repeat(32)],
    { NO_PROXY: "127.0.0.1", no_proxy: "127.0.0.1", FAKE_WRANGLER_LOG: log, FAKE_WRANGLER_NO_METADATA: "1" }
  );
  ok(r.code === 0, "--import survives a wrangler with no --metadata support");
  const puts = readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  ok(
    puts.some((p) => p.key === "blob:img1" && p.sha === BLOB.toString("hex")),
    "blob bytes still copied without metadata"
  );
  ok(/copied without metadata/.test(r.out), "the metadata fallback is reported, not silent");
});

// --- the same dump, against a wrangler 4 banner (box-drawing rule) ----------
{
  clean();
  const r = run(["--dump", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1"], { FAKE_WRANGLER_V4: "1" });
  ok(r.code === 0, "v4: --dump exits 0");

  const rows = readFileSync(DUMP, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const abc = rows.find((x) => x.key === "ref:abc123");
  ok(abc && tryParse(abc.value)?.title === "Brass sconce", "v4: ref values parse past the box-drawing rule");

  const idx = JSON.parse(readFileSync(join(BLOBDIR, "index.json"), "utf8"));
  const bytes = readFileSync(join(BLOBDIR, idx[0].file));
  ok(bytes.equals(BLOB), "v4: blob bytes stay byte-exact past the box-drawing rule");
}

// --- wrangler 4 reads LOCAL KV without --remote, and reports a full namespace
// --- as empty. That is a silent wrong answer, so it must never happen. -------
{
  clean();
  const r = run(["--dump", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1"], { FAKE_WRANGLER_V4: "1" });
  ok(r.code === 0, "v4: --dump does not report a populated namespace as empty");
  ok(!/namespace is empty/i.test(r.out), "v4: no false 'empty namespace' verdict");

  const rows = readRows(DUMP);
  ok(rows.length === 3, `v4: --dump still captures the refs (got ${rows.length})`);
  const idxFile = join(BLOBDIR, "index.json");
  const idx = existsSync(idxFile) ? JSON.parse(readFileSync(idxFile, "utf8")) : [];
  ok(idx[0] && readFileSync(join(BLOBDIR, idx[0].file)).equals(BLOB), "v4: blob bytes still byte-exact");
}

// a wrangler with no --remote flag (v3) must still work
{
  clean();
  const r = run(["--dump", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1"], { FAKE_WRANGLER_NO_REMOTE: "1" });
  ok(r.code === 0, "v3: --dump falls back when --remote is unknown");
  const rows = readRows(DUMP);
  ok(rows.length === 3, `v3: --dump still captures the refs (got ${rows.length})`);
}

// --- --profile reaches wrangler, so a second account can be read ----------
{
  const r = run(["--list", "--profile", "old"], { FAKE_WRANGLER_NEED_PROFILE: "1" });
  ok(r.code === 0, "--profile is passed through to wrangler");
  ok(r.out.includes("save-ref-worker-REFS_KV"), "--profile still lists the namespaces");

  const r2 = run(["--list"], { FAKE_WRANGLER_NEED_PROFILE: "1" });
  ok(r2.code !== 0, "without --profile the same call fails (test is not vacuous)");
}

// --- guards ----------------------------------------------------------------
{
  clean();
  const r = run(["--import", "--url", "http://127.0.0.1:1", "--token", "t"]);
  ok(r.code !== 0 && /run --dump first/i.test(r.out), "--import refuses to run before --dump");

  const r2 = run(["--dump"]);
  ok(r2.code !== 0 && /Usage/.test(r2.out), "--dump without an id shows usage");

  const r3 = run([]);
  ok(r3.code === 0 && /migrate/.test(r3.out), "no flags prints help");
}

clean();
rmSync(bin, { recursive: true, force: true });
rmSync(OUT, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
