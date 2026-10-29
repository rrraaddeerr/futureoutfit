# Big Brain News

One digest page for Rader's paid news, so a subscription stops being a
pile of unread email. A cron polls the feeds a few times a day, dedupes
by normalised link, stores items in KV, and serves one page: today and
this week, grouped by source, every headline linking to the original.

Scope and reasoning: `~/workspace/big-brain-news-module/scope.md`
(this is Option B from that doc, phase 1).

## v1 scope

- One source: Nate's AI News (`src/feeds.js`). Its Substack feed was
  verified live on 2026-10-29 and carries full text for free posts;
  paid posts arrive as excerpts, with the full edition in email.
- Vancity Lookout is phase 2 on purpose: it publishes on beehiiv and
  has no public feed, so it needs archive polling or inbox parsing.
- This worker is a sibling of save-ref, not a part of it. It has its
  own KV namespace, writes only `news:` keys, never calls save-ref's
  `/save`, and does not touch Notion. The canonical-home question for
  Big Brain stays open; a later Notion sync would read from
  `/api/items`.

## How it works

- `scheduled` (cron, see `wrangler.toml`): fetch each feed, parse,
  write new items, prune anything older than 60 days.
- Item key: `news:item:<id>`, where the id is the first 16 hex chars
  of the SHA-256 of the normalised link. If the key exists, the item
  has been seen, so re-polling is idempotent and no index is needed.
- `GET /` renders the digest fresh from KV on every visit, using
  Vancouver dates for the Today and This week split.
- `GET /api/items` and `POST /api/refresh` need the same
  `X-Auth-Token` header save-ref uses. The digest page and `/health`
  are public, like save-ref's pages.

## Run it locally

```sh
npm run dev:local          # http://localhost:8789/   token: dev
curl -X POST http://localhost:8789/__scheduled   # ingest the live feed now
npm test                   # parser, dedupe, grouping, and worker tests
```

The local server persists KV to `.bigbrain-news-dev.json`;
`BB_STATE=memory` keeps it in RAM instead.

## Deploy (one time)

```sh
npx wrangler kv namespace create big-brain-news-kv
# paste the printed id into wrangler.toml, replacing REPLACE_WITH_KV_ID
npx wrangler secret put AUTH_TOKEN   # same value as save-ref's token
npx wrangler deploy
```

Cost: $0 incremental. A handful of feed polls a day and one small KV
namespace sit inside the Cloudflare allowances already on the account.
