import type { ReactNode } from "react";

/**
 * A strip of green gaffer tape with a Sharpie-marker label — the recurring
 * physical-archive motif across rent.co. Rotation is deterministic per label
 * so it reads hand-applied without shifting between renders.
 */
export function TapeLabel({
  children,
  rotate,
  tone = "green",
  className = "",
}: {
  children: ReactNode;
  rotate?: number;
  tone?: "green" | "orange";
  className?: string;
}) {
  const tilt = rotate ?? deterministicTilt(String(children));
  return (
    <span
      className={`tape tape--${tone} ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {children}
    </span>
  );
}

function deterministicTilt(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  // -3deg .. +3deg
  return ((h % 13) - 6) / 2;
}
