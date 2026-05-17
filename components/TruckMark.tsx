/** The rent.co mark — a moving truck rendered as a stamped, industrial glyph. */
export function TruckMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 8h17v13H2z" />
      <path d="M19 13h6l5 5v3h-11z" />
      <circle cx="9" cy="24" r="3" fill="var(--bg)" />
      <circle cx="24" cy="24" r="3" fill="var(--bg)" />
    </svg>
  );
}
