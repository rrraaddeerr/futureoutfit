"use client";

import { useMemo, useState } from "react";
import { Hydrated } from "@/components/planner/Hydrated";
import { usePlanner } from "@/lib/planner/store";
import {
  AFFIRMATION_SEEDS,
  GRATITUDE_PROMPTS,
  LETTER_PROMPTS,
  VISUALIZATION_PROMPTS,
} from "@/lib/planner/data";
import { affirmationOfTheDay, reframeDoubt } from "@/lib/planner/engine";

type Section = "affirmations" | "wins" | "reframes" | "visualize" | "gratitude" | "letters";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "affirmations", label: "Affirm" },
  { key: "wins", label: "Wins" },
  { key: "reframes", label: "Reframe" },
  { key: "visualize", label: "Visualize" },
  { key: "gratitude", label: "Gratitude" },
  { key: "letters", label: "Letters" },
];

export default function BelievePage() {
  return (
    <Hydrated>
      <Believe />
    </Hydrated>
  );
}

function Believe() {
  const [section, setSection] = useState<Section>("affirmations");

  return (
    <>
      <h1 className="fp-h1">Believe</h1>
      <p className="fp-sub" style={{ marginBottom: 18 }}>
        Tools, not theatre. Use one. Or use them all. Or just sit with the affirmation
        on the home screen and call that enough.
      </p>

      <div className="fp-tabbar">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            className={`fp-tabbar__btn${section === s.key ? " is-on" : ""}`}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "affirmations" ? <Affirmations /> : null}
      {section === "wins" ? <Wins /> : null}
      {section === "reframes" ? <Reframes /> : null}
      {section === "visualize" ? <Visualizations /> : null}
      {section === "gratitude" ? <Gratitudes /> : null}
      {section === "letters" ? <Letters /> : null}
    </>
  );
}

// ---------------------------------------------------------------- Affirmations

