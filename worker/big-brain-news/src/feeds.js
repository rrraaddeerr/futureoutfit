/**
 * News sources for the digest. v1 is one source on purpose (see the scope
 * doc): Nate's AI News, whose Substack feed was verified live on 2026-10-29.
 *
 * Adding a source later is one entry here, provided it has a real feed.
 * Vancity Lookout has none (it publishes on beehiiv), so it is deliberately
 * absent until its phase 2 route, archive polling or inbox parsing, is built.
 */
export const SOURCES = [
  {
    id: "nates",
    name: "Nate's AI News",
    feedUrl: "https://natesnewsletter.substack.com/feed",
    homeUrl: "https://natesnewsletter.substack.com",
  },
];
