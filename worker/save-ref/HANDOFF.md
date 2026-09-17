# Big Brain — handoff

Paste-ready context for another assistant (ChatGPT, or anything else), plus
where it's cheaper to send work than here.

---

## Part 1 — paste this into ChatGPT

> Copy everything between the lines. It's self-contained; it doesn't assume the
> other model can see the repo.

---

I'm Rader, a freelance Production Designer / Set Decorator in Vancouver. I have
a personal tool called **Big Brain**: a "drop anything, find it later" reference
inbox I use to capture visual references (furniture, textures, lighting, props,
wardrobe) while I'm working.

**Stack:** a single Cloudflare Worker (JavaScript, no framework, no build step).
Storage is Cloudflare KV, optionally R2 for large files. The UI is a few
self-contained HTML pages served as template literals from the Worker — no
React, no bundler. ~2,000 lines total. Tests are plain Node scripts (`node
test/x.test.mjs`), no test framework.

**What exists and works today:**
- `POST /save` — save a link, a note, or raw file bytes. Auto-categorizes into
  image / video / audio / post / article / code / shop / document / note / link
  using content-type, file extension, and a domain ruleset. Links get Open Graph
  title/description/thumbnail scraped.
- `/drop` — drag-drop / paste / multi-file capture page.
- `/browse` — gallery with thumbnails, category filter chips, full-text search,
  edit tags + category, delete, NDJSON export/import.
- `/setup` — connects a device and gives per-platform instructions for adding
  Big Brain to the phone's share sheet.
- `/share` — share-target landing page: confirms what got saved and offers
  one-tap tags.
- Installable PWA: manifest with `share_target`, service worker, offline app
  shell, and an offline queue in IndexedDB that syncs when signal returns.
- Auth is a single shared secret sent as an `X-Auth-Token` header, stored in the
  browser's localStorage + IndexedDB. Single user (me). No accounts, no login.
- Data model, one KV entry per ref:
  `{ id, kind, category, host, tags[], title, desc, image, url?, text?, blobKey?, bytes?, mime?, createdAt }`
  `id` is a reverse-timestamp string so a plain key-prefix list returns
  newest-first with cursor paging.

**What I want help with — pick up from here:**

The capture side is done. The **retrieval and usefulness** side is not. Right
now it's a nicely organized pile. Things I'd value, roughly in order:

1. **Semantic search.** "that rust-colored velvet armchair" should find the
   thing even though those words appear nowhere in the title. Cheapest sane
   approach given Cloudflare Workers + KV, please — I'd rather not stand up a
   vector database if embeddings-in-KV with brute-force cosine over a few
   thousand items is fine (tell me where that breaks down).
2. **Auto-tagging images.** A vision model that looks at a saved photo and tags
   it with material, color, era, and object type, using set-decoration
   vocabulary rather than generic alt-text.
3. **Boards / projects.** My work is project-based, each with a codename. I want
   to group refs into a project and export a board as a PDF or a shareable link
   to send a director or producer.
4. **Dupe detection.** I save the same chair from four sites. Collapse them.
5. **Weekly digest.** "Here's what you saved this week, grouped by theme."

**Constraints to respect:**
- Cloudflare Workers runtime: no Node built-ins, no filesystem, CPU-time limits
  per request, KV values capped at 25 MB, KV is eventually consistent.
- No build step. Everything is plain JS a browser or the Workers runtime can run
  as-is. Please don't introduce React, TypeScript, or a bundler.
- Single user. Don't design for multi-tenancy.
- Keep it cheap — this should stay within Cloudflare's free tier or close to it.
- Match the existing style: small focused modules, comments explaining *why*,
  plain Node test scripts.

Start by asking me anything you need, then propose an approach for #1 before
writing code.

---

## Part 2 — where to send which work (cheaper / different)

Honest read on splitting this across tools:

