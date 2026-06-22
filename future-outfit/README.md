# FUTURE OUTFIT — by TTHHAANNKKSS

A kid-safe, futuristic "Pinterest for individuality." Built first for **Franky** —
so a 12-year-old can explore who they are through style, **find out what something
is without working up the courage to ask a stranger**, and learn that the best
clothes are secondhand, with a story, and cheap.

> MVP focus (today): **explore-first**. The family closet / hand-me-down
> circulation is **next** (scaffolded in `family-closet-phase2.html`).

## How to view it
It's a single, self-contained file — no build, no backend.

- **Easiest:** open `index.html` in any browser (works offline).
- **Phone preview:** serve the folder and open it on your phone on the same Wi-Fi:
  ```
  cd future-outfit && python3 -m http.server 8080
  ```
  then visit `http://<your-computer-ip>:8080`.
- **Deploy:** drag the `future-outfit/` folder onto Netlify/Vercel, or push to
  GitHub Pages. One drop, it's live.

Your saved looks, vibe, and quests persist locally (localStorage) on each device.

## What's in the MVP
- **Discover** — a feed of diverse, *non-mall* looks across eras (90s skate, Y2K,
  cottage, prep, punk, mod, workwear, hip-hop heritage). Filter by vibe.
- **Decode any look** — tap a look to break it into named pieces, learn its
  **era & origin**, **why its colours work**, a **care tip**, and **where to find
  it** (thrift / resale / make — not the mall).
- **Ask a grown-up** — the heart of it. Instead of a scary stranger, ask a
  **trusted adult you and your family chose** (Dad, Aunt Rae, Papa). No strangers, ever.
- **Your Vibe** — a 4-question style quiz names your style and tunes the feed;
  saved looks build a personal board.
- **Quests** — playful missions (time-travel a look, decode, ask a brave question,
  find your colour, know thyself, skip the mall) that nudge exploration.
- **Learn** — Thrift 101, a style-words glossary, where looks come from
  (movements & history), and care & repair.

## Design choices
- **Kid-safe by shape:** explore-only, no money, no strangers, no public feed of
  real people. The only "social" action routes to pre-approved family adults.
- **Simpler, bigger, playful UI** for a phone-light kid.
- **Teach, don't flex:** brands/eras are framed as *knowledge* ("this is 90s
  skatewear"), never as price tags or status.
- **The blend:** looks are curated + a starter pack now; real family/circle
  contributions layer in with the closet later.

## Next (Phase 2)
- Wire in the **Family Closet** (`family-closet-phase2.html`): claim real items,
  free / pay-with-thanks / for sale, coin-flip fairness, garment lineage, the
  philanthropy split, and the wishlist→closet "ping me" loop.
- Real photos & uploads in the feed, parent-approval layer, accounts/circles.
