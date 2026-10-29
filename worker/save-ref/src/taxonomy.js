/**
 * READY-TO-APPLY DRAFT — local only. Not pushed, not deployed.
 * Target home: worker/save-ref/src/taxonomy.js
 *
 * Maps describe.js output ({ look, subjects[], materials[] }) onto the 16
 * Big Brain tags, with a per-tag confidence for every tag it considers.
 *
 * Where the confidences come from: describe.js's contract carries NO model
 * tag proposals (its schema is look/subjects/materials only), so the scores
 * here are deterministic rule scores — the same word hit always scores the
 * same. Pure functions, no I/O: unit-tests with plain node, like
 * categorize.js. (If describe.js later grows model tag proposals, feed them
 * in as one more rule source; the threshold logic below does not change.)
 *
 * The decision rule (applyThreshold):
 *   accept a tag at confidence >= 0.70, at most 3 tags;
 *   AMBIGUITY: if the top two tags are within 0.05 of each other, accept
 *   NOTHING and report needs_review — a coin-flip tag is worse than none.
 *   (As tasked, this has no "both very high" escape hatch; the redesign
 *   draft's version only flagged ambiguity when both were < 0.85. The
 *   stricter rule is implemented here — see INTEGRATION-NOTES.md.)
 *   No tag >= 0.70 also means needs_review.
 *
 * "Off-topic" deliberately has NO rules: a vision description of a design
 * reference can never establish that something is off-topic, and text/news
 * refs never pass through describe.js at all. Off-topic stays human/rule
 * territory, exactly as it works today.
 */

export const BIG_BRAIN_TAGS = [
  "Lighting", "Kinetic", "Projection", "Material", "Fabrication",
  "Set", "Furniture", "Sculpture", "Signage", "Fashion",
  "Architecture", "Nature", "Tech", "Food", "Performance", "Off-topic",
];

export const ACCEPT_THRESHOLD = 0.7;
export const MAX_TAGS = 3;
export const AMBIGUITY_WINDOW = 0.05;

/**
 * Rule table: [pattern, tag, subjectWeight].
 * A hit inside `subjects` scores subjectWeight (the model's own noun for
 * the thing — strongest signal). A hit inside `look` scores 0.12 less.
 * A hit inside `materials` only counts for rules whose pattern is a
 * material/finish word, marked by placing them in MATERIAL_RULES below,
 * and scores its listed weight as-is.
 */
const SUBJECT_RULES = [
  // Lighting
  [/\b(lamp|lampshade|chandelier|sconce|lantern|light fixture|floor lamp|table lamp|desk lamp|pendant light|bulb|neon light|led strip|string lights|spotlight)\b/, "Lighting", 0.92],
  [/\b(candle|candles|candelabra|torch lamp)\b/, "Lighting", 0.82],
  // Kinetic
  [/\b(mobile sculpture|windmill|water wheel|hamster wheel|rotating|spinning|moving sculpture|pendulum|carousel|merry-go-round|ferris wheel)\b/i, "Kinetic", 0.9],
  [/\b(wheel|fan blade|propeller|turntable|revolving)\b/, "Kinetic", 0.74],
  // Projection
  [/\b(projector|projection|projected image|hologram|screen projection)\b/, "Projection", 0.9],
  [/\b(television|tv screen|monitor|video screen|CRT)\b/i, "Projection", 0.72],
  // Fabrication
  [/\b(workbench|tool chest|welding|lathe|workshop|machine tools|vise|anvil|sawhorse)\b/, "Fabrication", 0.86],
  [/\b(scaffold|scaffolding|ladder|crane|forklift)\b/, "Fabrication", 0.74],
  // Set
  [/\b(stage set|film set|theatre set|theater set|backdrop|stage backdrop|room set|interior set)\b/, "Set", 0.9],
  [/\b(stage|theatre stage|theater stage)\b/, "Set", 0.72],
  // Furniture
  [/\b(armchair|sofa|couch|chair|stool|bench|table|desk|bed|mattress|bookshelf|shelf|shelving|cabinet|dresser|wardrobe|sideboard|credenza|daybed|chaise|ottoman|throne)\b/, "Furniture", 0.93],
  [/\b(rug|carpet|curtain|drape|drapery)\b/, "Furniture", 0.74],
  // Sculpture
  [/\b(sculpture|statue|bust|figurine|installation art|art installation|mannequin)\b/, "Sculpture", 0.9],
  [/\b(fountain)\b/, "Sculpture", 0.78],
  // Signage
  [/\b(sign|signage|letter sign|marquee|billboard|poster|banner|neon sign)\b/, "Signage", 0.9],
  // Fashion
  [/\b(dress|gown|suit|jacket|coat|hat|shoe|shoes|boot|boots|handbag|garment|outfit|clothing|jewellery|jewelry)\b/, "Fashion", 0.88],
  [/\b(sewing machine|dress form|tailor)\b/, "Fashion", 0.74],
  // Architecture
  [/\b(building|house|facade|staircase|stairway|arch|archway|column|columns|bridge|tower|church|barn|greenhouse|structure)\b/, "Architecture", 0.86],
  [/\b(door|window|gate|fence)\b/, "Architecture", 0.7],
  // Nature
  [/\b(tree|trees|plant|plants|garden|forest|leaves|flowers|landscape|mountain|river|lake|ocean|rock formation)\b/, "Nature", 0.86],
  [/\b(animal|dog|horse|bird|deer|fish)\b/, "Nature", 0.72],
  // Tech
  [/\b(server|server rack|computer|circuit|circuit board|robot|machine|engine|motor|radio|telephone|phone booth|camera|speaker|amplifier|reel-to-reel|typewriter)\b/, "Tech", 0.88],
  [/\b(cable|cables|wire|wires|pipe|pipes|duct|vent)\b/, "Tech", 0.7],
  // Food
  [/\b(food|meal|dish|plate of|bowl of|cake|bread|fruit|vegetables|table setting|banquet|feast)\b/, "Food", 0.84],
  [/\b(kitchen|stove|oven|refrigerator|dining table)\b/, "Food", 0.7],
  // Performance
  [/\b(performer|dancer|musician|singer|actor|performance|concert|band performing|stage performance|puppet)\b/, "Performance", 0.86],
  [/\b(microphone|guitar|drum kit|piano|instrument)\b/, "Performance", 0.72],
  // Material as a SUBJECT (an image OF a material) — material words in
  // `materials` are handled separately below at survey weight.
  [/\b(texture|material sample|swatch|pile of|stack of|surface detail)\b/, "Material", 0.78],
];

