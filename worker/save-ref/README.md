# save-ref worker — 🧠 Big Brain

A drop-anything reference inbox on Cloudflare Workers. Drop a **link, image, or
note**; it's auto-categorized and stored. Browse/search them later in a gallery.

This is an **optimized rebuild** of the original `save-ref-worker`, built to be a
drop-in replacement. It does not touch your existing worker or its data — deploy
it under a new name first, try it, then point your bookmark at it when happy.

## What's new vs. the original drop page

- **A gallery (`/browse`)** — actually *see* everything you saved: thumbnails,
  category filter chips, full-text search, **edit (re-tag / re-categorize)**,
  delete, export. (The original only let you drop, never look.)
- **Recent strip on `/drop`** — instant visual confirmation each save landed.
- **Richer auto-categorization** — image / video / audio / post / article / code /
  shop / document / note / link, by content-type, file extension, and a domain
  ruleset (YouTube→video, X/IG→post, GitHub→code, SSENSE→shop, …).
- **Link previews** — fetches Open Graph title/description/image so saved links
  show real thumbnails.
- **Multi-file drop + paste** — drag many files, paste screenshots or URLs (⌘V).
- **Export / import** — NDJSON round-trip, so you can migrate data in and out.
- **R2-ready** — large uploads can offload to R2 instead of KV (optional).
- **In your phone's share sheet** — installable PWA with a share target, plus an
  iOS Shortcut recipe. Share → Big Brain, from any app.
- **Works with no signal** — offline app shell and a sync-later queue.
- **One-command deploy** — `npm run setup`.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/drop` | public page | the drop SPA |
| GET | `/browse` | public page | the gallery SPA |
| POST | `/save` | token | save a link/note (JSON) or file (raw bytes) |
| GET | `/api/list?q=&cat=&cursor=&limit=` | token | list / search / filter |
| GET | `/api/ref/:id` | token | fetch one ref |
| PATCH | `/api/ref/:id` | token | edit a ref's `category` / `tags` / `title` |
| DELETE | `/api/ref/:id` | token | delete a ref (+ its blob) |
| GET | `/api/export` | token | NDJSON of all refs |
| POST | `/api/import` | token | bulk insert (array of refs) |
| GET | `/blob/:key` | public (key is the capability) | raw upload bytes |
| GET | `/health` | public | liveness |
| GET | `/setup` | public page | connect a device + share-sheet instructions |
| GET/POST | `/share` | public page | share-target landing (token applied client-side) |
| GET | `/manifest.webmanifest` | public | PWA manifest incl. `share_target` |
| GET | `/sw.js` | public | service worker (offline shell, queue, share) |
| GET | `/bb.js` | public | shared client lib (token, queue, save) |
| GET | `/icon-*.png` | public | app icons |

Auth = header `X-Auth-Token: <AUTH_TOKEN>`. The token is stored only in the
browser's localStorage and sent only to your Worker.

## Ship it (one command)

```bash
cd worker/save-ref
npm run setup
```

That's the whole deploy. It installs deps, logs you into Cloudflare, creates the
KV namespace and writes its id into `wrangler.toml`, generates your token and
pushes it as a secret, deploys, then prints your URL + token. It's safe to
re-run — every step checks whether it's already done and skips.

It never touches your original `save-ref-worker`, or `bigbrain/worker`:
`wrangler.toml` names a separate Worker (`save-ref-rebuild`) with its own
storage. Two configs deploying under one name replace each other — keep the
names distinct.

Then, **on your phone**, open the `/setup` URL it printed. That page connects
the phone and walks you through putting Big Brain in your share sheet. After
that, capturing a reference is: **Share → Big Brain**.

Optional, for lots of large uploads:

```bash
npx wrangler r2 bucket create save-ref-blobs
# uncomment the [[r2_buckets]] block in wrangler.toml
```

## Using it from your phone

`/setup` detects the device and shows one card:

- **Android** — tap Install. Android reads the app's `share_target` and Big
  Brain appears in the system share sheet for links, text, images and video.
  The shared POST is caught by the service worker, so your token never leaves
  the phone.
- **iPhone** — Add to Home Screen for the app + offline, then build the
  3-field Shortcut the page spells out (it fills in your real URL and token, so
  it's copy-paste). Enable *Show in Share Sheet* and you get **Share → Big
  Brain** from any app. Photos/screenshots go through the app icon.
- **Desktop** — a bookmarklet, or install it as a Chrome/Edge app.

### It works with no signal

Sets, warehouses and basements have no bars, which is exactly where you find
the good references. So:

- the app shell is cached — `/drop` opens offline
- a drop with no connection is queued in IndexedDB and the page says so
- it syncs itself when signal returns (on the `online` event, on next open, or
  via background sync), and `Sync now` forces it
- items are claimed atomically before sending, so a drop is never saved twice
  even when the page, the `online` event and the service worker all flush at
  once

## Develop / test locally

```bash
npm test                 # 152 tests: categorization, worker routes, PWA/share, migration
npm run dev:local        # http://localhost:8788 — no Cloudflare account needed
npm run dev              # wrangler dev --local: real KV in miniflare, hot reload
npm run icons            # regenerate the app icons (only if the artwork changes)
```

`npm run dev:local` runs the real Worker on plain Node with a Map-backed KV
persisted to `.bigbrain-dev.json`, token `dev`. Service workers and PWA installs
are allowed on localhost, so the share target, the offline queue and Add to Home
Screen can all be exercised there before you deploy anything.

```bash
curl -X POST localhost:8788/save -H "X-Auth-Token: dev" \
  -H "Content-Type: application/json" -d '{"url":"https://github.com/x/y"}'
```

(For `wrangler dev`, set a dev token via a `.dev.vars` file containing
`AUTH_TOKEN=dev`.)

## Migrating from the old worker

`npm run migrate` walks it in three steps. Steps 1–2 are read-only, and nothing
ever writes to or deletes from the old namespace:

```bash
npm run migrate -- --list                 # every KV namespace on the account
npm run migrate -- --dump <namespace-id>  # -> old-refs.ndjson, prints a sample
npm run migrate -- --import --url https://<your-worker>.<sub>.workers.dev --token <token>
```

Dump first and read the sample — that's how you confirm you picked the old
worker's namespace and not some other one. If two look alike, dump both and
compare; dumping costs nothing.

Two things worth knowing:

- **Uploaded files come too.** Refs are JSON and go over HTTP to `/api/import`,
  but uploaded bytes live under `blob:` keys and `/api/import` only accepts ref
  JSON. Those are dumped to `old-blobs/` and written straight into the new KV
  namespace with `wrangler kv key put`, metadata included. The new namespace id
  is read from `wrangler.toml`, or pass `--namespace-id <id>`.
- **Re-running is safe.** Each ref keeps its id (falling back to the KV key), so
  a second run overwrites the same records instead of duplicating them.

`old-refs.ndjson` and `old-blobs/` are gitignored — they hold real data.

Already have the data as JSON? POST it straight to `/api/import`:

```bash
curl -X POST .../api/import -H "X-Auth-Token: <token>" \
  -H "Content-Type: application/json" --data @old-refs.json
```
