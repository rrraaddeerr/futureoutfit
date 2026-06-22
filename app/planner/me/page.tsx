"use client";

import Link from "next/link";
import { Hydrated } from "@/components/planner/Hydrated";
import { usePlanner } from "@/lib/planner/store";
import { BUCKETS } from "@/lib/planner/data";

export default function MePage() {
  return (
    <Hydrated>
      <Me />
    </Hydrated>
  );
}

function Me() {
  const buckets = usePlanner((s) => s.buckets);
  const total = BUCKETS.reduce((sum, b) => sum + buckets[b.key].length, 0);

  return (
    <>
      <h1 className="fp-h1">Me</h1>
      <p className="fp-sub" style={{ marginBottom: 18 }}>
        Twelve buckets. Skip any. You can come back. The richer this gets, the better the
        Ideas Lab gets at remixing it.
      </p>

      {total === 0 ? (
        <div className="fp-empty">
          <strong>Nothing to lose</strong>
          Pick one bucket and put three things in it. That's the whole assignment.
        </div>
      ) : null}

      <div className="fp-grid">
        {BUCKETS.map((b) => {
          const count = buckets[b.key].length;
          return (
            <Link key={b.key} href={`/planner/me/${b.key}`} className="fp-tile">
              <div className="fp-tile__emoji">{b.emoji}</div>
              <div className="fp-tile__title">{b.title}</div>
              <div className="fp-tile__subtitle">{b.subtitle}</div>
              <div className="fp-tile__meta">
                {count === 0 ? "empty" : `${count} ${count === 1 ? "row" : "rows"}`}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
