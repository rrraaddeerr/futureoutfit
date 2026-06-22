"use client";

import { useState } from "react";

export function GenerateSampleButton({ small }: { small?: boolean }) {
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/sets/sample", { method: "POST" });
      const json = await res.json();
      if (json.ok && json.id) {
        window.location.href = `/sets/${json.id}`;
      } else {
        window.alert(`Couldn't generate: ${json.error ?? res.status}`);
        setBusy(false);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={`curate__btn ${small ? "" : "curate__btn--accent"}`}
    >
      {busy ? "Generating…" : small ? "Generate sample" : "⚡ Generate sample"}
    </button>
  );
}
