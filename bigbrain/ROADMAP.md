# Big Brain — beyond retrieval

Where it goes after the archive can see. Written from Rader's answers on
2026-09-11. Private, one person. Nothing here generalises to other users.

The shape in one line: **one inbox for everything → one brain → one weekly
voice.** A note is a ref with no URL. A to-do is a ref with a date. A voice
memo is a ref that arrives as audio. If it all lands in the same place, the
brain learns from what he *says and intends*, not only from what he saves —
and the zine is the brain talking back.

Ordered by leverage per hour. Each step is usable on its own.

## 0 · Tonight — let it see (in progress)

Run `bigbrain/local` on the Mac overnight (`npm run overnight`). Free vision
captions for all ~1,575 refs in a night or two instead of 80 nights at the
Workers AI ration. Everything below compounds on this: image search, the
map's words, the profile, the zine's pictures.

Done when: `/health` shows captions on most refs; the map bands carry real
captions on every region.

## 1 · One inbox

`/drop` (and the phone shortcut) accepts more than links:

- **Text with no URL** → a note. Same ref shape, `category: "note"`.
- **A date or "remind me …"** in the text → a to-do: `due` set, surfaces in
  the today strip (step 3) and the calendar feed.
- **Audio** (Shortcuts can send a voice memo) → transcribed (Workers AI
  Whisper, or the Mac runner when it is up), stored as a ref with the
  transcript as body. What he says in the moment is the strongest taste
  signal he named.
- **"Mine" flag** at capture → marks his own work as ground truth (step 2).

Every one of these gets embedded like any other ref, so "what did I think
about mirror floors" is a search, not a scroll through Notes.

Cost: one session. No new infrastructure — same KV, same Vectorize.

## 2 · Better signal than a swipe

What he said matters most, in his order:

1. **What he returns to.** Record opens from map/gallery/search and
   inclusion in a Set. A second open counts far more than a first yes.
   Feeds `learn.js` as a positive with weight.
2. **What he actually makes.** Read-only ingest of his published work:
   Instagram posts (needs a fresh export — the April one predates most of
   the archive) and `raderturner.com` (crawl, read only). Stored with
   `mine: true`; the profile is computed *from these* first, the saves
   second. Output is the ground truth, input is the evidence.
3. **Richer no.** Swipe-left shows three or four reason buttons, in his
   words (to be decided by using them). Each reason moves a different
   dial: *boring* pushes toward stranger, *not my world* pushes toward his
   axes, *can't build it* changes nothing about taste.
4. **What he says.** Voice notes at capture (step 1) already cover this.

Cost: two sessions. The Instagram export is on him.

## 3 · Reach him

Three channels, none of them a new app:

- **Today strip** on every Big Brain page: due to-dos, the one thing the
  night found, the queue count. Zero setup; relies on him opening it.
- **Calendar feed.** The worker serves `/calendar.ics` (token in the URL);
  iPhone Calendar subscribes once. A to-do with a time becomes an event
  with an alert. The phone does the nagging; no OAuth, no Google API.
- **iMessage via Shortcuts.** A personal automation on the phone polls
  `/api/today` on a schedule and texts him what is due. Native feel; ten
  minutes of setup on the phone, one endpoint on the worker.

Cost: one session for the worker side.

## 4 · The zine

Weekly. A real read, but every section stands alone so any one of them is
the whole thing if that is all he reads:

1. **This week's pictures** — the refs, big, captioned by what it saw.
2. **Culture + news** — what he saved, summarised, three lines each.
3. **AI / knowledge** — same.
4. **Your patterns** — from `learn.js` stats and the vision captions: what
   he kept circling, with the proof pinned beside it.
5. **The one contradiction** — where this week's saves argue with his
   stated taste ("you say raw; fourteen polished things this month").
6. **Three you haven't seen** — `selfgaps` finds the thin spots and goes
   looking; queued for a swipe, never auto-added.

Lives at `/zine` (always the latest, back issues by week) and the Shortcut
texts him the link Sunday night. Email later if he wants an inbox copy.

Cost: two sessions once steps 0–2 exist; it is assembled from them.

## 5 · A ranker, not a brake

Today the learning loop only *suppresses* generators he keeps rejecting.
With opens, Sets, reasons and his own work as signal, build a taste score:
distance in embedding space to his yeses (weighted by return) minus
distance to his nos (weighted by reason). Rank every incoming ref, every
proposal, every zine candidate by it. This is the point where "learns my
judgment" starts ordering what he sees.

Cost: one session. Needs a few hundred decisions in the log first.

## Not doing

- **Fine-tuning a model.** At ~1,500 refs and a few hundred swipes it buys
  nothing the ranker doesn't, and it costs real money. Revisit past several
  thousand decisions.
- **Replacing Notes offline.** `/drop` needs a connection. The Shortcut can
  queue a capture until it has one; that is enough.
- **Anything that writes to Dropbox.** Read only, ever, and only a folder
  he names.
