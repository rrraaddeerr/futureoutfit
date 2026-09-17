#!/usr/bin/env node
/**
 * Browser end-to-end test. Starts a real dev server, drives it in Chromium at a
 * phone viewport, and asserts the things unit tests structurally cannot:
 * service worker registration, IndexedDB, the offline queue, and the share flow.
 *
 *   npm run test:e2e
 *
 * Playwright is NOT a dependency of this package — `npm test` stays dependency
 * free and instant. If Playwright isn't importable this exits 0 with a note,
 * so it never breaks a machine that doesn't have it.
 *
 *   npm i -D playwright        # then this runs for real
 *
 * Why this is committed: the offline queue once saved the same drop three times
 * (the page, the `online` event and the service worker each flushed it), and
 * every unit test passed while it did. That class of bug is only visible here.
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8790 + (process.pid % 200); // avoid clashing with a running dev server
const BASE = `http://localhost:${PORT}`;
const TOKEN = "e2e-token";

let pass = 0, fail = 0;
const ok = (label, cond) => { cond ? pass++ : (fail++, console.error("  ✗ " + label)); };
const eq = (label, got, want) =>
  ok(`${label} (expected ${JSON.stringify(want)}, got ${JSON.stringify(got)})`, got === want);

// ---- load Playwright, or skip cleanly ---------------------------------------
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.log("⚠ Playwright not installed — skipping browser tests.");
  console.log("  npm i -D playwright   (browsers are preinstalled in CI images)");
  process.exit(0);
}

// ---- boot a dev server ------------------------------------------------------
const server = spawn(process.execPath, [join(ROOT, "scripts", "dev-server.mjs")], {
  cwd: ROOT,
  // BB_STATE=memory: a clean store per run, so one run can't leave refs behind
  // that make the next run's assertions lie.
  env: { ...process.env, PORT: String(PORT), TOKEN, BB_STATE: "memory" },
  stdio: "ignore",
});
const stop = () => { try { server.kill(); } catch {} };
process.on("exit", stop);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}
if (!(await waitForServer())) {
  console.error("✗ dev server never came up");
  stop();
  process.exit(1);
}

// ---- drive it ---------------------------------------------------------------
// Chromium ships in this image at a versioned path; fall back to whatever
// Playwright resolves on a normal machine.
const launchOpts = {};
if (process.env.CHROMIUM_PATH) launchOpts.executablePath = process.env.CHROMIUM_PATH;

const browser = await chromium.launch(launchOpts);
const ctx = await browser.newContext({ viewport: { width: 402, height: 874 } });
const page = await ctx.newPage();

const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

const api = (path) =>
  page.evaluate(
    async ([p, t]) => (await (await fetch(p, { headers: { "X-Auth-Token": t } })).json()),
    [path, TOKEN],
  );

try {
  // --- connecting a device ---
  await page.goto(`${BASE}/setup`);
  await page.fill("#tok", TOKEN);
  await page.click("#savetok");
  await page.waitForSelector("#tokok:not(.hide)", { timeout: 10000 });
  ok("device connects with a valid token", true);
  eq("iOS Shortcut recipe shows the save URL", await page.textContent("#ios-url"), `${BASE}/save`);

  await page.waitForFunction(() => navigator.serviceWorker.controller || true);
  await page.evaluate(() => navigator.serviceWorker.ready);
  ok("service worker reaches active", true);

  // --- a normal save ---
  await page.goto(`${BASE}/drop`);
  await page.waitForSelector("#app:not(.hide)");
  await page.fill("#urlin", "https://www.ssense.com/en-ca/men/chairs");
  await page.press("#urlin", "Enter");
  await page.waitForSelector(".tile", { timeout: 10000 });
  let list = await api("/api/list?limit=20");
  ok("a dropped link is saved", list.refs.some((r) => r.url?.includes("ssense")));
  eq("…and categorized by the domain ruleset",
    list.refs.find((r) => r.url?.includes("ssense"))?.category, "shop");

  // --- the offline queue ---
  await ctx.setOffline(true);
  await page.fill("#urlin", "https://example.com/offline-capture");
  await page.press("#urlin", "Enter");
  await page.waitForSelector("#queue:not(.hide)", { timeout: 10000 });
  ok("a drop with no signal is queued, not lost", true);
  ok("…and the page says so", (await page.textContent("#queuetext")).includes("waiting"));

  // --- reconnecting ---
  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(
    () => document.querySelector("#queue").classList.contains("hide"),
    { timeout: 15000 },
  );
  list = await api("/api/list?limit=50");
  const dupes = list.refs.filter((r) => r.url === "https://example.com/offline-capture").length;
  // The regression this file exists for: three flushers, one item, one save.
  eq("a queued drop syncs EXACTLY once", dupes, 1);

  // --- the share target (GET route: iOS Shortcut / bookmarklet) ---
  await page.goto(`${BASE}/share?url=${encodeURIComponent("https://www.vanprop.ca/velvet-sofa")}&title=Velvet+Sofa`);
  await page.waitForSelector("#done:not(.hide)", { timeout: 15000 });
  eq("a shared link reports success", await page.textContent("#headline"), "Saved");
  eq("…and previews what landed", await page.textContent("#pvt"), "Velvet Sofa");

  // --- one-tap tagging ---
  await page.click('#quick button:has-text("set-dec")');
  await page.click("#addtags");
  await page.waitForTimeout(800);
  const tagged = await api("/api/list?q=set-dec");
  ok("quick tags are applied to the shared ref",
    tagged.refs.some((r) => (r.tags || []).includes("set-dec")));

  // --- the offline app shell ---
  await page.goto(`${BASE}/drop`);
  await ctx.setOffline(true);
  const res = await page.goto(`${BASE}/drop`).catch(() => null);
  ok("/drop still loads with no connection", !!res && res.status() === 200);
  ok("…and is actually usable", await page.locator("#zone").isVisible());
  await ctx.setOffline(false);

  ok("no uncaught page errors", pageErrors.length === 0);
  if (pageErrors.length) console.error("   ", pageErrors);
} catch (err) {
  fail++;
  console.error("  ✗ threw:", err.message);
} finally {
  await browser.close();
  stop();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
