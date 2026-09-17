#!/usr/bin/env node
/**
 * Big Brain — one-command setup & deploy.
 *
 *   npm run setup
 *
 * Does every step of the old six-step README dance, in order, and is safe to
 * re-run: each step checks whether it's already done and skips if so.
 *
 *   1. wrangler installed?        -> npm install
 *   2. logged in to Cloudflare?   -> wrangler login
 *   3. KV namespace exists?       -> create it, write the id into wrangler.toml
 *   4. AUTH_TOKEN secret set?     -> generate one, push it as a secret
 *   5. deploy                     -> wrangler deploy
 *   6. print the URL + token, and save them to .bigbrain-local (gitignored)
 *
 * Nothing here touches the ORIGINAL save-ref-worker: wrangler.toml names a
 * separate Worker (save-ref-v2) with its own KV namespace.
 */

import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOML = join(ROOT, "wrangler.toml");
const LOCAL = join(ROOT, ".bigbrain-local");
const KV_TITLE = "save-ref-kv";

const c = {
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
};

let step = 0;
const say = (msg) => console.log(`\n${c.b(`[${++step}/6]`)} ${c.b(msg)}`);
const ok = (msg) => console.log(`      ${c.green("✓")} ${msg}`);
const info = (msg) => console.log(`      ${c.dim(msg)}`);
const warn = (msg) => console.log(`      ${c.yellow("!")} ${msg}`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = async (q) => (await rl.question(`      ${q}`)).trim();

/** Run a command, capture output, never throw. */
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
    ...opts,
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

/** Run a command with the terminal attached (for interactive login, deploy). */
function runLive(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, {
      cwd: ROOT,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    p.on("close", (code) => resolve(code));
  });
}

const wrangler = (args, opts) => run("npx", ["--no-install", "wrangler", ...args], opts);

/**
 * `kv namespace create` (wrangler 4) vs `kv:namespace create` (wrangler 3).
 * Try modern first, fall back on an unknown-command error.
 */
function kvCreate(title) {
  let r = wrangler(["kv", "namespace", "create", title]);
  if (r.code !== 0 && /unknown argument|did you mean|not a valid/i.test(r.out)) {
    r = wrangler(["kv:namespace", "create", title]);
  }
  return r;
}

function fail(msg, detail) {
  console.log(`\n${c.red("✗ " + msg)}`);
  if (detail) console.log(c.dim(detail.trim().split("\n").slice(-12).join("\n")));
  rl.close();
  process.exit(1);
}

// ---------------------------------------------------------------------------

console.log(`\n${c.b("🧠 Big Brain — setup")}`);
console.log(c.dim("   Deploys your reference inbox to your own Cloudflare account."));
console.log(c.dim("   Safe to re-run; finished steps are skipped.\n"));

// --- 1. dependencies -------------------------------------------------------
say("Checking wrangler");
if (!existsSync(join(ROOT, "node_modules", "wrangler"))) {
  info("Installing dependencies (one time, ~30s)…");
  const code = await runLive("npm", ["install"]);
  if (code !== 0) fail("npm install failed.");
}
const ver = wrangler(["--version"]);
if (ver.code !== 0) fail("Couldn't run wrangler.", ver.out);
ok(`wrangler ${(ver.out.match(/\d+\.\d+\.\d+/) || ["?"])[0]}`);

// --- 2. Cloudflare login ---------------------------------------------------
say("Checking Cloudflare login");
let who = wrangler(["whoami"]);
if (who.code !== 0 || /not authenticated|you are not logged in/i.test(who.out)) {
  info("Opening Cloudflare in your browser to authorise wrangler…");
  const code = await runLive("npx", ["--no-install", "wrangler", "login"]);
  if (code !== 0) fail("Login failed or was cancelled.");
  who = wrangler(["whoami"]);
  if (who.code !== 0) fail("Still not logged in.", who.out);
}
const email = (who.out.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [])[0];
ok(`Logged in${email ? ` as ${email}` : ""}`);

// --- 3. KV namespace -------------------------------------------------------
say("Checking KV storage");
let toml = readFileSync(TOML, "utf8");
const currentId = (toml.match(/^\s*id\s*=\s*"([^"]+)"/m) || [])[1];

