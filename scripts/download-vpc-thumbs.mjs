#!/usr/bin/env node
/**
 * rent.co — VPC low-rez thumbnail downloader (Mac client)
 *
 * Pulls a tiny (~240px, ~5 KB) thumb for every VPC catalog item into
 * public/inventory/thumbs/<barcode>.jpg. Used by /curate so you can scan
 * the full 7,207-item catalog visually instead of decision-by-text.
 *
 * Doesn't touch the high-rez photos already in public/inventory/. Those
 * stay as-is for the archive page; thumbs are for fast browsing only.
 *
 * Resume-safe: skips any thumb already on disk.
 *
 * ── ONE-TIME SETUP ──────────────────────────────────────────────────────
 * If you haven't run scripts/download-vpc-photos.mjs before, follow steps
 * 1-5 in that file first (Drive API + OAuth + scripts/credentials.json).
 *
 * Add sharp as a one-off dep alongside the existing googleapis ones:
 *   npm install --no-save googleapis @google-cloud/local-auth sharp
 *
 * ── RUN ────────────────────────────────────────────────────────────────
 *   node scripts/download-vpc-thumbs.mjs
 *
 *   # Optionally cap the batch (handy for a quick test):
 *   node scripts/download-vpc-thumbs.mjs --limit 200
 *
 * When it finishes (or whenever you want to ship what you have so far):
 *   git add public/inventory/thumbs && git commit -m "VPC thumbs" && git push
 *
 * Vercel auto-redeploys; /curate immediately uses the new thumbs.
 */

import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import sharp from "sharp";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CATALOG = path.join(ROOT, "data/vpc_catalog.csv");
const OUT_DIR = path.join(ROOT, "public/inventory/thumbs");
const CREDS_PATH = path.join(ROOT, "scripts/credentials.json");
const TOKEN_PATH = path.join(ROOT, "scripts/token.json");
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

const SEARCH_BATCH = 40;
const CONCURRENCY = 8;
const THUMB_WIDTH = 240;
const THUMB_QUALITY = 55;

const args = new Set(process.argv.slice(2));
const limitFlag = process.argv.find((a) => a.startsWith("--limit"));
const LIMIT = limitFlag
  ? parseInt(limitFlag.split("=")[1] || process.argv[process.argv.indexOf(limitFlag) + 1] || "0", 10)
  : 0;

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") {}
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

async function loadAuth() {
  if (existsSync(TOKEN_PATH)) {
    const creds = JSON.parse(readFileSync(TOKEN_PATH, "utf8"));
    const cfg = JSON.parse(readFileSync(CREDS_PATH, "utf8"));
    const { client_id, client_secret, redirect_uris } = cfg.installed ?? cfg.web;
    const oAuth2 = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2.setCredentials(creds);
    return oAuth2;
  }
  if (!existsSync(CREDS_PATH)) {
    console.error(`Missing ${path.relative(ROOT, CREDS_PATH)} — see setup block in scripts/download-vpc-photos.mjs.`);
    process.exit(1);
  }
  const auth = await authenticate({ keyfilePath: CREDS_PATH, scopes: SCOPES });
  writeFileSync(TOKEN_PATH, JSON.stringify(auth.credentials, null, 2));
  return auth;
}

async function searchBatch(drive, barcodes) {
  const clauses = barcodes.map((b) => `name = '${b}.jpg'`).join(" or ");
  const q = `(${clauses}) and mimeType = 'image/jpeg' and trashed = false`;
  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    pageSize: 200,
    spaces: "drive",
  });
  return res.data.files ?? [];
}

async function downloadAndShrink(drive, barcode, fileId, attempt = 1) {
  try {
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const out = path.join(OUT_DIR, `${barcode}.jpg`);
    await sharp(Buffer.from(res.data))
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: THUMB_QUALITY, mozjpeg: true, progressive: true })
      .toFile(out);
    return true;
  } catch (err) {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      return downloadAndShrink(drive, barcode, fileId, attempt + 1);
    }
    console.error(`  fail ${barcode}: ${err.message ?? err}`);
    return false;
  }
}

async function main() {
  const auth = await loadAuth();

  const creds = JSON.parse(readFileSync(CREDS_PATH, "utf8"));
  const projectId = (creds.installed ?? creds.web).project_id;
  google.options({ headers: { "x-goog-user-project": projectId } });
  const drive = google.drive({ version: "v3", auth });

  try {
    const probe = await drive.about.get({ fields: "user(emailAddress)" });
    console.log(`auth ok — ${probe.data.user.emailAddress}`);
  } catch (err) {
    console.error("\nauth probe failed:", err.errors?.[0]?.message ?? err.message);
    console.error("Fix: delete scripts/token.json and re-run to redo OAuth.");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const csv = readFileSync(CATALOG, "utf8");
  const rows = parseCsv(csv);
  const header = rows[0];
  const ix = header.findIndex((h) => h.trim() === "barcode");
  const all = rows.slice(1).map((r) => (r[ix] || "").trim()).filter(Boolean);

  let need = all.filter((bc) => !existsSync(path.join(OUT_DIR, `${bc}.jpg`)));
  if (LIMIT > 0) need = need.slice(0, LIMIT);

  console.log(`catalog: ${all.length} items | thumbs missing: ${need.length}${LIMIT ? ` (capped at --limit ${LIMIT})` : ""}`);
  if (need.length === 0) {
    console.log("All thumbs already on disk. Nothing to do.");
    return;
  }

  const map = {};
  for (let i = 0; i < need.length; i += SEARCH_BATCH) {
    const batch = need.slice(i, i + SEARCH_BATCH);
    const files = await searchBatch(drive, batch);
    for (const f of files) {
      const bc = f.name.replace(/\.jpg$/, "");
      if (!map[bc]) map[bc] = f.id;
    }
    process.stdout.write(
      `\rsearch  ${Math.min(i + SEARCH_BATCH, need.length)}/${need.length}  found ${Object.keys(map).length}`
    );
  }
  console.log();

  const missing = need.filter((bc) => !map[bc]);
  if (missing.length) {
    console.warn(`no Drive match for ${missing.length} barcodes (first 5): ${missing.slice(0, 5).join(", ")}`);
  }

  const queue = Object.entries(map);
  const total = queue.length;
  let done = 0;
  async function worker() {
    while (queue.length) {
      const next = queue.shift();
      if (!next) return;
      await downloadAndShrink(drive, next[0], next[1]);
      done++;
      if (done % 20 === 0 || done === total) {
        process.stdout.write(`\rdownload  ${done}/${total}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log();

  console.log(`\nDone. Thumbs written to ${path.relative(ROOT, OUT_DIR)}.`);
  console.log("Commit + push when ready:");
  console.log("  git add public/inventory/thumbs && git commit -m 'VPC thumbs' && git push");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
