import puppeteer from "puppeteer-core";
import chromiumPkg from "@sparticuz/chromium";
const chromium = chromiumPkg.default ?? chromiumPkg;
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = "file://" + join(__dirname, "index.html");
const outdir = join(__dirname, "shots");
import { mkdirSync } from "fs";
mkdirSync(outdir, { recursive: true });

const exe = await chromium.executablePath();
const browser = await puppeteer.launch({
  args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
  executablePath: exe,
  headless: true,
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("‼️ PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("‼️ CONSOLE:", m.text()); });
await page.setViewport({ width: 402, height: 874, deviceScaleFactor: 2, isMobile: true });
await page.goto(url, { waitUntil: "networkidle0" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(name, full = false) {
  await wait(450);
  await page.screenshot({ path: join(outdir, name + ".png"), fullPage: full });
  console.log("✓", name);
}
async function sheetShot(name) {
  await wait(500);
  const el = await page.$("#sheet");
  await el.screenshot({ path: join(outdir, name + ".png") });
  console.log("✓", name);
}

// 1. Discover feed
await shot("01-discover");

// 2. Look detail (decode)
await page.click('.look[data-id="l1"] .cap');
await sheetShot("02-decode");

// 3. Ask a grown-up (from detail)
await page.click("#askBtn");
await sheetShot("03-ask-grownup");

// close sheet
await page.evaluate(() => document.getElementById("sheetBg").click());
await wait(500);

// 4. Vibe quiz (You tab -> take quiz)
await page.click('nav.tabs button[data-go="you"]');
await page.waitForSelector("#takeQuiz", { visible: true, timeout: 8000 });
await page.click("#takeQuiz");
await sheetShot("04-vibe-quiz");

// answer the quiz to reach result
for (let i = 0; i < 4; i++) {
  await page.click("#sheetPad .qz-opt");
  await wait(250);
}
await sheetShot("05-vibe-result");
await page.click("#qzDone");
await wait(400);

// 5. Save a few looks then show You board
await page.click('.look[data-id="l1"] .savez');
await page.click('.look[data-id="l3"] .savez');
await page.click('.look[data-id="l6"] .savez');
await wait(200);
await page.click('nav.tabs button[data-go="you"]');
await shot("06-your-vibe", true);

// 6. Quests
await page.click('nav.tabs button[data-go="quests"]');
await shot("07-quests", true);

// 7. Learn (open thrift accordion)
await page.click('nav.tabs button[data-go="learn"]');
await wait(300);
await page.click("#acThrift summary");
await shot("08-learn", true);

// 8. Family Closet
await page.click('nav.tabs button[data-go="closet"]');
await shot("09-closet", true);

// 9. Coin-flip fairness sheet
await page.click('#closetBox [data-flip]');
await sheetShot("10-coinflip");
await page.evaluate(() => document.getElementById("sheetBg").click());
await wait(300);

await browser.close();
console.log("done");
