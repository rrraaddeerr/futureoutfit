import type { ReactNode } from "react";
import type { InventoryItem } from "@/lib/types";

/**
 * Generative placeholder for items with no photograph yet. Renders as a
 * blueprint-style archive scan card — registration marks, a faint grid, and a
 * category-specific object silhouette — so a photo-less catalogue reads as an
 * intentional, varied archive rather than a wall of broken images.
 *
 * When an item gains real images (paths under /public/inventory), the card and
 * detail views render those instead and this placeholder is skipped.
 */
export function ItemPlaceholder({ item }: { item: InventoryItem }) {
  const seed = hash(item.id);
  const tilt = ((seed % 9) - 4) / 2; // -2deg .. +2deg
  const flip = (seed >> 4) % 2 === 1;

  return (
    <svg
      viewBox="0 0 320 240"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${item.title} — archive scan pending`}
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <rect width="320" height="240" fill="var(--panel)" />

      {/* faint blueprint grid */}
      <g stroke="var(--line)" strokeWidth="1" opacity="0.55">
        {[40, 80, 120, 160, 200, 240, 280].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="240" />
        ))}
        {[40, 80, 120, 160, 200].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="320" y2={y} />
        ))}
      </g>

      {/* registration marks */}
      <g stroke="var(--accent)" strokeWidth="2">
        <path d="M12 12h14M12 12v14" />
        <path d="M308 12h-14M308 12v14" />
        <path d="M12 228h14M12 228v-14" />
        <path d="M308 228h-14M308 228v-14" />
      </g>

      {/* category-specific object silhouette */}
      <g
        stroke="var(--text)"
        strokeWidth="3"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
        transform={`translate(160 128) rotate(${tilt}) scale(${flip ? -1 : 1} 1) translate(-160 -128)`}
      >
        {glyph(item.category)}
      </g>

      {/* stamped metadata */}
      <text
        x="22"
        y="34"
        fill="var(--accent)"
        fontFamily="ui-monospace, monospace"
        fontSize="12"
        letterSpacing="1"
      >
        {item.id.toUpperCase()}
      </text>
      <text
        x="298"
        y="222"
        textAnchor="end"
        fill="var(--muted)"
        fontFamily="ui-monospace, monospace"
        fontSize="10"
        letterSpacing="1"
      >
        rent.co // archive
      </text>
    </svg>
  );
}

/** Simple line-art object silhouette per practical category. */
function glyph(category: string): ReactNode {
  switch (category) {
    case "Seating":
      return (
        <>
          <rect x="132" y="68" width="56" height="44" />
          <rect x="118" y="110" width="84" height="24" />
          <rect x="108" y="92" width="12" height="42" />
          <rect x="200" y="92" width="12" height="42" />
          <line x1="124" y1="134" x2="124" y2="178" />
          <line x1="196" y1="134" x2="196" y2="178" />
        </>
      );
    case "Tables":
      return (
        <>
          <rect x="104" y="100" width="112" height="14" />
          <line x1="118" y1="114" x2="118" y2="178" />
          <line x1="202" y1="114" x2="202" y2="178" />
        </>
      );
    case "Lighting":
      return (
        <>
          <line x1="160" y1="64" x2="160" y2="100" />
          <polygon points="138,144 182,144 168,100 152,100" />
          <circle cx="160" cy="156" r="7" />
        </>
      );
    case "Practical Lighting":
      return (
        <>
          <rect x="140" y="76" width="40" height="26" />
          <line x1="160" y1="102" x2="160" y2="142" />
          <line x1="160" y1="142" x2="130" y2="184" />
          <line x1="160" y1="142" x2="190" y2="184" />
          <line x1="160" y1="142" x2="160" y2="184" />
        </>
      );
    case "Practical Seating":
      return (
        <>
          <rect x="124" y="108" width="72" height="12" />
          <line x1="132" y1="120" x2="186" y2="182" />
          <line x1="188" y1="120" x2="134" y2="182" />
        </>
      );
    case "Cases & Carts":
      return (
        <>
          <rect x="150" y="72" width="20" height="10" />
          <rect x="118" y="82" width="84" height="80" />
          <line x1="118" y1="106" x2="202" y2="106" />
          <circle cx="134" cy="174" r="9" />
          <circle cx="186" cy="174" r="9" />
        </>
      );
    case "Pipe & Drape":
      return (
        <>
          <line x1="116" y1="80" x2="204" y2="80" />
          <line x1="122" y1="80" x2="122" y2="184" />
          <line x1="198" y1="80" x2="198" y2="184" />
          <line x1="142" y1="86" x2="142" y2="178" />
          <line x1="160" y1="86" x2="160" y2="178" />
          <line x1="178" y1="86" x2="178" y2="178" />
        </>
      );
    case "Water Stations":
      return (
        <>
          <polygon points="148,70 172,70 166,102 154,102" />
          <rect x="134" y="102" width="52" height="80" />
          <line x1="134" y1="148" x2="186" y2="148" />
        </>
      );
    case "Signage":
      return (
        <>
          <rect x="116" y="70" width="88" height="48" />
          <line x1="160" y1="118" x2="160" y2="184" />
          <line x1="134" y1="94" x2="184" y2="94" />
          <polyline points="172,84 186,94 172,104" />
        </>
      );
    case "Hospitality":
      return (
        <>
          <rect x="112" y="92" width="96" height="22" />
          <rect x="104" y="114" width="112" height="28" />
          <rect x="104" y="100" width="14" height="42" />
          <rect x="202" y="100" width="14" height="42" />
          <line x1="116" y1="142" x2="116" y2="168" />
          <line x1="204" y1="142" x2="204" y2="168" />
        </>
      );
    case "Greenery":
      return (
        <>
          <line x1="160" y1="150" x2="160" y2="124" />
          <circle cx="160" cy="110" r="20" />
          <circle cx="140" cy="126" r="15" />
          <circle cx="180" cy="126" r="15" />
          <polygon points="140,150 180,150 174,184 146,184" />
        </>
      );
    case "Staging":
      return (
        <>
          <rect x="106" y="112" width="108" height="18" />
          <line x1="118" y1="130" x2="118" y2="182" />
          <line x1="202" y1="130" x2="202" y2="182" />
          <line x1="118" y1="160" x2="202" y2="160" />
        </>
      );
    case "Logistics":
      return (
        <>
          <rect x="100" y="100" width="76" height="50" />
          <polygon points="176,116 198,116 214,134 214,150 176,150" />
          <circle cx="126" cy="160" r="11" />
          <circle cx="198" cy="160" r="11" />
        </>
      );
    case "Storage":
      return (
        <>
          <rect x="116" y="74" width="88" height="108" />
          <line x1="116" y1="104" x2="204" y2="104" />
          <line x1="116" y1="134" x2="204" y2="134" />
          <line x1="116" y1="160" x2="204" y2="160" />
        </>
      );
    default:
      return (
        <>
          <rect x="112" y="138" width="96" height="40" />
          <rect x="124" y="104" width="72" height="34" />
          <rect x="136" y="74" width="48" height="30" />
        </>
      );
  }
}

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}