| Work | Best tool | Why |
|---|---|---|
| Multi-file changes in this repo, running tests, deploying | **Claude Code** (here) | It has the repo, runs the tests, and can push. Pasting files into a chat window to get diffs back is the slow path. |
| Thinking through the semantic-search design before code | **GPT-6 Astra** (ChatGPT) | Frontier reasoning, no repo access needed. Good use of tokens you've already paid for. Bring the conclusion back here to implement. |
| Writing the semantic-search / boards / digest code | **GPT-6 Astra**, in chat or via Codex | Strong at coding and agentic work. If you drive it through Codex, see the warning below about two agents on one repo. |
| Bulk image auto-tagging (#2) | **Gemini Flash** or a small vision model via API | Astra is ~$10/M in, $50/M out — frontier pricing for a job that doesn't need it. For "tag this chair", a small model is ~as good and 10–20x cheaper. Do NOT send a thousand images through a frontier model, and do NOT do it through a chat window one at a time. |
| Embeddings for semantic search (#1) | **OpenAI `text-embedding-3-small`** | ~$0.02 per million tokens. Embedding a few thousand refs costs cents. Cloudflare **Workers AI** also has embedding models that run *inside* the Worker with no external API call — worth pricing out first, since you're already on Cloudflare. |
| Rubber-ducking / "is this a good idea" | Whichever you have tokens in | Genuinely interchangeable. Use the one you're paying for. |

**Cheaper alternatives worth knowing:**

- **Cloudflare Workers AI** — the one I'd look at first for this project. Text
  embeddings and image captioning run at the edge, in the same Worker, no
  second vendor, generous free tier. It removes a whole API-key + egress
  problem.
- **Cloudflare Vectorize** — their vector database, same account, free tier.
  If brute-force cosine over KV gets slow (somewhere north of a few thousand
  refs), this is the natural next step rather than Pinecone.
- **Local models** — for bulk auto-tagging, an Ollama model on your own laptop
  is free and the images never leave your machine. Slower, and only worth it
  for big batches.

**One caution:** don't let two agents edit this repo at the same time. Astra can
drive Codex directly against the repo, which is genuinely capable — but if
something else is also working the branch you'll get conflicting edits on the
same files. One driver per branch. Whoever drives, `npm test` has to pass before
it pushes.

---

## Part 2b — the task queue for Astra

Rules, so two agents never collide:

- Astra produces **data files, analysis and critique**. Never commits, never PRs,
  never direct edits to this repo.
- Anything that has to run `npm test` lands through Claude Code.
- One task at a time, in this order. Don't start a task before its
  prerequisite is real — building against an imagined corpus means building
  twice.

| # | Task | Prerequisite | Status |
|---|---|---|---|
| 1 | Set-dec tagging vocabulary + vision prompt + eval set | none | **ready now** |
| 2 | Adversarial review of the semantic-search plan | Claude writes the plan | blocked |
| 3 | Board/PDF layout options for client-facing exports | ~50 real refs saved | blocked |
| 4 | Dupe-detection heuristics | ~200 real refs saved | blocked |

### Task 1 — paste this into Astra

---

You're helping build an auto-tagging system for a film/TV set decorator's visual
reference library. A vision model will look at a saved photo (furniture, props,
textures, lighting, wardrobe, locations) and output tags.

I need you to produce the controlled vocabulary it tags against. It must use
**working set-decoration and production-design language** — the words a set
decorator, buyer or prop master actually says on a job — not generic
image-captioning language. "Walnut mid-century credenza, teak veneer, patinated
brass" not "brown wooden furniture".

Return a single JSON object, no prose around it, in exactly this shape:

```json
{
  "version": 1,
  "facets": {
    "object":   ["credenza", "wingback chair", "..."],
    "material": ["walnut", "patinated brass", "..."],
    "era":      ["victorian", "mid-century", "..."],
    "color":    ["oxblood", "sage", "..."],
    "finish":   ["distressed", "high-gloss", "..."],
    "style":    ["brutalist", "art deco", "..."],
    "use":      ["hero prop", "set dressing", "..."]
  },
  "vision_prompt": "the exact prompt to send a vision model, instructing it to return ONLY tags drawn from the vocabulary above, as a JSON array, with a hard cap on how many",
  "eval": [
    { "description": "a plain-English description of a photo", "expected_tags": ["..."] }
  ]
}
```

Requirements:
- 40–80 terms per facet. Lowercase, hyphenated, no duplicates across facets.
- Terms must be things a model can plausibly see in a photo. Drop anything that
  depends on knowing provenance or price.
- `eval` should have 25 entries spanning easy and genuinely ambiguous cases,
  including at least 5 where you'd expect a model to get it wrong, and say why
  in the description.
- Bias the vocabulary toward what shows up on Vancouver film jobs — period
  drama, PNW contemporary, sci-fi, commercial/lifestyle.

Ask me about my actual jobs before you write it if that would change your
answer.

---

## Part 3 — facts to hand over with it

- Repo: `rrraaddeerr/futureoutfit`, the Worker lives in `worker/save-ref/`.
- Deploy: `npm run setup` (one command, idempotent).
- Try locally with no Cloudflare account: `npm run dev:local` → localhost:8788,
  token `dev`.
- Tests: `npm test` — 108 passing.
- The repo is currently **public**. Don't paste your `AUTH_TOKEN`, any
  Cloudflare key, or anything else secret into a chat window or a committed
  file. The token lives in `.bigbrain-local`, which is gitignored.
