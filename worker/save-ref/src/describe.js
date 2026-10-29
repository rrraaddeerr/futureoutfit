/**
 * READY-TO-APPLY DRAFT — local only. Not pushed, not deployed.
 * Target home: worker/save-ref/src/describe.js (beside og.js / categorize.js)
 *
 * Image-first description for a ref, via Cloudflare Workers AI vision.
 *
 * describeRef() looks at the IMAGE ITSELF (uploaded blob bytes first, then
 * the ref's og:image fetched as bytes) — never at page marketing copy. The
 * caption / OG text goes in only as context for the model, never as the
 * description. Output is strict JSON, run through a schema gate before
 * anything may store it:
 *
 *   { look: string, subjects: string[], materials: string[] }
 *
 * ANY failure — no AI binding, model error, timeout, oversized image,
 * malformed JSON, schema violation — returns null. Null means "model said
 * nothing" and the caller leaves the ref status:"needs_review". Garbage
 * text is never returned, so it can never be stored.
 *
 * Tagging is NOT this file's job: taxonomy.js maps this output onto the
 * 16 Big Brain tags.
 */

// Pin at implementation time from the current Workers AI catalogue. A small
// vision-instruct model is the right class for "describe this chair".
// Drafted against the llava-style call shape:
//   env.AI.run(model, { image: [...bytes], prompt, max_tokens })
//     -> { response: string }
// Llama-vision-instruct class models take the same { response } envelope
// but a messages-style input — if that model class is picked instead, only
// callVision() below changes.
const MODEL = "@cf/llava-hf/llava-1.5-7b-hf"; // TODO(pin): confirm at build time
const MAX_TOKENS = 350;
const FETCH_TIMEOUT_MS = 6000; // same budget as og.js fetchMeta()
// Vision models reject multi-MB inputs and this Worker has no image
// resizing. Over the cap we abstain (null) rather than fail weirdly —
// see INTEGRATION-NOTES.md, mismatch 5.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const LOOK_MAX = 140;

const PROMPT = [
  "You are describing one saved reference image for a set designer's library.",
  "Look at the image itself. Ignore any brand names, page titles, or marketing text.",
  "Reply with ONLY a JSON object, no prose, no code fences, in exactly this shape:",
  '{"look": "...", "subjects": ["..."], "materials": ["..."]}',
  "look: one factual line, at most 140 characters, saying what the image SHOWS,",
  "in set-design language (object, form, condition, setting). Not a caption,",
  "not an opinion, no hype words.",
  "subjects: 1 to 6 short lowercase noun phrases for the main things pictured",
  '(e.g. "velvet armchair", "server rack", "neon sign").',
  "materials: up to 6 short lowercase material/finish words actually visible",
  '(e.g. "chrome", "oak", "marble", "glass"). Empty array if none are clear.',
  "If you cannot tell what the image shows, reply exactly:",
  '{"look": "", "subjects": [], "materials": []}',
].join("\n");

/**
 * Describe a ref from its image.
 * @param {object} env - Worker env; needs env.AI (Workers AI binding)
 * @param {object} input
 * @param {ArrayBuffer|Uint8Array} [input.imageBytes] - uploaded blob bytes (preferred)
 * @param {string} [input.imageUrl]  - og:image URL to fetch as bytes (fallback)
 * @param {string} [input.caption]   - share text / OG description — context only
 * @param {string} [input.title]     - existing title — context only
 * @returns {Promise<{look:string, subjects:string[], materials:string[]}|null>}
 */
export async function describeRef(env, input = {}) {
  try {
    if (!env?.AI?.run) return null;

    const bytes = await resolveImageBytes(input);
    if (!bytes) return null; // no image we may look at (note/text refs, dead og:image)

    const context = buildContext(input);
    const raw = await callVision(env, bytes, context);
    if (typeof raw !== "string") return null;

    return gate(raw);
  } catch {
    return null; // abstention over invention — caller flags needs_review
  }
}

/** Blob bytes win; otherwise fetch the og:image URL as bytes (image/* only). */
async function resolveImageBytes({ imageBytes, imageUrl }) {
  if (imageBytes) {
    const b = imageBytes instanceof Uint8Array ? imageBytes : new Uint8Array(imageBytes);
    return b.byteLength > 0 && b.byteLength <= MAX_IMAGE_BYTES ? b : null;
  }
  if (typeof imageUrl !== "string" || !imageUrl) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(imageUrl, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BigBrainBot/1.0; +https://bigbrain.ref)",
        Accept: "image/*",
      },
    });
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!res.ok || !ct.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX_IMAGE_BYTES) return null;
    return new Uint8Array(buf);
  } catch {
    return null; // hotlink protection / bot wall (Instagram og:image, often)
  } finally {
    clearTimeout(timer);
  }
}

function buildContext({ caption, title }) {
  const bits = [];
  if (title) bits.push(`Saved with title: ${String(title).slice(0, 200)}`);
  if (caption) bits.push(`Caption/context (may be wrong — trust the image): ${String(caption).slice(0, 400)}`);
  return bits.join("\n");
}

async function callVision(env, bytes, context) {
  const prompt = context ? `${PROMPT}\n\n${context}` : PROMPT;
  // env.DESCRIBE_MODEL (a wrangler [vars] entry) overrides the pinned
  // default without a code edit. NOTE: the override must be a model with
  // the same llava-style { image: [...bytes], prompt } input shape; a
  // messages-style vision model (e.g. llama-3.2-vision-instruct) needs
  // this call reshaped first — that is a code change, not just a var.
  const model =
    typeof env.DESCRIBE_MODEL === "string" && env.DESCRIBE_MODEL ? env.DESCRIBE_MODEL : MODEL;
  const result = await env.AI.run(model, {
    // llava-class models take the image as a plain byte array.
    image: [...bytes],
    prompt,
    max_tokens: MAX_TOKENS,
  });
  if (typeof result === "string") return result;
  const raw = result?.response ?? result?.result ?? null;
  return typeof raw === "string" ? raw : null;
}

/**
 * The schema gate. Anything off-contract -> null, never a repaired guess.
 * Exported for unit tests (plain node, mocked strings — no AI needed).
 */
export function gate(raw) {
  if (typeof raw !== "string") return null;
  let text = raw.trim();
  // Models love code fences despite instructions; unwrapping the fence is
  // presentation, not content repair, so it is allowed. Nothing else is.
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) text = fence[1].trim();
  // Tolerate a JSON object embedded in stray prose by slicing to the braces —
  // the parsed object still has to pass every check below.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last <= first) return null;
  let obj;
  try {
    obj = JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;

  if (typeof obj.look !== "string") return null;
  const look = obj.look.replace(/\s+/g, " ").trim().slice(0, LOOK_MAX);
  const subjects = cleanList(obj.subjects, 6);
  const materials = cleanList(obj.materials, 6);
  // The model's own abstention shape, and near-misses of it, both mean null.
  if (!look || look.length < 8 || subjects.length === 0) return null;
  return { look, subjects, materials };
}

function cleanList(value, cap) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const v of value) {
    if (typeof v !== "string") continue;
    const s = v.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 40);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

export { MODEL as DESCRIBE_MODEL, MAX_IMAGE_BYTES };
