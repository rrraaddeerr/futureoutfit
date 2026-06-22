"use client";

import { useRef, useState } from "react";
import { Hydrated } from "@/components/planner/Hydrated";
import { usePlanner } from "@/lib/planner/store";

export default function SettingsPage() {
  return (
    <Hydrated>
      <Settings />
    </Hydrated>
  );
}

function Settings() {
  const owner = usePlanner((s) => s.ownerName);
  const setOwner = usePlanner((s) => s.setOwnerName);
  const aiEnabled = usePlanner((s) => s.aiEnabled);
  const setAiEnabled = usePlanner((s) => s.setAiEnabled);
  const reset = usePlanner((s) => s.reset);
  const importJson = usePlanner((s) => s.importJson);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [aiCheck, setAiCheck] = useState<"" | "checking" | "ok" | "off" | "error">("");

  const exportAll = () => {
    const state = usePlanner.getState();
    const blob = {
      buckets: state.buckets,
      ideas: state.ideas,
      pathReactions: state.pathReactions,
      affirmations: state.affirmations,
      wins: state.wins,
      reframes: state.reframes,
      visualizations: state.visualizations,
      gratitudes: state.gratitudes,
      letters: state.letters,
      ownerName: state.ownerName,
      exportedAt: new Date().toISOString(),
      app: "future-planner",
    };
    const text = JSON.stringify(blob, null, 2);
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `future-planner-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const ok = importJson(parsed);
      setImportMsg(ok ? "Imported." : "That file didn't look like a Future Planner export.");
    } catch {
      setImportMsg("Couldn't read that file.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const pingAI = async () => {
    setAiCheck("checking");
    try {
      const res = await fetch("/planner/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "affirmations", profile: "", count: 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiCheck("ok");
      } else if (data.error?.includes("ANTHROPIC_API_KEY")) {
        setAiCheck("off");
      } else {
        setAiCheck("error");
      }
    } catch {
      setAiCheck("error");
    }
  };

  return (
    <>
      <h1 className="fp-h1">Settings</h1>

      <section className="fp-card">
        <h2 className="fp-h2">Who</h2>
        <p className="fp-sub" style={{ marginBottom: 10 }}>
          The name shown on the top bar. Affects nothing else.
        </p>
        <div className="fp-add-form" style={{ marginBottom: 0 }}>
          <input
            className="fp-input"
            placeholder="name"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </div>
      </section>

      <section className="fp-card">
        <h2 className="fp-h2">AI mode</h2>
        <p className="fp-sub" style={{ marginBottom: 12 }}>
          When ON, Ideas Lab can generate personalized ideas from your profile via Claude
          on the server. The API key lives in server env (<code>ANTHROPIC_API_KEY</code>),
          never in your browser.
        </p>
        <label className="fp-toggle" style={{ marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(e) => setAiEnabled(e.target.checked)}
          />
          <span style={{ fontSize: 14 }}>
            {aiEnabled ? "On — Ideas Lab will offer AI generation" : "Off — offline remix only"}
          </span>
        </label>
        <div className="fp-btn-row">
          <button className="fp-btn fp-btn--ghost" onClick={pingAI} disabled={aiCheck === "checking"}>
            test connection
          </button>
          {aiCheck === "ok" ? <span style={{ color: "var(--fp-accent-press)" }}>✓ working</span> : null}
          {aiCheck === "off" ? (
            <span style={{ color: "var(--fp-warn)" }}>
              key missing — add <code>ANTHROPIC_API_KEY</code> in .env.local
            </span>
          ) : null}
          {aiCheck === "error" ? <span style={{ color: "var(--fp-danger)" }}>error — check console</span> : null}
        </div>
      </section>

      <section className="fp-card">
        <h2 className="fp-h2">Your data</h2>
        <p className="fp-sub" style={{ marginBottom: 12 }}>
          Lives in this browser only. Export to back up; re-import to restore.
        </p>
        <div className="fp-btn-row">
          <button className="fp-btn fp-btn--primary" onClick={exportAll}>
            export to JSON
          </button>
          <button className="fp-btn" onClick={() => fileRef.current?.click()}>
            import from JSON
          </button>
          <input
            type="file"
            accept="application/json"
            ref={fileRef}
            onChange={onImport}
            style={{ display: "none" }}
          />
        </div>
        {importMsg ? (
          <p className="fp-sub" style={{ marginTop: 10 }}>{importMsg}</p>
        ) : null}
      </section>

      <section className="fp-card" style={{ borderColor: "var(--fp-danger)" }}>
        <h2 className="fp-h2">Reset</h2>
        <p className="fp-sub" style={{ marginBottom: 12 }}>
          Wipes everything in this browser. Cannot undo. Export first if you want a copy.
        </p>
        {confirmReset ? (
          <div className="fp-btn-row">
            <button
              className="fp-btn fp-btn--danger"
              onClick={() => {
                reset();
                setConfirmReset(false);
              }}
              style={{ background: "var(--fp-danger)", color: "#fff" }}
            >
              yes, wipe everything
            </button>
            <button className="fp-btn fp-btn--ghost" onClick={() => setConfirmReset(false)}>
              cancel
            </button>
          </div>
        ) : (
          <button className="fp-btn fp-btn--danger" onClick={() => setConfirmReset(true)}>
            wipe all data
          </button>
        )}
      </section>

      <p className="fp-footnote">
        Future Planner · a quiet room inside rent.co · made for you, kept on your device.
      </p>
    </>
  );
}
