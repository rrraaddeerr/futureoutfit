"use client";

import { useEffect, useMemo, useState } from "react";
import type { VPCItem } from "@/lib/vpc-catalog";

type Decision = "keep" | "cut" | "star";
type SubcategoryStat = { subcategory: string; count: number; withPhoto: number };

const STORAGE_KEY = "rentco_curate_v1";

function loadDecisions(): Record<string, Decision> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveDecisions(d: Record<string, Decision>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {}
}

export function CurateBrowser({
  items,
  subcategories,
}: {
  items: VPCItem[];
  subcategories: SubcategoryStat[];
}) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [hydrated, setHydrated] = useState(false);
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [photoOnly, setPhotoOnly] = useState(false);
  const [showDecided, setShowDecided] = useState(true);
  const [showCut, setShowCut] = useState(false);
  const [subSearch, setSubSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(true);

  useEffect(() => {
    setDecisions(loadDecisions());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDecisions(decisions);
  }, [decisions, hydrated]);

  const setDecision = (barcode: string, d: Decision | null) => {
    setDecisions((prev) => {
      const next = { ...prev };
      if (d === null) delete next[barcode];
      else next[barcode] = d;
      return next;
    });
  };

  const counts = useMemo(() => {
    let keep = 0, cut = 0, star = 0;
    for (const v of Object.values(decisions)) {
      if (v === "keep") keep++;
      else if (v === "cut") cut++;
      else if (v === "star") star++;
    }
    return { keep, cut, star, total: items.length };
  }, [decisions, items.length]);

  const filteredSubs = useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    return subcategories.filter((s) =>
      q ? s.subcategory.toLowerCase().includes(q) : true
    );
  }, [subSearch, subcategories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (selectedSubs.size > 0 && !selectedSubs.has(it.subcategory)) return false;
      if (photoOnly && !it.photo) return false;
      const dec = decisions[it.barcode];
      if (!showDecided && dec) return false;
      if (!showCut && dec === "cut") return false;
      if (q) {
        const blob = `${it.name} ${it.description} ${it.subcategory} ${it.barcode}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [items, selectedSubs, photoOnly, showDecided, showCut, search, decisions]);

  const toggleSub = (sub: string) => {
    setSelectedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(sub)) next.delete(sub);
      else next.add(sub);
      return next;
    });
  };

  const exportPicks = () => {
    const out = {
      generated: new Date().toISOString(),
      counts,
      keep: Object.entries(decisions)
        .filter(([_, v]) => v === "keep" || v === "star")
        .map(([b]) => b),
      star: Object.entries(decisions)
        .filter(([_, v]) => v === "star")
        .map(([b]) => b),
      cut: Object.entries(decisions)
        .filter(([_, v]) => v === "cut")
        .map(([b]) => b),
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rentco-curate-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  if (!hydrated) {
    return (
      <div className="curate__loading">
        <span className="mono">Loading curate…</span>
      </div>
    );
  }

  return (
    <div className="curate__shell">
      <header className="curate__bar">
        <div className="curate__bar-meta">
          <span className="curate__title">CURATE</span>
          <span className="curate__counts">
            <b>{counts.keep + counts.star}</b> keep
            {counts.star ? <> · <b className="hot">{counts.star}</b> ★</> : null}
            {" · "}<b>{counts.cut}</b> cut
            {" · "}<span className="muted">{counts.total} total</span>
          </span>
        </div>
        <div className="curate__bar-actions">
          <button
            type="button"
            className="curate__btn"
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
          >
            {pickerOpen ? "Hide" : "Show"} subcategories
            {selectedSubs.size > 0 ? ` (${selectedSubs.size})` : ""}
          </button>
          <button type="button" className="curate__btn curate__btn--accent" onClick={exportPicks}>
            Export picks
          </button>
        </div>
      </header>

      {pickerOpen ? (
        <aside className="curate__picker" aria-label="Subcategory picker">
          <div className="curate__picker-head">
            <input
              type="search"
              placeholder="Filter subcategories…"
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
              className="curate__sub-search"
              aria-label="Filter subcategories"
            />
            <div className="curate__picker-actions">
              <button
                type="button"
                className="curate__chip"
                onClick={() => setSelectedSubs(new Set())}
                disabled={selectedSubs.size === 0}
              >
                Clear ({selectedSubs.size})
              </button>
              <button
                type="button"
                className="curate__chip"
                onClick={() =>
                  setSelectedSubs(new Set(filteredSubs.map((s) => s.subcategory)))
                }
              >
                Select visible ({filteredSubs.length})
              </button>
            </div>
          </div>
          <div className="curate__sub-grid" role="listbox" aria-multiselectable="true">
            {filteredSubs.map((s) => {
              const on = selectedSubs.has(s.subcategory);
              return (
                <button
                  key={s.subcategory}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`curate__sub ${on ? "is-on" : ""}`}
                  onClick={() => toggleSub(s.subcategory)}
                  title={`${s.count} items · ${s.withPhoto} with photo`}
                >
                  <span className="curate__sub-name">{s.subcategory}</span>
                  <span className="curate__sub-counts">
                    {s.count}
                    {s.withPhoto > 0 ? (
                      <span className="curate__sub-photos"> · {s.withPhoto}📷</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}

      <div className="curate__toolbar">
        <input
          type="search"
          placeholder="Search name, description, barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="curate__search"
          aria-label="Search items"
        />
        <label className="curate__toggle">
          <input
            type="checkbox"
            checked={photoOnly}
            onChange={(e) => setPhotoOnly(e.target.checked)}
          />
          <span>Photo only</span>
        </label>
        <label className="curate__toggle">
          <input
            type="checkbox"
            checked={showDecided}
            onChange={(e) => setShowDecided(e.target.checked)}
          />
          <span>Show already-decided</span>
        </label>
        <label className="curate__toggle">
          <input
            type="checkbox"
            checked={showCut}
            onChange={(e) => setShowCut(e.target.checked)}
          />
          <span>Show cut</span>
        </label>
        <div className="curate__filtered-count">
          {filtered.length} {filtered.length === 1 ? "item" : "items"} shown
        </div>
      </div>

      <div className="curate__grid">
        {selectedSubs.size === 0 && !search ? (
          <div className="curate__empty">
            <h3>Pick a subcategory to start.</h3>
            <p>
              Tap subcategories in the picker above to scope what you&apos;re reviewing.
              You can also search across everything from the toolbar.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="curate__empty">
            <h3>Nothing matches.</h3>
            <p>Loosen the filters or pick another subcategory.</p>
          </div>
        ) : (
          filtered.map((it) => (
            <ItemCard
              key={it.barcode}
              item={it}
              decision={decisions[it.barcode]}
              onSet={setDecision}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  decision,
  onSet,
}: {
  item: VPCItem;
  decision?: Decision;
  onSet: (b: string, d: Decision | null) => void;
}) {
  const set = (d: Decision) => onSet(item.barcode, decision === d ? null : d);
  return (
    <article className={`ccard ccard--${decision ?? "undecided"}`}>
      <div className="ccard__media">
        {item.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo} alt={item.name} loading="lazy" />
        ) : (
          <div className="ccard__noimg">
            <span className="ccard__noimg-label">{item.subcategory || "—"}</span>
            <span className="ccard__noimg-meta">no photo</span>
          </div>
        )}
        {decision ? (
          <span className={`ccard__badge ccard__badge--${decision}`}>
            {decision === "keep" ? "KEPT" : decision === "star" ? "★ STAR" : "CUT"}
          </span>
        ) : null}
      </div>
      <div className="ccard__body">
        <div className="ccard__sub">{item.subcategory}</div>
        <div className="ccard__name">{item.name || "(no name)"}</div>
        {item.description ? (
          <div className="ccard__desc">{item.description}</div>
        ) : null}
        <div className="ccard__meta">
          <span className="ccard__price">
            {item.priceWeek != null ? `$${item.priceWeek}/wk` : "On inquiry"}
          </span>
          <span className="ccard__barcode" title={item.barcode}>{item.barcode}</span>
        </div>
        {item.size ? <div className="ccard__size">{item.size}</div> : null}
      </div>
      <div className="ccard__actions">
        <button
          type="button"
          className={`ccard__btn ccard__btn--cut ${decision === "cut" ? "is-on" : ""}`}
          onClick={() => set("cut")}
          aria-pressed={decision === "cut"}
        >
          ✗ Cut
        </button>
        <button
          type="button"
          className={`ccard__btn ccard__btn--star ${decision === "star" ? "is-on" : ""}`}
          onClick={() => set("star")}
          aria-pressed={decision === "star"}
        >
          ★ Star
        </button>
        <button
          type="button"
          className={`ccard__btn ccard__btn--keep ${decision === "keep" ? "is-on" : ""}`}
          onClick={() => set("keep")}
          aria-pressed={decision === "keep"}
        >
          ✓ Keep
        </button>
      </div>
    </article>
  );
}