const MATERIAL_RULES = [
  [/\b(neon)\b/, "Lighting", 0.72],
  [/\b(neon|painted metal)\b/, "Signage", 0.7],
  [/\b(mirror|mirrored|chrome|polished metal|brass|copper|steel|iron)\b/, "Material", 0.74],
  [/\b(marble|stone|concrete|brick|terracotta|ceramic)\b/, "Material", 0.74],
  [/\b(velvet|leather|linen|silk|fabric|upholstery|wood|oak|walnut|pine|rattan|wicker|glass|acrylic|plastic)\b/, "Material", 0.7],
];

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Score every tag the rules can see in a describe.js result.
 * @param {{look?:string, subjects?:string[], materials?:string[]}} described
 * @returns {Object<string, number>} tag -> confidence (only tags with a hit)
 */
export function scoreTags(described = {}) {
  const scores = new Map(); // tag -> { best, hits }
  const bump = (tag, w) => {
    const cur = scores.get(tag) || { best: 0, hits: 0 };
    cur.best = Math.max(cur.best, w);
    cur.hits += 1;
    scores.set(tag, cur);
  };

  const subjects = Array.isArray(described.subjects) ? described.subjects.join(" · ") : "";
  const look = typeof described.look === "string" ? described.look : "";
  const materials = Array.isArray(described.materials) ? described.materials.join(" · ") : "";

  for (const [re, tag, w] of SUBJECT_RULES) {
    if (re.test(subjects)) bump(tag, w);
    else if (re.test(look)) bump(tag, w - 0.12);
  }
  for (const [re, tag, w] of MATERIAL_RULES) {
    if (re.test(materials)) bump(tag, w);
  }

  const out = {};
  for (const [tag, { best, hits }] of scores) {
    // Repeated independent hits on one tag are weak extra evidence.
    out[tag] = round2(Math.min(0.97, best + 0.03 * (hits - 1)));
  }
  return out;
}

/**
 * The threshold + ambiguity decision, on any tag->confidence map.
 * Exported separately so the decision rule unit-tests without the rules.
 * @param {Object<string, number>} confidences
 * @returns {{accepted: string[],
 *            scores: {tag: string, confidence: number}[],
 *            status: "ready"|"needs_review",
 *            reason: "accepted"|"below_threshold"|"ambiguous"}}
 */
export function applyThreshold(confidences = {}) {
  const scores = Object.entries(confidences)
    .filter(([tag, c]) => BIG_BRAIN_TAGS.includes(tag) && typeof c === "number" && c > 0)
    .map(([tag, c]) => ({ tag, confidence: round2(Math.min(1, Math.max(0, c))) }))
    .sort((a, b) => b.confidence - a.confidence);

  const eligible = scores.filter((s) => s.confidence >= ACCEPT_THRESHOLD);
  if (eligible.length === 0) {
    return { accepted: [], scores, status: "needs_review", reason: "below_threshold" };
  }
  if (
    eligible.length >= 2 &&
    eligible[0].confidence - eligible[1].confidence <= AMBIGUITY_WINDOW
  ) {
    return { accepted: [], scores, status: "needs_review", reason: "ambiguous" };
  }
  return {
    accepted: eligible.slice(0, MAX_TAGS).map((s) => s.tag),
    scores,
    status: "ready",
    reason: "accepted",
  };
}

/**
 * Convenience: describe.js output -> full decision in one call.
 * @returns {{accepted: string[], scores: {tag:string, confidence:number}[],
 *            status: "ready"|"needs_review", reason: string}}
 */
export function classifyRef(described) {
  return applyThreshold(scoreTags(described || {}));
}
