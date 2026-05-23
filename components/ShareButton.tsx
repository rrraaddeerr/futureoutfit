"use client";

import { useEffect, useState } from "react";

export function ShareButton({ label = "Share" }: { label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(t);
  }, [state]);

  async function copy() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("error");
    }
  }

  return (
    <button
      type="button"
      className="btn btn--ghost share-btn"
      onClick={copy}
      data-state={state}
    >
      {state === "copied"
        ? "Link copied ✓"
        : state === "error"
        ? "Couldn't copy — copy URL manually"
        : label}
    </button>
  );
}
