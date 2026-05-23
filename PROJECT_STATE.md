# rent.co — Project State

Living snapshot of the project. Update when major things change.

## What this is

**rent.co** is a phase-1 inquiry-based rental, sourcing, and archive platform
operated by **RaderENT**. It is *not* an ecommerce store — every request is
read and confirmed by a person. The site is the public face of the operator
(Rader Turner), surfacing a curated archive of physical inventory for the
music / fashion / nightlife / festival / film world.

- **Brand:** rent.co (visible name) — wordmark is "R-E-N-T" exaggerated capitals
- **Operator:** RaderENT (Rader Turner, Vancouver)
- **Domain:** **r-ent.co** (with a hyphen) — registered at GoDaddy

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **React 19**
- **Zustand** for the inquiry-cart state
- Static-first: 604 prerendered pages, one API route (`/api/inquiry`)
- **Vercel Pro** hosting (Hobby plan ToS forbids commercial use)
- No database; inventory lives in `data/inventory.json`

## Where it's deployed

- **GitHub repo:** [rrraaddeerr/Rader1](https://github.com/rrraaddeerr/Rader1)
- **Working branch:** `claude/build-rentco-mvp-LNT1S` (drives PR #1)
- **Vercel "Production Branch":** `claude/photo-purge-swipe-app-Mm7sH` (legacy
  name from the original Expo project Vercel was first wired to). To ship to
  production, fast-forward this branch from `main`:
  `git push origin origin/main:refs/heads/claude/photo-purge-swipe-app-Mm7sH`.
  Pushing to `main` alone only creates Vercel previews.
- **Vercel project:** `mvp` (repo `rrraaddeerr/Rader1`)
- **Current public URL:** `https://mvp-hazel-omega.vercel.app`
- **Domain to attach:** `r-ent.co` (GoDaddy customer #117122741)
- **Pull request:** [#1](https://github.com/rrraaddeerr/Rader1/pull/1)
- **TODO when convenient:** in Vercel → mvp project → Settings → scroll for
  the Git/Production-Branch setting, change Production Branch to `main` so we
  can drop the photo-purge fast-forward step.

## Inventory

- **Source:** VPC catalog (vanprop.ca) — full catalog has 7,207 items
- **Curated for launch:** **590 items** (`data/inventory.json`)
- **Raw source-of-truth:** `data/vpc_catalog.csv` (committed)
- **Categories used:** rent.co's own 14 (Seating, Tables, Lighting, etc.) — VPC's prop-house categories are mapped in by the importer, not adopted
- **Importer:** `scripts/import-vpc.mjs` — `npm run import-vpc --count 600`
- **Photos:** real product photos from VPC's Google Drive — all 590 items have one. Pulled via `scripts/download-vpc-photos.mjs` using a GoDaddy-account OAuth client.
- **Prices:** real weekly rates from VPC's CSV (`$X/wk`). Day rate not present in the data; card UI shows weekly fallback.

## Brand

- **Voice:** archive / operating-system / warehouse / functional but hot. Avoid luxury showroom, generic prop house, startup SaaS, wedding rental, taste-filter language.
- **Colors:** stainless dark base (`#0c0c0d`), hot signal accent `#ff5a1f`, gaffer-tape green `#5f8338` (drawn as labels).
- **Fonts (bundled, `app/fonts/`):**
  - **Permanent Marker** — tape-label motif
  - **Archivo Regular/ExtraBold** — OpenGraph share images
  - **Rock Salt** — hand-drawn brand stamp
- **Logo:** `components/BrandStamp.tsx` — a Bella-Freud-homage square stamp, "Rader" top + truck-with-firecracker middle + "ENT.co" bottom, capitals R-E-N-T exaggerated to spell "rent". SVG body was generated once via rough.js and baked in.

## Key code paths

- `app/page.tsx` — Home (hero, CTAs, featured categories, featured objects)
- `app/archive/page.tsx` + `ArchiveBrowser.tsx` — searchable inventory grid
- `app/archive/[slug]/page.tsx` — item detail page (per-item OG image is dynamic)
- `app/consult/`, `app/source/`, `app/about/`, `app/request/` — other pages
- `app/api/inquiry/route.ts` — form submission endpoint (rate-limited, honeypot, optional webhook)
- `components/BrandStamp.tsx` — the hand-drawn logo (static SVG, no runtime rough.js)
- `lib/inventory.ts` — data access, facets, related-item logic
- `lib/cart.ts` — zustand store, localStorage-persisted
- `middleware.ts` + `app/access/` + `app/api/access/route.ts` — pre-launch invite gate (cookie-based)

## Pre-launch invite gate

The whole site is gated behind `/access` during soft launch. Anyone
without a valid `rentco_access` cookie gets redirected to the gate.
Static assets, robots, sitemap, and OG images stay public so shared
links still unfurl with the brand teaser.

- **Configure codes** via the `ACCESS_CODES` env var on Vercel:
  `alex:Alex,sam:Sam,marcus:Marcus,vip:VIP` — `code:Label` pairs,
  comma-separated. The label is the name that greets the visitor.
- **Default** (if unset): `operator:Operator,launch:Launch`.
- **Cookie lifetime:** 60 days.
- **Disable the gate** at full launch: delete `middleware.ts`,
  `app/access/`, `app/api/access/`, and the access CSS block at the
  bottom of `app/globals.css`.

## Decisions made (and why)

- **Next.js, not WordPress** — better fit for a code repo, faster, SEO clean.
- **JSON inventory, no CMS** — phase-1 simplicity; admin = edit JSON.
- **Inquiry only, no checkout** — explicit brief; every request manually confirmed.
- **Local logging for inquiries** — operator choice; `INQUIRY_WEBHOOK_URL` ready when wired.
- **Brand visible as "rent.co", URL is `r-ent.co`** — the bare `rent.co` is a six-figure premium domain. Hyphen hidden in branding.

## Open items

- **Domain not pointed yet** — `r-ent.co` is registered at GoDaddy but DNS still points to GoDaddy parking, not Vercel. See **Domain setup** below.
- **No email inbox** — `hello@r-ent.co` is the planned contact address but no MX records yet.
- **Inquiry destination** — currently local logging only; not wired to email/CRM.
- **Vercel Pro trial** — ~12 days left, needs a card before it expires.
- **GitHub 2FA** — Rader saw the prompt; should set it up at some point.
- **VPC catalog OAuth client** — secret is in chat logs; can be rotated at console.cloud.google.com/apis/credentials any time.

## Local development

```bash
git clone https://github.com/rrraaddeerr/Rader1.git
cd Rader1
npm install
npm run dev   # http://localhost:3000
```

## Re-import VPC catalog

```bash
npm run import-vpc -- --count 600
```

## Re-download VPC photos

Setup once (Google OAuth desktop client in `scripts/credentials.json`):

```bash
npm install --no-save googleapis @google-cloud/local-auth
node scripts/download-vpc-photos.mjs
```

Resume-safe: re-runs skip photos already on disk.

## Deploy

```bash
# 1. Push working branch (updates PR #1, creates a Vercel preview)
git push origin claude/build-rentco-mvp-LNT1S

# 2. Fast-forward main from the working branch
git push origin claude/build-rentco-mvp-LNT1S:main

# 3. Ship to production (Vercel only auto-deploys this branch)
git push origin origin/main:refs/heads/claude/photo-purge-swipe-app-Mm7sH
```

Production rebuilds in ~90 seconds.

## Domain setup (when ready)

To point `r-ent.co` at Vercel:

1. **Vercel:** Project → Settings → Domains → Add Domain → `r-ent.co`. Vercel will show the DNS records you need.
2. **GoDaddy:** sign in (customer #117122741) → My Products → `r-ent.co` → **DNS**. Replace or add:
   - `A` record · Name `@` · Value `76.76.21.21` · TTL `1 Hour`
   - `CNAME` record · Name `www` · Value `cname.vercel-dns.com` · TTL `1 Hour`
3. Save. DNS propagates in ~5–30 minutes; Vercel auto-detects and issues SSL.

After that, the site is live at `https://r-ent.co` and `https://www.r-ent.co`.

## Useful npm scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run import-vpc -- --count 600` — rebuild inventory from the VPC CSV
- `npm run import-inventory` — generic CSV/JSON inventory importer (other sources)
