"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hydrated } from "@/components/planner/Hydrated";
import { usePlanner } from "@/lib/planner/store";
import { PATHS, BUCKET_MAP } from "@/lib/planner/data";

export default function PathPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const path = PATHS.find((p) => p.id === id);
  if (!path) notFound();

  return (
    <Hydrated>
      <PathDetail pathId={path.id} />
    </Hydrated>
  );
}

function PathDetail({ pathId }: { pathId: string }) {
  const path = PATHS.find((p) => p.id === pathId)!;
  const reaction = usePlanner((s) => s.pathReactions[pathId]?.reaction ?? null);
  const notes = usePlanner((s) => s.pathReactions[pathId]?.notes ?? "");
  const setReaction = usePlanner((s) => s.setPathReaction);
  const setNotes = usePlanner((s) => s.setPathNotes);
  const buckets = usePlanner((s) => s.buckets);

  const matched = path.pullsFrom.filter((k) => buckets[k].length > 0);
  const [localNotes, setLocalNotes] = useState(notes);

  const onChooseReaction = (next: "yes" | "maybe" | "no") => {
    setReaction(pathId, reaction === next ? null : next);
  };

  return (
    <>
      <p className="fp-micro" style={{ marginBottom: 6 }}>
        <Link href="/planner/paths" style={{ color: "inherit", textDecoration: "none" }}>
          ← all paths
        </Link>
      </p>

      {path.featured ? (
        <div className="fp-chips" style={{ marginBottom: 10 }}>
          <span className="fp-chip fp-chip--accent">featured · from rader</span>
        </div>
      ) : null}

      <h1 className="fp-h1">{path.title}</h1>
      <p className="fp-sub" style={{ marginBottom: 18, fontSize: 17, lineHeight: 1.5 }}>
        {path.shortPitch}
      </p>

      <section className="fp-card">
        <h3 className="fp-h3" style={{ marginBottom: 10 }}>The full pitch</h3>
        <div className="fp-path-pitch">{path.longPitch}</div>
      </section>

      <section className="fp-card">
        <h3 className="fp-h3" style={{ marginBottom: 10 }}>A day in this life</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
          {path.dayToDay.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </section>

      {matched.length > 0 ? (
        <section className="fp-card fp-card--alt">
          <h3 className="fp-h3" style={{ marginBottom: 10 }}>
            Pulls from things you've already named
          </h3>
          <div className="fp-chips">
            {matched.map((k) => (
              <Link
                key={k}
                href={`/planner/me/${k}`}
                className="fp-chip fp-chip--accent"
                style={{ textDecoration: "none" }}
              >
                {BUCKET_MAP[k].emoji} {BUCKET_MAP[k].title}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="fp-card fp-card--alt">
          <p className="fp-sub">
            No bucket overlap yet — try filling{" "}
            {path.pullsFrom.slice(0, 3).map((k, i) => (
              <span key={k}>
                {i > 0 ? ", " : ""}
                <Link
                  href={`/planner/me/${k}`}
                  style={{ color: "var(--fp-primary)", textDecoration: "underline" }}
                >
                  {BUCKET_MAP[k].title}
                </Link>
              </span>
            ))}{" "}
            and come back.
          </p>
        </section>
      )}

      <section className="fp-card">
        <h3 className="fp-h3" style={{ marginBottom: 10 }}>Your reaction</h3>
        <div className="fp-reactions">
          <button
            className={`fp-react fp-react--yes${reaction === "yes" ? " is-on" : ""}`}
            onClick={() => onChooseReaction("yes")}
          >
            yes — pulls me
          </button>
          <button
            className={`fp-react fp-react--maybe${reaction === "maybe" ? " is-on" : ""}`}
            onClick={() => onChooseReaction("maybe")}
          >
            maybe
          </button>
          <button
            className={`fp-react fp-react--no${reaction === "no" ? " is-on" : ""}`}
            onClick={() => onChooseReaction("no")}
          >
            not me
          </button>
        </div>
        <textarea
          className="fp-textarea"
          placeholder="Anything to remember about this one — what part you liked, what you'd change…"
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={() => setNotes(pathId, localNotes)}
        />
      </section>
    </>
  );
}
