#!/usr/bin/env node
/**
 * Generates the Big Brain app icons as real PNGs, with no dependencies.
 *
 *   node scripts/make-icons.mjs
 *
 * Writes src/icons.js, which exports base64 PNG bytes the Worker serves at
 * /icon-192.png, /icon-512.png and /icon-maskable.png. They're committed, so
 * this only needs re-running when the artwork changes.
 *
 * The mark: a dark rounded square with a blue node-graph "brain" — five nodes
 * joined by synapses, drawn with signed-distance fields and 4x supersampling
 * so the curves stay clean at 192px.
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// ---------------------------------------------------------------- PNG writer

function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** rgba: Uint8ClampedArray of size w*h*4 -> PNG buffer (8-bit RGBA, filter 0) */
function encodePng(rgba, w, h) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ geometry
// All shapes are signed distance functions in a 0..1 unit square, so one
// description renders at any size.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => a + (b - a) * t;

function sdRoundedBox(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(qx, 0),
    ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax,
    vy = by - ay;
  const wx = px - ax,
    wy = py - ay;
  const t = clamp01((wx * vx + wy * vy) / (vx * vx + vy * vy));
  return Math.hypot(wx - vx * t, wy - vy * t);
}

// The node graph. Positions are in the unit square, chosen to read as a brain
// silhouette: a tall cluster leaning right, with one stem node low-left.
const NODES = [
  { x: 0.33, y: 0.3, r: 0.072 },
  { x: 0.66, y: 0.24, r: 0.056 },
  { x: 0.74, y: 0.53, r: 0.068 },
  { x: 0.28, y: 0.58, r: 0.05 },
  { x: 0.5, y: 0.76, r: 0.062 },
];
const EDGES = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [2, 4],
  [3, 4],
];

const BG_TOP = [0x18, 0x1e, 0x2b];
const BG_BOT = [0x0b, 0x0e, 0x14];
const BLUE = [0x3b, 0x82, 0xf6];
const BLUE_LIT = [0x93, 0xc5, 0xfd];

/**
 * @param size    output pixels
 * @param maskable  true => full-bleed background (Android safe-zone crops it),
 *                  so the glyph is drawn smaller and the square corners stay.
 */
function render(size, maskable) {
  const SS = 4; // supersampling factor
  const out = new Uint8ClampedArray(size * size * 4);
  // Glyph inset: maskable icons get cropped to a circle of 80% width, so pull
  // the artwork in to survive it.
  const scale = maskable ? 0.74 : 1;
  const edgeW = 0.018 * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const px = (u - 0.5) / scale + 0.5;
          const py = (v - 0.5) / scale + 0.5;

          // --- background plate ---
          const plate = maskable
            ? -1 // full bleed
            : sdRoundedBox(u, v, 0.5, 0.5, 0.5, 0.5, 0.235);
          const plateA = clamp01(0.5 - plate * size); // ~1px antialiased edge
          const bg = [
            mix(BG_TOP[0], BG_BOT[0], v),
            mix(BG_TOP[1], BG_BOT[1], v),
            mix(BG_TOP[2], BG_BOT[2], v),
          ];

          let cr = bg[0],
            cg = bg[1],
            cb = bg[2];

          // --- synapses ---
          let edge = Infinity;
          for (const [i, j] of EDGES) {
            edge = Math.min(
              edge,
              sdSegment(px, py, NODES[i].x, NODES[i].y, NODES[j].x, NODES[j].y) - edgeW,
            );
          }
          const edgeA = clamp01(0.5 - edge * size * scale) * 0.85;
          cr = mix(cr, BLUE[0], edgeA);
          cg = mix(cg, BLUE[1], edgeA);
          cb = mix(cb, BLUE[2], edgeA);

          // --- nodes (lit core, blue rim) ---
          for (const n of NODES) {
            const d = Math.hypot(px - n.x, py - n.y) - n.r;
            const nodeA = clamp01(0.5 - d * size * scale);
            if (nodeA <= 0) continue;
            // brighter toward the top-left of each node, for a little dimension
            const lit = clamp01(0.5 - (px - n.x + (py - n.y)) / (n.r * 2.6));
            cr = mix(cr, mix(BLUE[0], BLUE_LIT[0], lit), nodeA);
            cg = mix(cg, mix(BLUE[1], BLUE_LIT[1], lit), nodeA);
            cb = mix(cb, mix(BLUE[2], BLUE_LIT[2], lit), nodeA);
          }

          r += cr * plateA;
          g += cg * plateA;
          b += cb * plateA;
          a += plateA;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      // un-premultiply so edge pixels keep their colour
      const av = a / n;
      out[i] = av > 0 ? r / a : 0;
      out[i + 1] = av > 0 ? g / a : 0;
      out[i + 2] = av > 0 ? b / a : 0;
      out[i + 3] = av * 255;
    }
  }
  return encodePng(out, size, size);
}

// ---------------------------------------------------------------------- main

const icons = {
  "icon-192.png": render(192, false),
  "icon-512.png": render(512, false),
  "icon-maskable.png": render(512, true),
  "apple-touch-icon.png": render(180, true), // iOS has no safe zone but squares
};

const lines = [
  "// AUTO-GENERATED by scripts/make-icons.mjs — do not edit by hand.",
  "// Base64 PNG bytes for the app icons, served from the Worker.",
  "",
  "export const ICONS = {",
];
for (const [name, buf] of Object.entries(icons)) {
  lines.push(`  ${JSON.stringify(name)}: ${JSON.stringify(buf.toString("base64"))},`);
  console.log(`${name.padEnd(22)} ${String(buf.length).padStart(7)} bytes`);
}
lines.push("};", "");
lines.push(
  "/** Decode a base64 icon to bytes for a Response body. */",
  "export function iconBytes(name) {",
  "  const b64 = ICONS[name];",
  "  if (!b64) return null;",
  "  const bin = atob(b64);",
  "  const out = new Uint8Array(bin.length);",
  "  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);",
  "  return out;",
  "}",
  "",
);

mkdirSync(join(ROOT, "src"), { recursive: true });
writeFileSync(join(ROOT, "src", "icons.js"), lines.join("\n"));
console.log("\nwrote src/icons.js");
