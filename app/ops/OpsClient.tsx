"use client";

import { useEffect, useState } from "react";

type Decision = "keep" | "cut" | "star";
type Verdict = "skip" | "review" | "takeAll";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function OpsClient() {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDecisions(loadJSON("rentco_curate_v1", {}));
    setVerdicts(loadJSON("rentco_curate_sort_v1", {}));
    setRenames(loadJSON("rentco_curate_renames_v1", {}));
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="ops__stat-meta">checking local…</div>
    );
  }

  const keep = Object.values(decisions).filter((v) => v === "keep").length;
  const star = Object.values(decisions).filter((v) => v === "star").length;
  const cut = Object.values(decisions).filter((v) => v === "cut").length;
  const skipSubs = Object.values(verdicts).filter((v) => v === "skip").length;
  const reviewSubs = Object.values(verdicts).filter((v) => v === "review").length;
  const takeAllSubs = Object.values(verdicts).filter((v) => v === "takeAll").length;
  const renameCount = Object.keys(renames).length;
  const explicit = keep + star + cut;

  if (explicit === 0 && skipSubs + reviewSubs + takeAllSubs === 0) {
    return (
      <>
        <div className="ops__stat-big ops__stat-big--mute">0</div>
        <div className="ops__stat-meta">no curation in progress on this device</div>
      </>
    );
  }

  return (
    <>
      <div className="ops__stat-big">{keep + star}</div>
      <div className="ops__stat-meta">items marked keep on this device</div>
      <div className="ops__rows">
        <div className="ops__row">
          <span className="ops__row-k">Per-item</span>
          <span className="ops__row-v">
            {keep} keep · <span className="hot">{star} ★</span> · {cut} cut
          </span>
        </div>
        <div className="ops__row">
          <span className="ops__row-k">Subcat sort</span>
          <span className="ops__row-v">
            {reviewSubs} review · <span className="hot">{takeAllSubs} take all</span> · {skipSubs} skip
          </span>
        </div>
        {renameCount > 0 ? (
          <div className="ops__row">
            <span className="ops__row-k">Renames</span>
            <span className="ops__row-v">{renameCount}</span>
          </div>
        ) : null}
      </div>
    </>
  );
}
