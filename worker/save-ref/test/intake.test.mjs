// Intake tests for the Big Brain capture-only redesign — plain Node, no
// wrangler, no network, no live AI/KV/Notion. Mocks env.AI, env.REFS_KV
// and global fetch the same way test/worker.test.mjs mocks KV.
// Target home: worker/save-ref/test/intake.test.mjs
// Run: node test/intake.test.mjs   (also wired into package.json "test")
// Local draft run: see ../run-intake-tests.sh in the draft-code folder,
// which stages these files beside the repo's real categorize.js first.
import { gate, describeRef } from "../src/describe.js";
import { BIG_BRAIN_TAGS, applyThreshold, classifyRef, scoreTags } from "../src/taxonomy.js";
import { normalizeUrl, sha256Hex, findDuplicate, writeIndexes, deleteIndexes } from "../src/dedupe.js";
import { notionConfigured, notionProperties, syncRefToNotion } from "../src/notion-sync.js";
import { enrichRef } from "../src/enrich.js";

let pass = 0, fail = 0;
function ok(label, cond) { cond ? pass++ : (fail++, console.error("✗ " + label)); }
function eq(label, got, want) { ok(label + ` (got ${JSON.stringify(got)})`, got === want); }

// Map-backed KV, same shape as test/worker.test.mjs
function makeKV() {
  const store = new Map();
  return {
    async get(name, type) {
      const e = store.get(name);
      if (!e) return null;
      if (type === "json") return JSON.parse(e.value);
      return e.value;
    },
    async put(name, value) { store.set(name, { value }); },
    async delete(name) { store.delete(name); },
    _store: store,
  };
}

const goodJson = JSON.stringify({
  look: "Green velvet armchair with worn wooden arms in a bare room",
  subjects: ["velvet armchair"],
  materials: ["velvet", "wood"],
});

