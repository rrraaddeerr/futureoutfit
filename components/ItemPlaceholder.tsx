import type { InventoryItem } from "@/lib/types";

/**
 * Generative placeholder for items with no photograph yet. Renders as a
 * blueprint-style archive scan card — registration marks, a faint grid, and a
 * deterministic object silhouette — so a photo-less catalogue still reads as
 * an intentional archive rather than a broken image.
 */
export function ItemPlaceholder({ item }: { item: InventoryItem }) {
  const seed = hash(item.id);
  const bars = 2 + (seed % 3); // 2-4 stacked forms
  const offset = (seed >> 3) % 5;

  const blocks = Array.from({ length: bars }, (_, i) => {
    const w = 120 - i * (14 + offset * 3);
    const h = 26 + ((seed >> (i + 1)) % 4) * 6;
    const x = (320 - w) / 2;
    const y = 200 - h - i * (h + 8);
    return { x, y, w, h, key: i };
  });

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
      <g stroke="var(--line)" strokeWidth="1" opacity="0.5">
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

      {/* deterministic object silhouette */}
      <g>
        {blocks.map((b) => (
          <rect
            key={b.key}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            fill="var(--bg)"
            stroke="var(--text)"
            strokeWidth="2"
          />
        ))}
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

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}
