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

Auth = header `X-Auth-Token: <AUTH_TOKEN>`. The token is stored only in the
browser's localStorage and sent only to your Worker.

## One-time setup

```bash
cd worker/save-ref
npm install
npx wrangler login
npx wrangler kv namespace create save-ref-kv     # prints an id
# paste that id into wrangler.toml -> [[kv_namespaces]] id = "..."

openssl rand -hex 32                              # your Big Brain token
npx wrangler secret put AUTH_TOKEN                # paste it when prompted
```

Optional, for lots of large uploads:

```bash
npx wrangler r2 bucket create save-ref-blobs
# uncomment the [[r2_buckets]] block in wrangler.toml
```

## Deploy

```bash
npm run deploy
```

Open `https://save-ref-worker.<your-subdomain>.workers.dev/drop`, paste the same
token, and start dropping. The gallery is at `/browse`.

## Develop / test locally

```bash
npm test                 # pure-logic categorization tests (no deps, no network)
npm run dev              # wrangler dev --local: real KV in miniflare, hot reload
# then: curl -X POST localhost:8787/save -H "X-Auth-Token: dev" \
#   -H "Content-Type: application/json" -d '{"url":"https://github.com/x/y"}'
```

(Set a dev token for local runs with `wrangler dev` via a `.dev.vars` file
containing `AUTH_TOKEN=dev`.)

## Migrating from the old worker

If you can export your existing data as JSON, POST it to `/api/import`:

```bash
curl -X POST .../api/import -H "X-Auth-Token: <token>" \
  -H "Content-Type: application/json" --data @old-refs.json
```
