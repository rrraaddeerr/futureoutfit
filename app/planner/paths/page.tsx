"use client";

import Link from "next/link";
import { Hydrated } from "@/components/planner/Hydrated";
import { usePlanner } from "@/lib/planner/store";
import { PATHS, BUCKET_MAP } from "@/lib/planner/data";
import { rankPaths } from "@/lib/planner/engine";

export default function PathsPage() {
  return (
    <Hydrated>
      <Paths />
    </Hydrated>
  );
}

function Paths() {
  const buckets = usePlanner((s) => s.buckets);
  const reactions = usePlanner((s) => s.pathReactions);

  const ranked = rankPaths(PATHS, buckets);
  const featured = ranked.find((r) => r.item.featured);
  const rest = ranked.filter((r) => !r.item.featured);
  const yes = rest.filter((r) => reactions[r.item.id]?.reaction === "yes");
  const maybe = rest.filter((r) => reactions[r.item.id]?.reaction === "maybe");
  const undecided = rest.filter((r) => !reactions[r.item.id]?.reaction);
  const no = rest.filter((r) => reactions[r.item.id]?.reaction === "no");

  const renderTile = (r: (typeof ranked)[number]) => {
    const reaction = reactions[r.item.id]?.reaction;
    return (
      <Link key={r.item.id} href={`/planner/paths/${r.item.id}`} className="fp-tile">
        <div className="fp-tile__title">{r.item.title}</div>
        <div className="fp-tile__subtitle">{r.item.shortPitch}</div>
        <div className="fp-tile__meta" style={{ marginTop: 8 }}>
          {r.matchedBuckets.length > 0
            ? `matches ${r.matchedBuckets.map((k) => BUCKET_MAP[k].title.toLowerCase()).slice(0, 3).join(" · ")}`
            : "—"}
        </div>
        {reaction ? (
          <div style={{ marginTop: 10 }}>
            <span
              className="fp-status"
              style={{
                background:
                  reaction === "yes"
                    ? "rgba(92,138,106,0.16)"
                    : reaction === "maybe"
                    ? "rgba(185,120,61,0.16)"
                    : "rgba(199,101,88,0.14)",
                color:
                  reaction === "yes"
                    ? "var(--fp-accent-press)"
                    : reaction === "maybe"
                    ? "var(--fp-warn)"
                    : "var(--fp-danger)",
              }}
            >
              {reaction === "yes" ? "yes ✓" : reaction === "maybe" ? "maybe" : "not me"}
            </span>
          </div>
        ) : null}
      </Link>
    );
  };

  return (
    <>
      <h1 className="fp-h1">Paths</h1>
      <p className="fp-sub" style={{ marginBottom: 14 }}>
        Real-world shapes work can take. Read, react, save the ones that pull you. None of
        them is THE answer — the answer is probably stitched from two or three.
      </p>

      <Link
        href="/planner/paths/jobs"
        className="fp-btn fp-btn--accent"
        style={{ marginBottom: 18, display: "inline-block" }}
      >
        ◆ Real orgs hiring now (SOCAN, agencies, festivals…) →
      </Link>

      {featured ? (
        <div className="fp-card fp-card--featured">
          <div className="fp-chips" style={{ marginBottom: 10 }}>
            <span className="fp-chip fp-chip--accent">featured · from rader</span>
          </div>
          <h2 className="fp-h2">{featured.item.title}</h2>
          <p className="fp-sub" style={{ marginBottom: 12 }}>{featured.item.shortPitch}</p>
          <Link href={`/planner/paths/${featured.item.id}`} className="fp-btn fp-btn--primary">
            read the pitch →
          </Link>
        </div>
      ) : null}

      {yes.length > 0 ? (
        <section className="fp-section">
          <h3 className="fp-h3" style={{ marginBottom: 10 }}>Your yes pile</h3>
          <div className="fp-grid">{yes.map(renderTile)}</div>
        </section>
      ) : null}

      {maybe.length > 0 ? (
        <section className="fp-section">
          <h3 className="fp-h3" style={{ marginBottom: 10 }}>Maybe</h3>
          <div className="fp-grid">{maybe.map(renderTile)}</div>
        </section>
      ) : null}

      <section className="fp-section">
        <h3 className="fp-h3" style={{ marginBottom: 10 }}>
          {undecided.length === rest.length ? "The library" : "Still to look at"}
        </h3>
        <div className="fp-grid">{undecided.map(renderTile)}</div>
      </section>

      {no.length > 0 ? (
        <section className="fp-section">
          <h3 className="fp-h3" style={{ marginBottom: 10 }}>Not for me</h3>
          <div className="fp-grid">{no.map(renderTile)}</div>
        </section>
      ) : null}
    </>
  );
}