function Affirmations() {
  const affirmations = usePlanner((s) => s.affirmations);
  const add = usePlanner((s) => s.addAffirmation);
  const toggleFav = usePlanner((s) => s.toggleFavoriteAffirmation);
  const remove = usePlanner((s) => s.removeAffirmation);
  const [text, setText] = useState("");

  const customTexts = affirmations.map((a) => a.text);
  const today = useMemo(() => affirmationOfTheDay(customTexts, new Date()), [customTexts.join("|")]);

  return (
    <section id="affirmations" className="fp-section" style={{ marginTop: 6 }}>
      <div className="fp-affirmation">
        <div className="fp-affirmation__label">today</div>
        <div className="fp-affirmation__text">{today}</div>
      </div>

      <h2 className="fp-h2">Write your own</h2>
      <p className="fp-sub" style={{ marginBottom: 10 }}>
        The best affirmations come from your own mouth. Steal a seed below if you're stuck.
      </p>
      <form
        className="fp-add-form"
        onSubmit={(e) => {
          e.preventDefault();
          add(text);
          setText("");
        }}
      >
        <input
          className="fp-input"
          placeholder="I am someone who…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="fp-btn fp-btn--primary" disabled={!text.trim()}>
          add
        </button>
      </form>

      {affirmations.length > 0 ? (
        <>
          <h3 className="fp-h3" style={{ marginBottom: 8 }}>Yours</h3>
          {affirmations.map((a) => (
            <div className="fp-row" key={a.id}>
              <div className="fp-row__text">
                {a.favorite ? "★ " : ""}
                {a.text}
              </div>
              <div className="fp-btn-row">
                <button className="fp-btn fp-btn--ghost" onClick={() => toggleFav(a.id)}>
                  {a.favorite ? "★" : "☆"}
                </button>
                <button className="fp-btn fp-btn--danger" onClick={() => remove(a.id)}>
                  ×
                </button>
              </div>
            </div>
          ))}
        </>
      ) : null}

      <h3 className="fp-h3" style={{ margin: "18px 0 8px" }}>Seeds</h3>
      {AFFIRMATION_SEEDS.slice(0, 8).map((s, i) => (
        <div className="fp-row" key={i}>
          <div className="fp-row__text">{s}</div>
          <button
            className="fp-btn fp-btn--ghost"
            onClick={() => add(s, false)}
            title="Save to mine"
          >
            +
          </button>
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------- Wins

function Wins() {
  const wins = usePlanner((s) => s.wins);
  const add = usePlanner((s) => s.addWin);
  const remove = usePlanner((s) => s.removeWin);
  const [text, setText] = useState("");

  return (
    <section id="wins" className="fp-section" style={{ marginTop: 6 }}>
      <h2 className="fp-h2">Wins log</h2>
      <p className="fp-sub" style={{ marginBottom: 10 }}>
        Receipts. The smaller they are, the more they count when the brain tries to gaslight you.
      </p>

      <form
        className="fp-add-form"
        onSubmit={(e) => {
          e.preventDefault();
          add(text);
          setText("");
        }}
      >
        <input
          className="fp-input"
          placeholder="Sent the email. Spoke up in the meeting. Slept enough."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="fp-btn fp-btn--accent" disabled={!text.trim()}>
          log
        </button>
      </form>

      {wins.length === 0 ? (
        <div className="fp-empty">
          <strong>No wins logged yet.</strong>
          Even &quot;I made the bed&quot; counts.
        </div>
      ) : (
        wins.map((w) => (
          <div className="fp-row" key={w.id}>
            <div className="fp-row__text">
              {w.text}
              <span className="fp-row__note">
                {new Date(w.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <button className="fp-btn fp-btn--danger" onClick={() => remove(w.id)}>
              ×
            </button>
          </div>
        ))
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Reframes

function Reframes() {
  const reframes = usePlanner((s) => s.reframes);
  const add = usePlanner((s) => s.addReframe);
  const remove = usePlanner((s) => s.removeReframe);
  const [doubt, setDoubt] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const run = () => {
    if (!doubt.trim()) return;
    setSuggestions(reframeDoubt(doubt));
  };

  return (
    <section className="fp-section" style={{ marginTop: 6 }}>
      <h2 className="fp-h2">Reframe a doubt</h2>
      <p className="fp-sub" style={{ marginBottom: 10 }}>
        Type the thing the mean voice says. We'll counter-offer.
      </p>

      <textarea
        className="fp-textarea"
        placeholder={`e.g. "I'm too quiet for this" or "no one would pay for that"`}
        value={doubt}
        onChange={(e) => setDoubt(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      <div className="fp-btn-row" style={{ marginBottom: 14 }}>
        <button className="fp-btn fp-btn--primary" onClick={run} disabled={!doubt.trim()}>
          reframe
        </button>
        <button
          className="fp-btn fp-btn--ghost"
          onClick={() => {
            setDoubt("");
            setSuggestions([]);
          }}
        >
          clear
        </button>
      </div>

      {suggestions.length > 0 ? (
        <>
          <h3 className="fp-h3" style={{ marginBottom: 8 }}>Try these on</h3>
          {suggestions.map((s, i) => (
            <div className="fp-row" key={i}>
              <div className="fp-row__text">{s}</div>
              <button
                className="fp-btn fp-btn--ghost"
                onClick={() => add(doubt, s)}
                title="save this reframe"
              >
                save
              </button>
            </div>
          ))}
        </>
      ) : null}

      {reframes.length > 0 ? (
        <>
          <h3 className="fp-h3" style={{ margin: "18px 0 8px" }}>Your saved reframes</h3>
          {reframes.map((r) => (
            <div className="fp-row" key={r.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <p className="fp-micro" style={{ marginBottom: 4 }}>doubt</p>
                  <p style={{ marginBottom: 8 }}>{r.doubt}</p>
                  <p className="fp-micro" style={{ marginBottom: 4 }}>reframe</p>
                  <p style={{ color: "var(--fp-accent-press)" }}>{r.reframe}</p>
                </div>
                <button className="fp-btn fp-btn--danger" onClick={() => remove(r.id)}>
                  ×
                </button>
              </div>
            </div>
          ))}
        </>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------- Visualize

function Visualizations() {
  const visualizations = usePlanner((s) => s.visualizations);
  const add = usePlanner((s) => s.addVisualization);
  const remove = usePlanner((s) => s.removeVisualization);
  const [prompt, setPrompt] = useState(() => VISUALIZATION_PROMPTS[0]);
  const [text, setText] = useState("");

  const shuffle = () => {
    const next =
      VISUALIZATION_PROMPTS[
        Math.floor(Math.random() * VISUALIZATION_PROMPTS.length)
      ];
    setPrompt(next);
  };

  return (
    <section className="fp-section" style={{ marginTop: 6 }}>
      <h2 className="fp-h2">Visualization</h2>
      <p className="fp-sub" style={{ marginBottom: 14 }}>
        Read the prompt. Close your eyes for 30 seconds. Then write what you saw.
      </p>

      <div className="fp-card">
        <p style={{ fontSize: 17, lineHeight: 1.5, marginBottom: 12 }}>{prompt}</p>
        <button className="fp-btn fp-btn--ghost" onClick={shuffle}>
          ↻ another prompt
        </button>
      </div>

      <textarea
        className="fp-textarea"
        placeholder="What did you see, hear, feel?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ marginBottom: 10, minHeight: 120 }}
      />
      <button
        className="fp-btn fp-btn--primary"
        onClick={() => {
          add(prompt, text);
          setText("");
        }}
        disabled={!text.trim()}
      >
        save
      </button>

      {visualizations.length > 0 ? (
        <>
          <h3 className="fp-h3" style={{ margin: "18px 0 8px" }}>Saved</h3>
          {visualizations.map((v) => (
            <div className="fp-card" key={v.id}>
              <p className="fp-micro" style={{ marginBottom: 4 }}>{v.prompt}</p>
              <p style={{ whiteSpace: "pre-wrap", marginBottom: 10 }}>{v.response}</p>
              <button className="fp-btn fp-btn--danger" onClick={() => remove(v.id)}>
                delete
              </button>
            </div>
          ))}
        </>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------- Gratitude

function Gratitudes() {
  const gratitudes = usePlanner((s) => s.gratitudes);
  const add = usePlanner((s) => s.addGratitude);
  const remove = usePlanner((s) => s.removeGratitude);
  const [text, setText] = useState("");
  const [prompt] = useState(
    () => GRATITUDE_PROMPTS[Math.floor(Math.random() * GRATITUDE_PROMPTS.length)]
  );

  return (
    <section className="fp-section" style={{ marginTop: 6 }}>
      <h2 className="fp-h2">Gratitude</h2>
      <p className="fp-sub" style={{ marginBottom: 14 }}>{prompt}</p>

      <form
        className="fp-add-form"
        onSubmit={(e) => {
          e.preventDefault();
          add(text);
          setText("");
        }}
      >
        <input
          className="fp-input"
          placeholder="One thing…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="fp-btn fp-btn--accent" disabled={!text.trim()}>
          log
        </button>
      </form>

      {gratitudes.length === 0 ? null : (
        <>
          {gratitudes.map((g) => (
            <div className="fp-row" key={g.id}>
              <div className="fp-row__text">
                {g.text}
                <span className="fp-row__note">
                  {new Date(g.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <button className="fp-btn fp-btn--danger" onClick={() => remove(g.id)}>
                ×
              </button>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Letters

function Letters() {
  const letters = usePlanner((s) => s.letters);
  const add = usePlanner((s) => s.addLetter);
  const open = usePlanner((s) => s.openLetter);
  const remove = usePlanner((s) => s.removeLetter);

  const [body, setBody] = useState("");
  const [days, setDays] = useState(30);
  const [promptIdx, setPromptIdx] = useState(0);
  const currentPrompt = LETTER_PROMPTS[promptIdx % LETTER_PROMPTS.length];

  const send = () => {
    if (!body.trim()) return;
    const unlockAt = Date.now() + days * 24 * 60 * 60 * 1000;
    add(body, unlockAt);
    setBody("");
  };

  return (
    <section className="fp-section" style={{ marginTop: 6 }}>
      <h2 className="fp-h2">Letter to future you</h2>
      <p className="fp-sub" style={{ marginBottom: 12 }}>
        Write today. Locks until the date you set. She'll thank you.
      </p>

      <div className="fp-card">
        <p style={{ fontSize: 15, lineHeight: 1.55, marginBottom: 8 }}>{currentPrompt}</p>
        <button
          className="fp-btn fp-btn--ghost"
          onClick={() => setPromptIdx((i) => i + 1)}
        >
          ↻ another prompt
        </button>
      </div>

      <textarea
        className="fp-textarea"
        placeholder="Dear future me…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        style={{ marginBottom: 10, minHeight: 180 }}
      />
      <div className="fp-btn-row" style={{ marginBottom: 18 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--fp-text-muted)" }}>
          unlock in
          <input
            type="number"
            min={1}
            max={3650}
            value={days}
            onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
            className="fp-input"
            style={{ width: 90 }}
          />
          days
        </label>
        <button className="fp-btn fp-btn--primary" onClick={send} disabled={!body.trim()}>
          send into the future
        </button>
      </div>

      {letters.length === 0 ? (
        <div className="fp-empty">
          <strong>No letters yet.</strong>
          Even one is something.
        </div>
      ) : (
        letters.map((l) => {
          const now = Date.now();
          const locked = now < l.unlockAt && !l.opened;
          const unlockDate = new Date(l.unlockAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          if (locked) {
            return (
              <div className="fp-letter fp-letter--locked" key={l.id}>
                <p>
                  ✉ locked until <strong>{unlockDate}</strong>
                </p>
              </div>
            );
          }
          return (
            <div className="fp-letter" key={l.id}>
              <p className="fp-micro" style={{ marginBottom: 6 }}>
                written {new Date(l.createdAt).toLocaleDateString()} · unlocked {unlockDate}
              </p>
              {!l.opened ? (
                <button className="fp-btn fp-btn--primary" onClick={() => open(l.id)}>
                  open
                </button>
              ) : (
                <>
                  <div className="fp-letter__body">{l.body}</div>
                  <button
                    className="fp-btn fp-btn--danger"
                    onClick={() => remove(l.id)}
                    style={{ marginTop: 10 }}
                  >
                    delete
                  </button>
                </>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}
