/**
 * Inline SVG iconography that matches the brand grit —
 * director's chair, walkie talkie, truck, antenna, etc.
 * Stroke 2px, square caps, hand-drawn feel.
 */

type IconProps = {
  size?: number | string;
  className?: string;
  color?: string;
};

function box(size: number | string | undefined) {
  return typeof size === "number" ? `${size}px` : size ?? "24px";
}

/** Folding director's chair — film-set seating */
export function DirectorChairIcon({ size = 28, className, color = "currentColor" }: IconProps) {
  const s = box(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* canvas back */}
      <rect x="8" y="5" width="16" height="5" />
      {/* the X-folding leg structure */}
      <path d="M6 28 L16 12 L26 28" />
      <path d="M6 12 L26 28 M26 12 L6 28" />
      {/* seat */}
      <path d="M6 16 L26 16" />
      {/* small floor line */}
      <path d="M4 28 L28 28" />
    </svg>
  );
}

/** Walkie talkie — push-to-talk crew vibe */
export function WalkieIcon({ size = 28, className, color = "currentColor" }: IconProps) {
  const s = box(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 32"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* antenna */}
      <path d="M12 1 L12 5" />
      <circle cx="12" cy="1" r="0.9" fill={color} stroke="none" />
      {/* body */}
      <rect x="4.5" y="5" width="15" height="25" rx="1.5" />
      {/* display */}
      <rect x="7" y="8" width="10" height="4.5" />
      {/* keypad */}
      <circle cx="9" cy="17" r="0.8" fill={color} stroke="none" />
      <circle cx="12" cy="17" r="0.8" fill={color} stroke="none" />
      <circle cx="15" cy="17" r="0.8" fill={color} stroke="none" />
      <circle cx="9" cy="20" r="0.8" fill={color} stroke="none" />
      <circle cx="12" cy="20" r="0.8" fill={color} stroke="none" />
      <circle cx="15" cy="20" r="0.8" fill={color} stroke="none" />
      {/* PTT */}
      <rect x="10" y="24" width="4" height="3" />
    </svg>
  );
}

/** Box truck with firecracker — operator mark */
export function TruckIcon({ size = 32, className, color = "currentColor" }: IconProps) {
  const s = box(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 36 36"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 13h17v12H2z" />
      <path d="M19 16h6l5 5v4h-11z" />
      <circle cx="9" cy="27" r="2.5" />
      <circle cx="24" cy="27" r="2.5" />
      <rect x="8" y="16" width="5" height="7" />
      <path d="M8 16l2.5 -2 2.5 2" />
      <path d="M10.5 14 Q12 12 11 10 Q9.5 8 11 6 Q12.5 4 11 2" />
      <circle cx="11" cy="2" r="1" fill={color} stroke="none" />
    </svg>
  );
}

/** Antenna with signal bars — channel readout */
export function AntennaIcon({ size = 20, className, color = "currentColor" }: IconProps) {
  const s = box(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 4 L12 16" />
      <path d="M8 8 Q12 4 16 8" />
      <path d="M6 6 Q12 0 18 6" />
      <path d="M4 18 L20 18" />
      <path d="M9 22 L15 22" />
    </svg>
  );
}

/** Gaffer tape strip silhouette — section breaks */
export function TapeStripIcon({ size = 28, className, color = "currentColor" }: IconProps) {
  const s = box(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 48 16"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <path d="M1 3 L4 0 L46 2 L48 5 L47 14 L44 16 L2 15 L0 11 Z" />
    </svg>
  );
}

/** Marker scribble line — for hand-emphasis */
export function MarkerScribbleIcon({ size = 80, className, color = "currentColor" }: IconProps) {
  const s = box(size);
  return (
    <svg
      width={s}
      height="12"
      viewBox="0 0 120 12"
      fill="none"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 6 Q 18 1 36 4 T 70 5 Q 88 7 118 3" />
    </svg>
  );
}
