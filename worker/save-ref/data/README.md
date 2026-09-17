# data/

## `set-dec-tagging-v1.json`

The controlled vocabulary an image auto-tagger tags against, in working
set-decoration language. Produced by a second agent (GPT-6 Astra) against the
brief in `../HANDOFF.md` Part 2b, Task 1, and validated here.

`build-set-dec-tagging.py` is the generator it wrote. It is kept for
provenance and for regenerating the JSON; it writes to a path on Rader's Mac,
so change `ROOT` before re-running it.

### What's in it

| Key | What it is |
|---|---|
| `facets` | 504 terms across object / material / era / color / finish / style / use |
| `facet_rules` | per-facet guidance, mostly about what NOT to claim |
| `vision_prompt` | the runtime prompt, with `{{FACETS_JSON}}` / `{{FACET_RULES_JSON}}` placeholders the host substitutes |
| `eval_protocol` | output limits, schema gate, scoring, canonicalisation notes |
| `eval_cases` | 25 specifications: an `image_brief` plus required / optional / forbidden tags |

### Validation (run on import)

- 25/25 eval cases internally consistent
- every case tag is in its own facet's vocabulary
- no required/optional/forbidden overlap; no required set exceeds `output_limits`
- no `must_be_empty` facet contradicts its own required/optional tags
- one deliberate cross-facet term, `terracotta` (material *and* colour), called
  out in `eval_protocol.flat_tags`

Facet sizes deviate from the 40–80 brief in three places, each correctly:
`object` is 219 (objects need the coverage), `era` is 19 (there are only so
many periods), `use` is 27 (a small closed set of roles).

21 of 25 cases assert **abstention** — that a tag must NOT appear. That's the
right emphasis: the expensive failure here isn't a missing tag, it's a model
confidently writing "walnut" on a photo that cannot establish species, and that
claim then reaching a client.

### Integrating it — decisions already made for us

1. **The eval cases are specifications, not fixtures.** There are no images
   yet. Nothing here measures real accuracy until someone shoots or sources 24
   images against the briefs, and a decorator adjusts the expected tags to what
   is actually visible in them.
2. **Store facets separately from `tags`.** A ref's `tags` is a flat array; a
   flat union loses the distinction between `rust` (colour) and `rusted`
   (finish), and between the two `terracotta`s. Put machine output in its own
   `facets` object on the ref, derive a flat union for search, and never
   overwrite user-entered tags on a re-tag.
3. **Never send this whole file to the tagging model** — only the substituted
   `vision_prompt`, the image, and any explicitly trusted metadata. The eval
   answers must not travel with the request.
4. **Cache the prompt.** The substituted vocabulary is ~500 terms on every
   image; without prompt caching that's the dominant per-image cost.
