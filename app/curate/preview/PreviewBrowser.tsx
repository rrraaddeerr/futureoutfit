"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Decision = "keep" | "cut" | "star";
type Verdict = "skip" | "review" | "takeAll";
type SlimItem = {
  barcode: string;
  name: string;
  subcategory: string;
  description: string;
  size: string;
  priceWeek: number | null;
  thumb: string | null;
  photo: string | null;
};

const DECISIONS_KEY = "rentco_curate_v1";
const RENAMES_KEY = "rentco_curate_renames_v1";
const SORT_KEY = "rentco_curate_sort_v1";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function PreviewBrowser({ items }: { items: SlimItem[] }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [hydrated, setHydrated] = useState(false);
  const [catFilter, setCatFilter] = useState<string>("");

  useEffect(() => {
    setDecisions(loadJSON(DECISIONS_KEY, {}));
    setRenames(loadJSON(RENAMES_KEY, {}));
    setVerdicts(loadJSON(SORT_KEY, {}));
    setHydrated(true);
  }, []);

  const resolved = useMemo(() => {
    const keep: SlimItem[] = [];
    const star: SlimItem[] = [];
    for (const it of items) {
      if (verdicts[it.subcategory] === "skip") continue;
      const explicit = decisions[it.barcode];
      const eff = explicit ?? (verdicts[it.subcategory] === "takeAll" ? "keep" : undefined);
      if (eff === "star") {
        star.push(it);
        keep.push(it);
      } else if (eff === "keep") {
        keep.push(it);
      }
    }
    return { keep, star };
  }, [items, decisions, verdicts]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { items: SlimItem[]; withPhoto: number; renamed?: string }>();
    for (const it of resolved.keep) {
      const rawCat = it.subcategory;
      const cat = renames[rawCat] ?? rawCat;
      const bucket = map.get(cat) ?? { items: [], withPhoto: 0, renamed: renames[rawCat] ? rawCat : undefined };
      bucket.items.push(it);
      if (it.photo || it.thumb) bucket.withPhoto++;
      map.set(cat, bucket);
    }
    return [...map.entries()]
      .map(([cat, v]) => ({ category: cat, ...v }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [resolved.keep, renames]);

  const visible = catFilter
    ? byCategory.filter((b) => b.category === catFilter)
    : byCategory;

  const totals = useMemo(() => {
    let withPhoto = 0, photoless = 0;
    for (const it of resolved.keep) {
      if (it.photo || it.thumb) withPhoto++;
      else photoless++;
    }
    return { withPhoto, photoless };
  }, [resolved.keep]);

  const exportPicks = () => {
    const out = {
      generated: new Date().toISOString(),
      counts: {
        keep: resolved.keep.length,
        star: resolved.star.length,
        cut: Object.values(decisions).filter((v) => v === "cut").length,
      },
      renames,
      subcategoryVerdicts: verdicts,
      keep: resolved.keep.map((i) => i.barcode),
      star: resolved.star.map((i) => i.barcode),
      cut: Object.entries(decisions)
        .filter(([_, v]) => v === "cut")
        .map(([b]) => b),
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rentco-curate-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  if (!hydrated) {
    return (
      <div className="curate__loading"><span className="mono">Loading preview…</span></div>
    );
  }

  if (resolved.keep.length === 0) {
    return (
      <div className="curate__shell">
        <div className="curate__empty">
          <h3>No picks yet.</h3>
          <p>
            Head to <Link href="/curate" className="hot">/curate</Link> or{" "}
            <Link href="/curate/sort" className="hot">/curate/sort</Link> and mark items as Keep,
            Star, or Take all. Your picks will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="curate__shell">
      <header className="curate__bar">
        <div className="curate__bar-meta">
          <span className="curate__title">PREVIEW</span>
          <span className="curate__counts">
            <b>{resolved.keep.length}</b> items shipping
            {resolved.star.length ? <> · <b className="hot">{resolved.star.length}</b> ★ featured</> : null}
            {" · "}<span className="muted">{byCategory.length} categories</span>
            {totals.photoless > 0 ? (
              <> · <span className="muted">{totals.photoless} need high-rez backfill</span></>
            ) : null}
          </span>
        </div>
        <div className="curate__bar-actions">
          <Link href="/curate" className="curate__btn">← Back to curate</Link>
          <button type="button" className="curate__btn curate__btn--accent" onClick={exportPicks}>
            Export {resolved.keep.length} picks
          </button>
        </div>
      </header>

      <div className="preview__cats">
        <button
          type="button"
          className={`preview__cat-chip ${catFilter === "" ? "is-on" : ""}`}
          onClick={() => setCatFilter("")}
        >
          All ({resolved.keep.length})
        </button>
        {byCategory.map((b) => (
          <button
            key={b.category}
            type="button"
            className={`preview__cat-chip ${catFilter === b.category ? "is-on" : ""}`}
            onClick={() => setCatFilter(b.category)}
          >
            {b.category} ({b.items.length})
          </button>
        ))}
      </div>

      {visible.map((bucket) => (
        <section className="preview__section" key={bucket.category}>
          <header className="preview__cat-head">
            <h2>
              {bucket.category}{" "}
              <span className="preview__cat-count">{bucket.items.length}</span>
            </h2>
            {bucket.renamed ? (
              <span className="preview__renamed">renamed from {bucket.renamed}</span>
            ) : null}
            <span className="preview__cat-meta">
              {bucket.withPhoto} of {bucket.items.length} with image
            </span>
          </header>
          <div className="preview__grid">
            {bucket.items.map((it) => (
              <div className="preview__tile" key={it.barcode}>
                <div className="preview__tile-media">
                  {it.thumb || it.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.thumb ?? it.photo!} alt={it.name} loading="lazy" />
                  ) : (
                    <div className="ccard__noimg">
                      <span className="ccard__noimg-label">{it.subcategory || "—"}</span>
                      <span className="ccard__noimg-meta">no photo</span>
                    </div>
                  )}
                </div>
                <div className="preview__tile-body">
                  <div className="preview__tile-name">{it.name || "(no name)"}</div>
                  <div className="preview__tile-meta">
                    {it.priceWeek != null ? `$${it.priceWeek}/wk` : "On inquiry"}
                    {it.size ? <> · {it.size.replace(/\s+/g, " ").slice(0, 30)}</> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
