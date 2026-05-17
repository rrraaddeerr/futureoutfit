"use client";

import { useCart } from "@/lib/cart";

/**
 * Toggles an item in the inquiry cart. `variant="full"` is the detail-page
 * button; `variant="compact"` sits on archive cards.
 */
export function AddToRequestButton({
  itemId,
  variant = "full",
}: {
  itemId: string;
  variant?: "full" | "compact";
}) {
  const ids = useCart((s) => s.ids);
  const hydrated = useCart((s) => s.hydrated);
  const toggle = useCart((s) => s.toggle);
  const inCart = ids.includes(itemId);

  const label = !hydrated
    ? "Add to request"
    : inCart
      ? variant === "compact"
        ? "In request"
        : "Added to request"
      : variant === "compact"
        ? "Add to request"
        : "Add to rental request";

  return (
    <button
      type="button"
      onClick={() => toggle(itemId)}
      aria-pressed={inCart}
      className={`add-btn add-btn--${variant} ${inCart ? "add-btn--on" : ""}`}
    >
      <span className="add-btn__tick" aria-hidden="true">
        {inCart ? "[x]" : "[ ]"}
      </span>
      {label}
    </button>
  );
}
