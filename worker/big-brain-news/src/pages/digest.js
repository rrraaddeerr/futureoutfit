/**
 * The digest page. Server-rendered on each request from what is in KV, so
 * what Rader opens in the morning is always current. Sections: Today, then
 * This week, each grouped by source. Dates are Vancouver dates, because a
 * post that lands at 11 pm his time belongs to his today, not to UTC's.
 */

export const TIME_ZONE = "America/Vancouver";

const dateParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});
const dayLabel = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE, weekday: "short", month: "short", day: "numeric",
});
const timeLabel = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit",
});

/** "YYYY-MM-DD" for an instant, in the digest's time zone. */
export function localDateStr(iso, now = null) {
  const d = iso ? new Date(iso) : now;
  if (!d || Number.isNaN(d.getTime())) return null;
  const parts = {};
  for (const p of dateParts.formatToParts(d)) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDateStr(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Split items into { today, week }, each a list of [sourceName, items]
 * groups in first-seen order. Items older than 6 days before today, and
 * items with no usable date, are left out of the page (they stay in KV
 * and in /api/items).
 */
export function groupItems(items, now = new Date()) {
  const todayStr = localDateStr(null, now);
  const weekStart = shiftDateStr(todayStr, -6);
  const buckets = { today: new Map(), week: new Map() };

  for (const item of items) {
    const d = localDateStr(item.publishedAt || item.fetchedAt);
    if (!d) continue;
    const bucket = d === todayStr ? buckets.today : d >= weekStart && d < todayStr ? buckets.week : null;
    if (!bucket) continue;
    if (!bucket.has(item.sourceName)) bucket.set(item.sourceName, []);
    bucket.get(item.sourceName).push(item);
  }
  const toGroups = (map) => [...map.entries()].map(([sourceName, group]) => ({ sourceName, items: group }));
  return { today: toGroups(buckets.today), week: toGroups(buckets.week) };
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function itemHtml(item) {
  const when = item.publishedAt ? new Date(item.publishedAt) : null;
  const meta = when
    ? `${esc(dayLabel.format(when))} · ${esc(timeLabel.format(when))}`
    : "";
  return `<article class="item">
    <h3><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a></h3>
    ${meta ? `<div class="meta">${meta}</div>` : ""}
    ${item.excerpt ? `<p>${esc(item.excerpt)}</p>` : ""}
  </article>`;
}

function sectionHtml(title, groups, emptyText) {
  if (!groups.length) {
    return `<section><h2>${title}</h2><p class="empty">${emptyText}</p></section>`;
  }
  const inner = groups
    .map(
      (g) => `<div class="source"><h4>${esc(g.sourceName)}</h4>${g.items.map(itemHtml).join("\n")}</div>`,
    )
    .join("\n");
  return `<section><h2>${title}</h2>${inner}</section>`;
}

/** Full page. items: newest first, as listItems returns them. */
export function renderDigest(items, now = new Date()) {
  const { today, week } = groupItems(items, now);
  const updated = `${dayLabel.format(now)} · ${timeLabel.format(now)}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<title>🧠 Big Brain News</title>
<style>
  :root{--bg:#0f1115;--panel:#161a22;--line:#283042;--ink:#e7ecf5;--soft:#9aa6bd;--blue:#3b82f6}
  *{box-sizing:border-box}
  body{margin:0;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
  .wrap{max-width:760px;margin:0 auto;padding:24px 16px 80px}
  h1{font-size:24px;margin:0 0 4px}
  .sub{color:var(--soft);font-size:14px;margin-bottom:28px}
  h2{font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:var(--soft);border-bottom:1px solid var(--line);padding-bottom:8px;margin:34px 0 6px}
  .source h4{font-size:14px;margin:20px 0 4px;color:var(--ink)}
  .item{padding:12px 0;border-bottom:1px solid var(--line)}
  .item h3{font-size:17px;line-height:1.35;margin:0 0 4px}
  .item h3 a{color:var(--ink);text-decoration:none}
  .item h3 a:hover{color:var(--blue);text-decoration:underline}
  .meta{color:var(--soft);font-size:12.5px;margin-bottom:5px}
  .item p{margin:0;color:#c6cede;font-size:14.5px}
  .empty{color:var(--soft);padding:10px 0}
  footer{color:var(--soft);font-size:12.5px;margin-top:44px}
  a{color:var(--blue)}
</style>
</head>
<body>
<div class="wrap">
  <h1>🧠 Big Brain News</h1>
  <div class="sub">Your subscriptions, in one place. Updated ${esc(updated)} (Vancouver).</div>
  ${sectionHtml("Today", today, "Nothing new yet today. The feeds are checked a few times a day.")}
  ${sectionHtml("This week", week, "Nothing from earlier this week.")}
  <footer>Every headline links to the original post. Paid posts may show as excerpts here; the full edition is in your email.</footer>
</div>
</body>
</html>`;
}
