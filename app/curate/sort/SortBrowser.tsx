"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Verdict = "skip" | "review" | "takeAll";
type SubcategoryCard = {
  subcategory: string;
  count: number;
  withPhoto: number;
  thumbs: string[];
  samples: string[];
  priceWeek: number | null;
};

const SORT_KEY = "rentco_curate_sort_v1";

function loadVerdicts(): Record<string, Verdict> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SORT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveVerdicts(v: Record<string, Verdict>) {
  try {
    localStorage.setItem(SORT_KEY, JSON.stringify(v));
  } catch {}
}

export function SortBrowser({
  subcategories,
}: {
  subcategories: SubcategoryCard[];
}) {
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [hydrated, setHydrated] = useState(false);
  const [index, setIndex] = useState(0);
  const [hideDecided, setHideDecided] = useState(true);
  const [photoOnly, setPhotoOnly] = useState(false);

  useEffect(() => {
    setVerdicts(loadVerdicts());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveVerdicts(verdicts);
  }, [verdicts, hydrated]);

  const queue = useMemo(() => {
    return subcategories.filter((s) => {
      if (photoOnly && s.withPhoto === 0) return false;
      if (hideDecided && verdicts[s.subcategory]) return false;
      return true;
    });
  }, [subcategories, hideDecided, photoOnly, verdicts]);

  // Reset index when queue shrinks below current position.
  useEffect(() => {
    if (index >= queue.length && queue.length > 0) setIndex(queue.length - 1);
  }, [queue.length, index]);

  const current = queue[index];
  const counts = useMemo(() => {
    let skip = 0, review = 0, takeAll = 0;
    for (const v of Object.values(verdicts)) {
      if (v === "skip") skip++;
      else if (v === "review") review++;
      else if (v === "takeAll") takeAll++;
    }
    return {
      skip,
      review,
      takeAll,
      decided: skip + review + takeAll,
      total: subcategories.length,
    };
  }, [verdicts, subcategories.length]);

  const itemsBeingTaken = useMemo(() => {
    let n = 0;
    for (const s of subcategories) {
      if (verdicts[s.subcategory] === "takeAll") n += s.count;
    }
    return n;
  }, [verdicts, subcategories]);

  const decide = useCallback(
    (sub: string, v: Verdict) => {
      setVerdicts((prev) => {
        const next = { ...prev };
        if (next[sub] === v) delete next[sub];
        else next[sub] = v;
        return next;
      });
      // Auto-advance after a setting decision; staying put feels stuck.
      setTimeout(() => {
        setIndex((i) => {
          // queue still contains the just-decided item briefly; advance one.
          return Math.min(i + 1, Math.max(queue.length - 1, 0));
        });
      }, 120);
    },
    [queue.length]
  );

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(queue.length - 1, i + 1));

  // Keyboard shortcuts.
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "1" || e.key === "ArrowLeft") {
        e.preventDefault();
        decide(current.subcategory, "skip");
      } else if (e.key === "2" || e.key === "ArrowDown") {
        e.preventDefault();
        decide(current.subcategory, "review");
      } else if (e.key === "3" || e.key === "ArrowRight") {
        e.preventDefault();
        decide(current.subcategory, "takeAll");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, decide]);

  const resetAll = () => {
    if (typeof window !== "undefined" && !window.confirm("Clear all sort decisions?")) return;
    setVerdicts({});
    setIndex(0);
  };

  if (!hydrated) {
    return (
      <div className="curate__loading">
        <span className="mono">Loading sort…</span>
      </div>
    );
  }

  return (
    <div className="sort__shell">
      <header className="sort__bar">
        <div className="sort__bar-meta">
          <span className="curate__title">SORT</span>
          <span className="curate__counts">
            <b>{counts.review}</b> review
            {" · "}<b className="hot">{counts.takeAll}</b> take all
            {" · "}<b>{counts.skip}</b> skip
            {" · "}
            <span className="muted">
              {counts.decided}/{counts.total} sorted
            </span>
            {itemsBeingTaken > 0 ? (
              <> · <span className="muted">{itemsBeingTaken} items auto-kept</span></>
            ) : null}
          </span>
        </div>
        <div className="sort__bar-actions">
          <Link href="/curate" className="curate__btn">
            Back to curate
          </Link>
          <button type="button" className="curate__btn" onClick={resetAll}>
            Reset
          </button>
        </div>
      </header>

      <div className="sort__progress">
        <div
          className="sort__progress-bar"
          style={{
            width: `${Math.min(100, (counts.decided / Math.max(counts.total, 1)) * 100)}%`,
          }}
        />
      </div>

      <div className="sort__toolbar">
        <label className="curate__toggle">
          <input
            type="checkbox"
            checked={hideDecided}
            onChange={(e) => setHideDecided(e.target.checked)}
          />
          <span>Hide already-sorted</span>
        </label>
        <label className="curate__toggle">
          <input
            type="checkbox"
            checked={photoOnly}
            onChange={(e) => setPhotoOnly(e.target.checked)}
          />
          <span>Photo only</span>
        </label>
        <span className="sort__position">
          {queue.length > 0
            ? `${index + 1} of ${queue.length} queued`
            : "Queue empty"}
        </span>
      </div>

      {!current ? (
        <div className="sort__done">
          <h2>You&apos;re through the queue.</h2>
          <p>
            <b>{counts.review}</b> subcategories to review item-by-item ·{" "}
            <b className="hot">{counts.takeAll}</b> take everything ·{" "}
            <b>{counts.skip}</b> skipped.
            {itemsBeingTaken > 0 ? (
              <> That&apos;s <b>{itemsBeingTaken}</b> items auto-kept before per-item review.</>
            ) : null}
          </p>
          <p className="muted">
            Uncheck &quot;Hide already-sorted&quot; to revisit any decision, or head to{" "}
            <Link href="/curate" className="hot">/curate</Link> to deep-review the Review pile.
          </p>
        </div>
      ) : (
        <article className="sort__card">
          <div className="sort__head">
            <div>
              <div className="sort__sub-name">{current.subcategory}</div>
              <div className="sort__sub-meta">
                {current.count} items · {current.withPhoto} with photo
                {current.priceWeek != null ? <> · sample ${current.priceWeek}/wk</> : null}
              </div>
            </div>
            {verdicts[current.subcategory] ? (
              <span className={`sort__verdict-tag sort__verdict-tag--${verdicts[current.subcategory]}`}>
                {verdicts[current.subcategory] === "skip"
                  ? "SKIPPED"
                  : verdicts[current.subcategory] === "review"
                  ? "REVIEW"
                  : "TAKE ALL"}
              </span>
            ) : null}
          </div>

          <div className="sort__thumbs">
            {current.thumbs.length > 0 ? (
              current.thumbs.map((t, i) => (
                <div className="sort__thumb" key={t + i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t} alt="" loading="lazy" />
                </div>
              ))
            ) : (
              <div className="sort__nothumbs">
                <span className="curate__title">NO PHOTOS</span>
                <span className="muted">decision is on the name + count alone</span>
              </div>
            )}
          </div>

          {current.samples.length > 0 ? (
            <div className="sort__samples">
              <span className="muted">e.g.</span>{" "}
              {current.samples.join(" · ")}
            </div>
          ) : null}

          <div className="sort__actions">
            <button
              type="button"
              className="sort__action sort__action--skip"
              onClick={() => decide(current.subcategory, "skip")}
            >
              <span className="sort__action-key">1</span>
              ✗ Skip
              <span className="sort__action-hint">don&apos;t show this category</span>
            </button>
            <button
              type="button"
              className="sort__action sort__action--review"
              onClick={() => decide(current.subcategory, "review")}
            >
              <span className="sort__action-key">2</span>
              ◐ Review
              <span className="sort__action-hint">pick items one by one</span>
            </button>
            <button
              type="button"
              className="sort__action sort__action--take"
              onClick={() => decide(current.subcategory, "takeAll")}
            >
              <span className="sort__action-key">3</span>
              ★ Take all
              <span className="sort__action-hint">keep every item in this category</span>
            </button>
          </div>

          <div className="sort__nav">
            <button type="button" className="curate__btn" onClick={goPrev} disabled={index === 0}>
              ← Previous
            </button>
            <button type="button" className="curate__btn" onClick={goNext} disabled={index >= queue.length - 1}>
              Next →
            </button>
          </div>
        </article>
      )}
    </div>
  );
}