if (currentId && currentId !== "REPLACE_WITH_KV_ID") {
  ok(`KV namespace already wired (${currentId.slice(0, 8)}…)`);
} else {
  info(`Creating KV namespace "${KV_TITLE}"…`);
  const r = kvCreate(KV_TITLE);
  if (r.code !== 0) fail("Couldn't create the KV namespace.", r.out);
  // wrangler prints the new id as `id = "…"` (toml) or `"id": "…"` (json)
  const id = (r.out.match(/\bid"?\s*[=:]\s*"([0-9a-fA-F]{32})"/) || [])[1];
  if (!id) fail("Created the namespace but couldn't find its id in the output.", r.out);
  toml = toml.replace(/^(\s*id\s*=\s*)"REPLACE_WITH_KV_ID"/m, `$1"${id}"`);
  if (!new RegExp(id).test(toml)) fail("Couldn't write the KV id into wrangler.toml — add it by hand.");
  writeFileSync(TOML, toml);
  ok(`KV namespace created and written into wrangler.toml (${id.slice(0, 8)}…)`);
  warn("Commit wrangler.toml so you don't create a second namespace later.");
}

// --- 4. auth token ---------------------------------------------------------
say("Checking your Big Brain token");
const secrets = wrangler(["secret", "list"]);
const hasSecret = secrets.code === 0 && /"?name"?\s*:?\s*"?AUTH_TOKEN/i.test(secrets.out);
let token = null;

if (hasSecret) {
  ok("AUTH_TOKEN is already set on the Worker.");
  const saved = existsSync(LOCAL) ? (readFileSync(LOCAL, "utf8").match(/^TOKEN=(.+)$/m) || [])[1] : null;
  if (saved) {
    token = saved;
    info("Your existing token is in .bigbrain-local (printed again at the end).");
  } else {
    warn("The token value isn't stored locally — Cloudflare can't show it back.");
    const a = await ask("Generate a NEW token and replace it? [y/N] ");
    if (/^y/i.test(a)) token = randomBytes(32).toString("hex");
    else info("Keeping the existing token. Paste it into /drop from wherever you saved it.");
  }
} else {
  token = randomBytes(32).toString("hex");
}

if (token) {
  info("Uploading the token to Cloudflare as a secret…");
  const r = wrangler(["secret", "put", "AUTH_TOKEN"], { input: `${token}\n` });
  if (r.code !== 0) fail("Couldn't set the AUTH_TOKEN secret.", r.out);
  ok("Token set.");
}

// --- 5. deploy -------------------------------------------------------------
say("Deploying");
const dep = wrangler(["deploy"]);
if (dep.code !== 0) fail("Deploy failed.", dep.out);
const url =
  (dep.out.match(/https:\/\/[\w.-]+\.workers\.dev/) || [])[0] ||
  (dep.out.match(/https:\/\/\S+/) || [])[0] ||
  null;
ok(url ? `Live at ${url}` : "Deployed.");

// --- 6. hand it over -------------------------------------------------------
say("Done");

if (token || url) {
  const body = [
    "# Big Brain — local notes. GITIGNORED: never commit this file.",
    `# Written by npm run setup on ${new Date().toISOString()}`,
    url ? `URL=${url}` : "",
    token ? `TOKEN=${token}` : "",
    "",
  ]
    .filter(Boolean)
    .join("\n");
  writeFileSync(LOCAL, body, { mode: 0o600 });
  ok("Saved URL + token to .bigbrain-local (gitignored).");
}

const base = url || "https://<your-worker>.workers.dev";
console.log(`
${c.b("──────────────────────────────────────────────────────────")}
${c.b("🧠 Big Brain is live.")}

  Drop page   ${c.blue(`${base}/drop`)}
  Gallery     ${c.blue(`${base}/browse`)}
  Phone setup ${c.blue(`${base}/setup`)}   ${c.dim("← open this one on your phone")}
${token ? `\n  ${c.b("Your token")}  ${c.yellow(token)}\n  ${c.dim("Paste it once on each device. It's also in .bigbrain-local.")}` : ""}

${c.b("Next (2 minutes, on your phone):")}
  1. Open ${c.blue(`${base}/setup`)} on your phone and paste the token.
  2. Follow the one card it shows you — Add to Home Screen (iPhone)
     or Install (Android). That puts Big Brain in your share sheet.
  3. Then: any app -> Share -> Big Brain. Done, even with no signal.
${c.b("──────────────────────────────────────────────────────────")}
`);

rl.close();
