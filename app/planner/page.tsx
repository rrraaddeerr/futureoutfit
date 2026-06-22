"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Hydrated } from "@/components/planner/Hydrated";
import { usePlanner } from "@/lib/planner/store";
import { affirmationOfTheDay, remixIdea } from "@/lib/planner/engine";
import { BUCKETS } from "@/lib/planner/data";

export default function PlannerHome() {
  return (
    <Hydrated>
      <Home />
    </Hydrated>
  );
}

function Home() {
  const owner = usePlanner((s) => s.ownerName);
  const setOwner = usePlanner((s) => s.setOwnerName);
  const buckets = usePlanner((s) => s.buckets);
  const affirmations = usePlanner((s) => s.affirmations);
  const addWin = usePlanner((s) => s.addWin);
  const wins = usePlanner((s) => s.wins);
  const addIdea = usePlanner((s) => s.addIdea);

  const customAffirmations = affirmations.map((a) => a.text);
  const today = useMemo(
    () => affirmationOfTheDay(customAffirmations, new Date()),
    [customAffirmations.join("|")]
  );

  const totalEntries = BUCKETS.reduce(
    (sum, b) => sum + buckets[b.key].length,
    0
  );

  const [winText, setWinText] = useState("");
  const [showName, setShowName] = useState(!owner);
  const [nameDraft, setNameDraft] = useState(owner);

  const [spark, setSpark] = useState<string | null>(null);
  const trySpark = () => {
    const idea = remixIdea(buckets);
    setSpark(idea ?? "Add a few things in Me first — even three rows. Then come back and ask for a spark.");
  };
  const saveSpark = () => {
    if (!spark) return;
    addIdea(spark, "remix");
    setSpark(null);
  };

  return (
    <>
      {showName ? (
        <div className="fp-card">
          <h2 className="fp-h2">Who is this for?</h2>
          <p className="fp-sub" style={{ marginBottom: 12 }}>
            One word. Pick anything. You can change it later.
          </p>
          <form
            className="fp-add-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nameDraft.trim()) return;
              setOwner(nameDraft);
              setShowName(false);
            }}
          >
            <input
              autoFocus
              className="fp-input"
              placeholder="Amani"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
            />
            <button type="submit" className="fp-btn fp-btn--primary">
              start
            </button>
          </form>
        </div>
      ) : null}

      <h1 className="fp-display">
        {owner ? <>hi {owner.toLowerCase()},</> : <>today.</>}
        <br />
        <em>this is yours.</em>
      </h1>
      <p className="fp-sub" style={{ marginBottom: 24 }}>
        A quiet place to gather who you are and let the shape of your work catch up.
      </p>

      <div className="fp-affirmation">
        <div className="fp-affirmation__label">today's note</div>
        <div className="fp-affirmation__text">{today}</div>
      </div>

      <section className="fp-section">
        <div className="fp-section__head">
          <div>
            <h2 className="fp-h2">A spark, on demand</h2>
            <p className="fp-sub">Mixes your own answers into a "what if" prompt.</p>
          </div>
          <div className="fp-btn-row">
            <button className="fp-btn fp-btn--primary" onClick={trySpark}>
              ✦ give me a spark
            </button>
          </div>
        </div>
        {spark ? (
          <div className="fp-card">
            <p style={{ fontSize: 17, lineHeight: 1.55, marginBottom: 14 }}>{spark}</p>
            <div className="fp-btn-row">
              <button className="fp-btn fp-btn--accent" onClick={saveSpark}>
                save to ideas
              </button>
              <button className="fp-btn fp-btn--ghost" onClick={trySpark}>
                another
              </button>
              <button className="fp-btn fp-btn--ghost" onClick={() => setSpark(null)}>
                dismiss
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="fp-section">
        <div className="fp-section__head">
          <h2 className="fp-h2">Quick win</h2>
          <Link href="/planner/believe#wins" className="fp-btn fp-btn--ghost">
            all wins →
          </Link>
        </div>
        <form
          className="fp-add-form"
          onSubmit={(e) => {
            e.preventDefault();
            addWin(winText);
            setWinText("");
          }}
        >
          <input
            className="fp-input"
            placeholder="What's one small thing you did today?"
            value={winText}
            onChange={(e) => setWinText(e.target.value)}
          />
          <button className="fp-btn fp-btn--accent" disabled={!winText.trim()}>
            log
          </button>
        </form>
        {wins.length === 0 ? (
          <p className="fp-sub" style={{ marginTop: -6 }}>
            Even very small things count. <em>Especially</em> very small things.
          </p>
        ) : (
          <p className="fp-sub" style={{ marginTop: -6 }}>
            {wins.length} {wins.length === 1 ? "win" : "wins"} logged. Receipts.
          </p>
        )}
      </section>

      <section className="fp-section">
        <h2 className="fp-h2">Where to next</h2>
        <div className="fp-grid">
          <Link href="/planner/me" className="fp-tile">
            <div className="fp-tile__emoji">✦</div>
            <div className="fp-tile__title">Me</div>
            <div className="fp-tile__subtitle">
              {totalEntries === 0
                ? "Start filling who you are"
                : `${totalEntries} rows so far`}
            </div>
            <div className="fp-tile__meta">interests · loves · dreams · 9 more</div>
          </Link>
          <Link href="/planner/paths" className="fp-tile">
            <div className="fp-tile__emoji">▸</div>
            <div className="fp-tile__title">Paths</div>
            <div className="fp-tile__subtitle">
              Real-world roles + the featured agency
            </div>
            <div className="fp-tile__meta">yes / maybe / not me</div>
          </Link>
          <Link href="/planner/ideas" className="fp-tile">
            <div className="fp-tile__emoji">✸</div>
            <div className="fp-tile__title">Ideas Lab</div>
            <div className="fp-tile__subtitle">
              Remix your stuff into unexpected shapes
            </div>
            <div className="fp-tile__meta">offline + optional AI</div>
          </Link>
          <Link href="/planner/believe" className="fp-tile">
            <div className="fp-tile__emoji">♡</div>
            <div className="fp-tile__title">Believe</div>
            <div className="fp-tile__subtitle">
              Affirmations, reframes, letters to future you
            </div>
            <div className="fp-tile__meta">
              {wins.length} wins · {affirmations.length} saved
            </div>
          </Link>
        </div>
      </section>

      <p className="fp-footnote">
        Everything you write here stays on this device. No accounts, no cloud.
      </p>
    </>
  );
}
