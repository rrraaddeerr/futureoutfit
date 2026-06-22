"use client";

import { useState } from "react";
import Link from "next/link";
import { Hydrated } from "@/components/planner/Hydrated";
import { usePlanner } from "@/lib/planner/store";
import { remixIdeas } from "@/lib/planner/engine";
import { generateAI, profileText } from "@/lib/planner/ai";
import type { Idea, IdeaStatus } from "@/lib/planner/types";

const STATUS_LABEL: Record<IdeaStatus, string> = {
  spark: "spark",
  exploring: "exploring",
  committed: "committed",
  archived: "archived",
};
const STATUSES: IdeaStatus[] = ["spark", "exploring", "committed", "archived"];

export default function IdeasPage() {
  return (
    <Hydrated>
      <Ideas />
    </Hydrated>
  );
}

function Ideas() {
  const buckets = usePlanner((s) => s.buckets);
  const ownerName = usePlanner((s) => s.ownerName);
  const ideas = usePlanner((s) => s.ideas);
  const addIdea = usePlanner((s) => s.addIdea);
  const removeIdea = usePlanner((s) => s.removeIdea);
  const setIdeaStatus = usePlanner((s) => s.setIdeaStatus);
  const aiEnabled = usePlanner((s) => s.aiEnabled);

  const [fresh, setFresh] = useState<{ text: string; source: "remix" | "ai" }[]>([]);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState<"" | "remix" | "ai">("");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<IdeaStatus | "all">("all");

  const runRemix = () => {
    setBusy("remix");
    setError(null);
    const picks = remixIdeas(buckets, 5);
    if (picks.length === 0) {
      setError("Almost nothing to remix yet — add a few rows in Me first.");
      setBusy("");
      return;
    }
    setFresh(picks.map((text) => ({ text, source: "remix" })));
    setBusy("");
  };

  const runAI = async () => {
    setBusy("ai");
    setError(null);
    const res = await generateAI({
      mode: "ideas",
      profile: profileText(buckets, ownerName),
      count: 5,
    });
    if (res.error) {
      setError(res.error);
    } else {
      setFresh(res.items.map((text) => ({ text, source: "ai" as const })));
    }
    setBusy("");
  };

  const saveFresh = (i: number) => {
    const item = fresh[i];
    if (!item) return;
    addIdea(item.text, item.source);
    setFresh(fresh.filter((_, idx) => idx !== i));
  };

  const visible = ideas.filter((i) => filter === "all" || i.status === filter);

  return (
    <>
      <h1 className="fp-h1">Ideas Lab</h1>
      <p className="fp-sub" style={{ marginBottom: 18 }}>
        Two engines. One mixes your own answers in unexpected ways (offline, fast, free).
        The other ({aiEnabled ? "ON" : "OFF"}) uses Claude to write personalized ideas
        from your profile.
      </p>

      <div className="fp-btn-row" style={{ marginBottom: 18 }}>
        <button
          className="fp-btn fp-btn--primary"
          onClick={runRemix}
          disabled={busy !== ""}
        >
          ✦ remix mine
        </button>
        <button
          className="fp-btn fp-btn--accent"
          onClick={runAI}
          disabled={busy !== "" || !aiEnabled}
          title={aiEnabled ? "" : "Turn on AI in Settings"}
        >
          ✸ generate with AI {busy === "ai" ? "…" : ""}
        </button>
        <Link href="/planner/me" className="fp-btn fp-btn--ghost">
          → add more to mix from
        </Link>
      </div>

      {error ? (
        <div className="fp-card fp-card--alt" style={{ borderColor: "var(--fp-danger)" }}>
          <p className="fp-sub" style={{ color: "var(--fp-danger)" }}>
            {error}
          </p>
        </div>
      ) : null}

      {fresh.length > 0 ? (
        <section className="fp-section">
          <h2 className="fp-h2">Just generated</h2>
          {fresh.map((f, i) => (
            <div key={i} className="fp-idea">
              <div
                className={`fp-idea__src fp-idea__src--${f.source}`}
              >
                {f.source === "ai" ? "ai · personalized" : "remix · from your buckets"}
              </div>
              <div className="fp-idea__text">{f.text}</div>
              <div className="fp-btn-row">
                <button className="fp-btn fp-btn--primary" onClick={() => saveFresh(i)}>
                  save
                </button>
                <button
                  className="fp-btn fp-btn--ghost"
                  onClick={() => setFresh(fresh.filter((_, idx) => idx !== i))}
                >
                  pass
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="fp-section">
        <h2 className="fp-h2">Capture your own</h2>
        <form
          className="fp-add-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!manual.trim()) return;
            addIdea(manual, "manual");
            setManual("");
          }}
        >
          <input
            className="fp-input"
            placeholder="What's the half-formed thing in your head right now?"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <button className="fp-btn fp-btn--primary" disabled={!manual.trim()}>
            keep
          </button>
        </form>
      </section>

      <section className="fp-section">
        <div className="fp-section__head">
          <h2 className="fp-h2">Saved ideas</h2>
          <div className="fp-tabbar">
            <button
              className={`fp-tabbar__btn${filter === "all" ? " is-on" : ""}`}
              onClick={() => setFilter("all")}
            >
              all ({ideas.length})
            </button>
            {STATUSES.map((s) => {
              const n = ideas.filter((i) => i.status === s).length;
              return (
                <button
                  key={s}
                  className={`fp-tabbar__btn${filter === s ? " is-on" : ""}`}
                  onClick={() => setFilter(s)}
                >
                  {STATUS_LABEL[s]} ({n})
                </button>
              );
            })}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="fp-empty">
            <strong>No saved ideas yet.</strong>
            Generate some above, or capture your own. Save the ones that make you grin.
          </div>
        ) : (
          visible.map((idea) => (
            <IdeaRow
              key={idea.id}
              idea={idea}
              onStatus={(s) => setIdeaStatus(idea.id, s)}
              onRemove={() => removeIdea(idea.id)}
            />
          ))
        )}
      </section>
    </>
  );
}

function IdeaRow({
  idea,
  onStatus,
  onRemove,
}: {
  idea: Idea;
  onStatus: (s: IdeaStatus) => void;
  onRemove: () => void;
}) {
  return (
    <div className="fp-idea">
      <div className={`fp-idea__src fp-idea__src--${idea.source}`}>
        {idea.source === "ai" ? "ai" : idea.source === "remix" ? "remix" : "yours"} ·{" "}
        <span className="fp-status">{idea.status}</span>
      </div>
      <div className="fp-idea__text">{idea.text}</div>
      <div className="fp-btn-row">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`fp-btn ${idea.status === s ? "fp-btn--primary" : "fp-btn--ghost"}`}
            onClick={() => onStatus(s)}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
        <button className="fp-btn fp-btn--danger" onClick={onRemove} style={{ marginLeft: "auto" }}>
          delete
        </button>
      </div>
    </div>
  );
}
