// Unit tests for the feed parser, URL normalisation, dedupe ids, and the
// digest grouping. Plain Node, no network: the fixture is a real capture of
// Nate's Substack feed (first 3 items) taken 2026-10-29.
// Run: node test/feed.test.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFeed, htmlToText, makeExcerpt } from "../src/feed.js";
import { normalizeUrl, dedupeIdFor } from "../src/normalize.js";
import { groupItems, localDateStr } from "../src/pages/digest.js";

let pass = 0, fail = 0;
function ok(label, cond) { cond ? pass++ : (fail++, console.error("✗ " + label)); }
function eq(label, got, want) { ok(label + ` (got ${JSON.stringify(got)})`, got === want); }

const xml = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "nates-feed.xml"), "utf8");

// ---- parseFeed against the real fixture ----
const items = parseFeed(xml);
eq("parses 3 items", items.length, 3);
ok("first title present", items[0].title.includes("Anthropic"));
eq("first link", items[0].link, "https://natesnewsletter.substack.com/p/anthropic-ipo-s1-analysis");
eq("guid equals link on Substack", items[0].guid, items[0].link);
eq("pubDate parsed to ISO", items[0].publishedAt, "2026-10-28T13:03:55.000Z");
ok("excerpt non-empty and single line", items[0].excerpt.length > 0 && !items[0].excerpt.includes("\n"));
ok("excerpt within cap", items[0].excerpt.length <= 281);
ok("full text extracted from content:encoded", items[0].text.length > 1000);
ok("text has no HTML tags left", !/<[a-z]+[ >]/.test(items[0].text));
eq("junk input parses to nothing", parseFeed("not a feed").length, 0);
eq("empty input parses to nothing", parseFeed("").length, 0);

// ---- htmlToText / makeExcerpt ----
eq("html stripped", htmlToText("<p>Hello <b>world</b></p>"), "Hello world");
eq("entities decoded", htmlToText("Fish &amp; Chips &lt;3"), "Fish & Chips <3");
const long = "word ".repeat(100).trim();
ok("excerpt truncates with ellipsis", makeExcerpt(long, 50).endsWith("…") && makeExcerpt(long, 50).length <= 51);
eq("short excerpt untouched", makeExcerpt("short text", 50), "short text");

// ---- normalizeUrl ----
eq("lowercases host, strips www",
  normalizeUrl("https://WWW.Substack.com/p/X/"), "https://substack.com/p/X");
eq("drops tracking params and fragment",
  normalizeUrl("https://natesnewsletter.substack.com/p/a?utm_source=email&fbclid=zzz#comments"),
  "https://natesnewsletter.substack.com/p/a");
eq("sorts kept params",
  normalizeUrl("https://example.com/p?b=2&a=1"), "https://example.com/p?a=1&b=2");
eq("keeps root slash", normalizeUrl("https://example.com"), "https://example.com/");
eq("rejects non-http", normalizeUrl("ftp://example.com/x"), null);
eq("rejects garbage", normalizeUrl("not a url"), null);

// ---- dedupe ids ----
const a = await dedupeIdFor("https://natesnewsletter.substack.com/p/post-one?utm_source=email");
const b = await dedupeIdFor("https://natesnewsletter.substack.com/p/post-one/");
const c = await dedupeIdFor("https://natesnewsletter.substack.com/p/post-two");
eq("same post, different dressing: same id", a.id, b.id);
ok("different post: different id", a.id !== c.id);
eq("id is 16 hex chars", a.id.length, 16);

// ---- digest grouping, Vancouver dates ----
// 2026-10-29 15:00 UTC is 08:00 PDT the same morning.
const now = new Date("2026-10-29T15:00:00Z");
eq("local date of now", localDateStr(null, now), "2026-10-29");
const mk = (title, publishedAt) => ({
  title, sourceName: "Nate's AI News", url: "https://x.test/" + title,
  publishedAt, fetchedAt: publishedAt, excerpt: "",
});
const grouped = groupItems([
  mk("morning post", "2026-10-29T14:00:00Z"),      // 07:00 PDT Oct 29: today
  mk("late night post", "2026-10-29T06:42:48Z"),   // 23:42 PDT Oct 28: this week
  mk("three days back", "2026-10-26T15:00:00Z"),   // this week
  mk("ten days back", "2026-10-19T15:00:00Z"),     // too old for the page
], now);
eq("today group has 1", grouped.today.length === 1 ? grouped.today[0].items.length : -1, 1);
eq("today item is the morning post", grouped.today[0]?.items[0]?.title, "morning post");
eq("week group has 2", grouped.week.length === 1 ? grouped.week[0].items.length : -1, 2);
ok("old item excluded", ![...grouped.today, ...grouped.week].some((g) => g.items.some((i) => i.title === "ten days back")));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
