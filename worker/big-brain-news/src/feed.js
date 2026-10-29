/**
 * RSS parsing. Pure functions, no I/O, so they unit-test with plain node.
 *
 * Small, deliberate parser for RSS 2.0 as Substack serves it: item blocks,
 * CDATA sections, the handful of entities feed text actually uses. It is not
 * a general XML parser and does not pretend to be one; if a future source
 * serves Atom, it gets its own adapter next to this file.
 */

/** Decode the entities that show up in feed text. CDATA needs no decoding. */
export function decodeEntities(s) {
  if (typeof s !== "string") return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&"); // last, so "&amp;lt;" becomes "&lt;" and not "<"
}

/** Text of the first <tag>...</tag> inside a block, or "" if absent. */
function tagText(block, tag) {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1]).trim() : "";
}

/** Strip HTML down to readable plain text. */
export function htmlToText(html) {
  if (typeof html !== "string") return "";
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .replace(/\n /g, "\n")
    .trim();
}

/** Collapse text to a single-line excerpt of at most maxChars, cut on a word. */
export function makeExcerpt(text, maxChars = 280) {
  const oneLine = String(text || "").replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxChars) return oneLine;
  const cut = oneLine.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

/**
 * Parse an RSS 2.0 document into items, newest first as served.
 * @returns {Array<{title, link, guid, publishedAt, excerpt, text}>}
 *   publishedAt is an ISO string or null; text is the full plain text of
 *   content:encoded where the feed carries it, capped for KV sanity.
 */
export function parseFeed(xml) {
  if (typeof xml !== "string" || !xml.includes("<item")) return [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const items = [];
  for (const block of blocks) {
    const title = tagText(block, "title");
    const link = tagText(block, "link");
    if (!title || !link) continue;

    const guid = tagText(block, "guid") || link;
    const pubRaw = tagText(block, "pubDate");
    const pub = pubRaw ? new Date(pubRaw) : null;
    const publishedAt = pub && !Number.isNaN(pub.getTime()) ? pub.toISOString() : null;

    const description = htmlToText(tagText(block, "description"));
    const fullText = htmlToText(tagText(block, "content:encoded"));
    const text = (fullText || description).slice(0, 30000);
    const excerpt = makeExcerpt(description || fullText);

    items.push({ title, link, guid, publishedAt, excerpt, text });
  }
  return items;
}
