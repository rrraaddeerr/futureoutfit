"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ORGS, type Org } from "@/lib/planner/orgs";

const TAGS: { key: Org["tags"][number]; label: string }[] = [
  { key: "music", label: "Music" },
  { key: "fashion", label: "Fashion" },
  { key: "film", label: "Film" },
  { key: "agency", label: "Agencies" },
  { key: "media", label: "Media" },
  { key: "festival", label: "Festivals" },
  { key: "hospitality", label: "Hospitality" },
  { key: "gallery", label: "Galleries / Arts" },
];

export default function JobsPage() {
  const [active, setActive] = useState<Org["tags"][number] | "all">("all");
  const [van, setVan] = useState(false);

  const filtered = useMemo(() => {
    return ORGS.filter((o) => {
      if (active !== "all" && !o.tags.includes(active)) return false;
      if (van && !(o.city ?? "").toLowerCase().includes("vancouver")) return false;
      return true;
    });
  }, [active, van]);

  return (
    <>
      <p className="fp-micro" style={{ marginBottom: 6 }}>
        <Link href="/planner/paths" style={{ color: "inherit", textDecoration: "none" }}>
          ← back to paths
        </Link>
      </p>
      <h1 className="fp-h1">Dope orgs to watch</h1>
      <p className="fp-sub" style={{ marginBottom: 18 }}>
        Real organizations with real careers pages. Specific listings change weekly —
        these links don't. Tap any to open their hiring page.
      </p>

      <div className="fp-tabbar">
        <button
          className={`fp-tabbar__btn${active === "all" ? " is-on" : ""}`}
          onClick={() => setActive("all")}
        >
          all
        </button>
        {TAGS.map((t) => (
          <button
            key={t.key}
            className={`fp-tabbar__btn${active === t.key ? " is-on" : ""}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
        <label className="fp-toggle" style={{ marginLeft: 8 }}>
          <input
            type="checkbox"
            checked={van}
            onChange={(e) => setVan(e.target.checked)}
          />
          <span style={{ fontSize: 13, color: "var(--fp-text-muted)" }}>vancouver only</span>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="fp-empty">
          <strong>Nothing matches that combo.</strong>
          Loosen a filter.
        </div>
      ) : (
        <div className="fp-grid">
          {filtered.map((o) => (
            <a
              key={o.id}
              href={o.url}
              target="_blank"
              rel="noopener noreferrer"
              className="fp-tile"
            >
              <div className="fp-tile__title">{o.name}</div>
              <div className="fp-tile__subtitle">{o.blurb}</div>
              <div style={{ margin: "10px 0 8px" }}>
                <p style={{ fontSize: 13, color: "var(--fp-text-muted)", lineHeight: 1.5 }}>
                  {o.why}
                </p>
              </div>
              <div className="fp-chips" style={{ marginTop: 10 }}>
                {o.city ? <span className="fp-chip">{o.city}</span> : null}
                {o.tags.map((t) => (
                  <span key={t} className="fp-chip fp-chip--accent">{t}</span>
                ))}
              </div>
              <div className="fp-tile__meta" style={{ marginTop: 10 }}>
                careers page ↗
              </div>
            </a>
          ))}
        </div>
      )}

      <p className="fp-footnote">
        Missing a great one? Tell Rader and we'll add it.
      </p>
    </>
  );
}
