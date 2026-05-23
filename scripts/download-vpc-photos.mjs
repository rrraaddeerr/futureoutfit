#!/usr/bin/env node
/**
 * rent.co — VPC photo downloader (Mac client)
 *
 * Pulls every VPC item photo (excluding `_info` cards) straight from your
 * Google Drive into public/inventory/<barcode>.jpg, then links each image
 * to its item in data/inventory.json. Resume-safe: skips files already on
 * disk, so you can re-run if it crashes or you add more items later.
 *
 * ── ONE-TIME SETUP ──────────────────────────────────────────────────────
 *
 * 1. Open https://console.cloud.google.com — pick a project (or create one,
 *    any name is fine).
 *
 * 2. Enable the Drive API:
 *      APIs & Services → Library → search "Google Drive API" → Enable.
 *
 * 3. Set up the consent screen (only the first time on a project):
 *      APIs & Services → OAuth consent screen → External → fill the App
 *      name (e.g. "rentco importer") and your email → Save and Continue
 *      through the rest with defaults.
 *      Under "Test users" → Add Users → add the same Google account that
 *      owns the VPC_Catalog folder. Save.
 *
 * 4. Create the OAuth client:
 *      APIs & Services → Credentials → Create Credentials → OAuth client ID.
 *      Application type: Desktop app. Name: rentco-importer. Create.
 *      Download JSON → save it as `scripts/credentials.json` in this repo
 *      (already gitignored).
 *
 * 5. Install two one-off dependencies (won't persist in package.json):
 *      npm install --no-save googleapis @google-cloud/local-auth
 *
 * ── RUN ─────────────────────────────────────────────────────────────────
 *
 *      node scripts/download-vpc-photos.mjs
 *
 * The first run opens your browser for the Google sign-in. After that, the
 * saved token in scripts/token.json (also gitignored) is reused.
 *
 * When it finishes, commit and push:
 *      git add public/inventory data/inventory.json
 *      git commit -m "Load real VPC photos"
 *      git push
 *
 * Vercel auto-redeploys; the live site shows the real photography.
 */

import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INVENTORY = path.join(ROOT, "data/inventory.json");
const OUT_DIR = path.join(ROOT, "public/inventory");
const CREDS_PATH = path.join(ROOT, "scripts/credentials.json");
const TOKEN_PATH = path.join(ROOT, "scripts/token.json");
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

const SEARCH_BATCH = 40;     // barcodes per Drive list call
const CONCURRENCY = 8;       // parallel file downloads

async function loadAuth() {
  if (existsSync(TOKEN_PATH)) {
    const creds = JSON.parse(readFileSync(TOKEN_PATH, "utf8"));
    const { client_id, client_secret, redirect_uris } =
      JSON.parse(readFileSync(CREDS_PATH, "utf8")).installed ??
      JSON.parse(readFileSync(CREDS_PATH, "utf8")).web;
    const oAuth2 = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2.setCredentials(creds);
    return oAuth2;
  }
  if (!existsSync(CREDS_PATH)) {
    console.error(
      `Missing ${path.relative(ROOT, CREDS_PATH)}. See the setup block at the top of this file.`
    );
    process.exit(1);
  }
  const auth = await authenticate({ keyfilePath: CREDS_PATH, scopes: SCOPES });
  writeFileSync(TOKEN_PATH, JSON.stringify(auth.credentials, null, 2));
  console.log(`Saved auth token to ${path.relative(ROOT, TOKEN_PATH)}`);
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

async function downloadOne(drive, barcode, fileId, attempt = 1) {
  try {
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    writeFileSync(path.join(OUT_DIR, `${barcode}.jpg`), Buffer.from(res.data));
    return true;
  } catch (err) {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      return downloadOne(drive, barcode, fileId, attempt + 1);
    }
    console.error(`  fail ${barcode}: ${err.message ?? err}`);
    return false;
  }
}

async function main() {
  const auth = await loadAuth();

  // Some Google APIs reject OAuth-only calls without a quota project header.
  // Read project_id from credentials.json and apply it to every request.
  const creds = JSON.parse(readFileSync(CREDS_PATH, "utf8"));
  const projectId = (creds.installed ?? creds.web).project_id;
  google.options({ headers: { "x-goog-user-project": projectId } });

  const drive = google.drive({ version: "v3", auth });

  // Auth probe — surfaces clear errors if the token or scopes are wrong.
  try {
    const probe = await drive.about.get({ fields: "user(emailAddress)" });
    console.log(`auth ok — signed in as ${probe.data.user.emailAddress}`);
  } catch (err) {
    console.error("\nauth probe failed:", err.errors?.[0]?.message ?? err.message);
    console.error("Fix: delete scripts/token.json and re-run to redo OAuth.");
    console.error(`When the browser opens, make sure you sign in with the Drive owner — rt@raderturner.com (NOT a different Google account).`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const inv = JSON.parse(readFileSync(INVENTORY, "utf8"));
  const need = inv
    .map((item) => item.id.replace(/^vpc-/, ""))
    .filter((bc) => !existsSync(path.join(OUT_DIR, `${bc}.jpg`)));

  console.log(`inventory: ${inv.length} items  |  need photos: ${need.length}`);
  if (need.length === 0) {
    console.log("All photos already on disk. Updating inventory.json links…");
  } else {
    // batched search
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

    // parallel download via worker pool
    const queue = Object.entries(map);
    const total = queue.length;
    let done = 0;
    async function worker() {
      while (queue.length) {
        const next = queue.shift();
        if (!next) return;
        await downloadOne(drive, next[0], next[1]);
        done++;
        if (done % 10 === 0 || done === total) {
          process.stdout.write(`\rdownload  ${done}/${total}`);
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log();
  }

  // link images on inventory
  let linked = 0;
  for (const item of inv) {
    const bc = item.id.replace(/^vpc-/, "");
    if (existsSync(path.join(OUT_DIR, `${bc}.jpg`))) {
      item.images = [`/inventory/${bc}.jpg`];
      linked++;
    }
  }
  writeFileSync(INVENTORY, JSON.stringify(inv, null, 2) + "\n");
  console.log(`linked ${linked}/${inv.length} items in data/inventory.json`);
  console.log("\nDone. Now: git add … && git commit && git push");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