const run = async () => {
  // ============ describe.js — schema gate ============
  const g = gate(goodJson);
  ok("gate accepts clean JSON", g !== null);
  eq("gate look passes through", g.look, "Green velvet armchair with worn wooden arms in a bare room");
  eq("gate subjects cleaned", g.subjects.join(","), "velvet armchair");
  ok("gate accepts fenced JSON", gate("```json\n" + goodJson + "\n```") !== null);
  ok("gate accepts JSON embedded in prose", gate("Here is the result: " + goodJson) !== null);
  eq("gate rejects pure prose", gate("A lovely green chair, very nice."), null);
  eq("gate rejects non-string", gate(42), null);
  eq("gate rejects model abstention shape", gate('{"look":"","subjects":[],"materials":[]}'), null);
  eq("gate rejects look with no subjects", gate('{"look":"A perfectly good long look","subjects":[],"materials":[]}'), null);
  eq("gate rejects too-short look", gate('{"look":"Chair.","subjects":["chair"],"materials":[]}'), null);
  eq("gate rejects broken JSON", gate('{"look": "unterminated'), null);
  const longLook = gate(JSON.stringify({ look: "x".repeat(300) + " chair", subjects: ["chair"], materials: [] }));
  eq("gate truncates look to 140", longLook.look.length, 140);
  const messy = gate(JSON.stringify({ look: "Brass   floor lamp beside a window", subjects: ["Floor Lamp", "floor lamp", 7, ""], materials: ["BRASS"] }));
  eq("gate dedupes+lowercases subjects", messy.subjects.join(","), "floor lamp");
  eq("gate lowercases materials", messy.materials.join(","), "brass");

  // ============ describe.js — describeRef with mocked AI ============
  const png = new Uint8Array([137, 80, 78, 71]);
  const aiEnv = { AI: { run: async () => ({ response: goodJson }) } };
  const d1 = await describeRef(aiEnv, { imageBytes: png });
  ok("describeRef returns gated object from blob bytes", d1 !== null && d1.subjects[0] === "velvet armchair");
  eq("describeRef: no AI binding -> null", await describeRef({}, { imageBytes: png }), null);
  eq("describeRef: AI throws -> null", await describeRef({ AI: { run: async () => { throw new Error("boom"); } } }, { imageBytes: png }), null);
  eq("describeRef: AI returns prose -> null", await describeRef({ AI: { run: async () => ({ response: "a chair" }) } }, { imageBytes: png }), null);
  eq("describeRef: no image at all -> null", await describeRef(aiEnv, { caption: "a chair" }), null);
  eq("describeRef: empty bytes -> null", await describeRef(aiEnv, { imageBytes: new Uint8Array(0) }), null);
  const big = new Uint8Array(4 * 1024 * 1024 + 1);
  eq("describeRef: oversized image -> null", await describeRef(aiEnv, { imageBytes: big }), null);
  // model override via env var is honoured
  let seenModel = null;
  await describeRef({ DESCRIBE_MODEL: "@cf/test/model", AI: { run: async (m) => { seenModel = m; return { response: goodJson }; } } }, { imageBytes: png });
  eq("describeRef honours DESCRIBE_MODEL override", seenModel, "@cf/test/model");
  // og:image fetch path: non-image content-type -> abstain
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("<html>bot wall</html>", { headers: { "content-type": "text/html" } });
  eq("describeRef: og:image bot wall -> null", await describeRef(aiEnv, { imageUrl: "https://img.test/x.png" }), null);
  globalThis.fetch = async () => new Response(png, { headers: { "content-type": "image/png" } });
  ok("describeRef: og:image bytes path works", (await describeRef(aiEnv, { imageUrl: "https://img.test/x.png" })) !== null);
  globalThis.fetch = realFetch;

  // ============ taxonomy.js — confidence bar / needs_review ============
  eq("16 tags in taxonomy", BIG_BRAIN_TAGS.length, 16);
  let v = applyThreshold({ Furniture: 0.93 });
  eq("single tag >= 0.70 -> ready", v.status, "ready");
  eq("accepted tag", v.accepted.join(","), "Furniture");
  v = applyThreshold({ Furniture: 0.7 });
  eq("exactly 0.70 clears the bar", v.status, "ready");
  v = applyThreshold({ Furniture: 0.69, Set: 0.4 });
  eq("all below 0.70 -> needs_review", v.status, "needs_review");
  eq("below-bar reason", v.reason, "below_threshold");
  eq("below-bar accepts nothing", v.accepted.length, 0);
  ok("below-bar keeps scores for audit", v.scores.length === 2);
  v = applyThreshold({ Kinetic: 0.93, Lighting: 0.92 });
  eq("top-two within 0.05 -> needs_review (strict ambiguity rule)", v.status, "needs_review");
  eq("ambiguous reason", v.reason, "ambiguous");
  eq("ambiguous accepts nothing", v.accepted.length, 0);
  v = applyThreshold({ Tech: 0.9, Set: 0.8, Furniture: 0.75, Food: 0.71 });
  eq("max 3 tags accepted", v.accepted.length, 3);
  v = applyThreshold({ NotATag: 0.99, Tech: 0.8 });
  eq("unknown tags dropped", v.accepted.join(","), "Tech");
  v = applyThreshold({ Tech: 1.7 });
  eq("confidence clamped to 1", v.scores[0].confidence, 1);
  eq("empty scores -> needs_review", applyThreshold({}).status, "needs_review");
  eq("Off-topic never auto-scores", scoreTags({ look: "random unrelated thing", subjects: ["random thing"], materials: [] })["Off-topic"], undefined);

  v = classifyRef({ look: "Green velvet armchair in a bare room", subjects: ["velvet armchair"], materials: ["velvet"] });
  eq("armchair -> ready", v.status, "ready");
  eq("armchair top tag Furniture", v.accepted[0], "Furniture");
  ok("armchair also gets Material (velvet)", v.accepted.includes("Material"));
  v = classifyRef({ look: "Server rack with blinking lights", subjects: ["server rack"], materials: [] });
  eq("server rack -> Tech ready", v.status + ":" + v.accepted[0], "ready:Tech");
  v = classifyRef({ look: "A blurry indistinct shape", subjects: ["shape"], materials: [] });
  eq("unrecognisable subject -> needs_review", v.status, "needs_review");
  eq("null describe output -> needs_review", classifyRef(null).status, "needs_review");

  // ============ dedupe.js — URL normalisation ============
  eq("utm + fbclid stripped", normalizeUrl("https://example.com/a?utm_source=x&fbclid=y&b=1"), "https://example.com/a?b=1");
  eq("www stripped", normalizeUrl("https://www.example.com/a"), "https://example.com/a");
  eq("fragment dropped", normalizeUrl("https://example.com/a#frag"), "https://example.com/a");
  eq("trailing slash collapsed", normalizeUrl("https://example.com/a/b/"), "https://example.com/a/b");
  eq("root slash kept", normalizeUrl("https://example.com/"), "https://example.com/");
  eq("params sorted", normalizeUrl("https://example.com/a?z=1&a=2"), "https://example.com/a?a=2&z=1");
  eq("path case preserved", normalizeUrl("https://example.com/AbC"), "https://example.com/AbC");
  eq("host lowercased", normalizeUrl("https://EXAMPLE.com/a"), "https://example.com/a");
  eq("bare domain gets scheme", normalizeUrl("example.com/a?utm_medium=x"), "https://example.com/a");
  eq("non-URL -> null", normalizeUrl("not a url at all ::"), null);
  eq("tracking variants normalise equal",
    normalizeUrl("https://www.shop.com/item/?utm_campaign=z&id=9#x"),
    normalizeUrl("https://shop.com/item?id=9"));

  // ============ dedupe.js — hashes + KV indexes ============
  eq("sha256('abc') known vector", await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  eq("sha256('') known vector", await sha256Hex(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  eq("sha256 bytes == sha256 string bytes", await sha256Hex(new TextEncoder().encode("abc")), await sha256Hex("abc"));

  const kv = makeKV();
  const env = { REFS_KV: kv };
  const refA = { id: "id-a", urlNorm: normalizeUrl("https://shop.com/item?id=9"), contentHash: await sha256Hex(png) };
  eq("no dupe before write", await findDuplicate(env, { urlNorm: refA.urlNorm }), null);
  await kv.put("ref:id-a", JSON.stringify(refA));
  await writeIndexes(env, refA);
  const dupUrl = await findDuplicate(env, { urlNorm: normalizeUrl("https://www.shop.com/item/?utm_source=z&id=9") });
  eq("URL-normalised dupe found", dupUrl?.id, "id-a");
  eq("URL dupe via=url", dupUrl?.via, "url");
  const dupHash = await findDuplicate(env, { contentHash: await sha256Hex(new Uint8Array([137, 80, 78, 71])) });
  eq("hash dupe found for same bytes", dupHash?.id, "id-a");
  eq("hash dupe via=hash", dupHash?.via, "hash");
  eq("different bytes -> no dupe", await findDuplicate(env, { contentHash: await sha256Hex(new Uint8Array([1, 2])) }), null);
  eq("null keys -> no dupe", await findDuplicate(env, {}), null);
  await deleteIndexes(env, refA);
  eq("deleteIndexes frees the URL", await findDuplicate(env, { urlNorm: refA.urlNorm }), null);
  eq("deleteIndexes frees the hash", await findDuplicate(env, { contentHash: refA.contentHash }), null);

  // ============ notion-sync.js ============
  eq("not configured without key", notionConfigured({ BB_NOTION_DB_ID: "a".repeat(32) }), false);
  eq("not configured with placeholder db id", notionConfigured({ NOTION_API_KEY: "x", BB_NOTION_DB_ID: "<Big Brain database id>" }), false);
  eq("configured with key + 32-hex db id", notionConfigured({ NOTION_API_KEY: "x", BB_NOTION_DB_ID: "a".repeat(32) }), true);
  const props = notionProperties({ title: "Chair", look: "A chair", bbTags: ["Furniture"], url: "https://x.io", host: "x.io", category: "image", status: "needs_review" });
  eq("notion Name <- title", props.Name.title[0].text.content, "Chair");
  eq("notion Look <- look", props.Look.rich_text[0].text.content, "A chair");
  eq("notion Tags <- bbTags", props.Tags.multi_select[0].name, "Furniture");
  eq("notion URL <- url", props.URL.url, "https://x.io");
  eq("notion Needs review <- status", props["Needs review"].checkbox, true);
  const minProps = notionProperties({ title: "Chair" }, { minimal: true });
  ok("minimal payload drops Needs review + Type", !("Needs review" in minProps) && !("Type" in minProps));

  const notionCalls = [];
  globalThis.fetch = async (url, opts) => {
    notionCalls.push({ url, opts });
    return new Response(JSON.stringify({ id: "page-123" }), { headers: { "content-type": "application/json" } });
  };
  const notionEnv = { NOTION_API_KEY: "test-key", BB_NOTION_DB_ID: "a".repeat(32) };
  eq("sync creates page, returns id", await syncRefToNotion(notionEnv, { title: "Chair", status: "ready" }), "page-123");
  ok("create posts to /pages with db parent", notionCalls[0].url.endsWith("/v1/pages") && JSON.parse(notionCalls[0].opts.body).parent.database_id === "a".repeat(32));
  notionCalls.length = 0;
  await syncRefToNotion(notionEnv, { title: "Chair", notionPageId: "page-9", status: "ready" });
  ok("existing notionPageId -> PATCH, not create", notionCalls[0].opts.method === "PATCH" && notionCalls[0].url.endsWith("/pages/page-9"));
  globalThis.fetch = async () => new Response(JSON.stringify({ object: "error", code: "validation_error" }), { status: 400 });
  eq("sync 400-then-minimal-also-400 -> null, no throw", await syncRefToNotion(notionEnv, { title: "Chair" }), null);
  globalThis.fetch = async () => { throw new Error("network down"); };
  eq("sync network failure -> null, no throw", await syncRefToNotion(notionEnv, { title: "Chair" }), null);
  eq("sync unconfigured -> null", await syncRefToNotion({}, { title: "Chair" }), null);
  globalThis.fetch = realFetch;

  // ============ enrich.js — end to end with mocked AI + KV ============
  const kv2 = makeKV();
  const base = { id: "r1", kind: "blob", title: "shot.png", desc: "", tags: ["upload"], look: "", bbTags: [], tagScores: [], status: "needs_review" };
  await kv2.put("ref:r1", JSON.stringify(base));
  const enriched = await enrichRef({ REFS_KV: kv2, AI: aiEnv.AI }, "r1", { imageBytes: png });
  eq("enrich sets look", enriched.look, "Green velvet armchair with worn wooden arms in a bare room");
  eq("enrich flips status ready", enriched.status, "ready");
  eq("enrich bbTags top = Furniture", enriched.bbTags[0], "Furniture");
  ok("enrich keeps tagScores audit trail", enriched.tagScores.length >= 2);
  const stored = await kv2.get("ref:r1", "json");
  eq("enrich persisted to KV", stored.status, "ready");

  await kv2.put("ref:r2", JSON.stringify({ ...base, id: "r2" }));
  const failed = await enrichRef({ REFS_KV: kv2, AI: { run: async () => { throw new Error("ai down"); } } }, "r2", { imageBytes: png });
  eq("AI failure -> ref stays needs_review", failed.status, "needs_review");
  eq("AI failure -> look stays empty, not garbage", failed.look, "");

  await kv2.put("ref:r3", JSON.stringify({ ...base, id: "r3", kind: "note" }));
  const human = await enrichRef({ REFS_KV: kv2 }, "r3", { humanTagged: true });
  eq("human-tagged with no AI -> ready on curation basis", human.status, "ready");
  eq("human-tagged invents no bbTags", human.bbTags.length, 0);

  eq("enrich of deleted ref -> null", await enrichRef({ REFS_KV: kv2, AI: aiEnv.AI }, "ghost", { imageBytes: png }), null);
  // a human PATCH landing during enrichment is not overwritten
  await kv2.put("ref:r4", JSON.stringify({ ...base, id: "r4" }));
  const slowEnv = { REFS_KV: kv2, AI: { run: async () => { const r = await kv2.get("ref:r4", "json"); r.tags = ["human", "pick"]; await kv2.put("ref:r4", JSON.stringify(r)); return { response: goodJson }; } } };
  const r4 = await enrichRef(slowEnv, "r4", { imageBytes: png });
  eq("enrich preserves tags PATCHed mid-flight", r4.tags.join(","), "human,pick");

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
