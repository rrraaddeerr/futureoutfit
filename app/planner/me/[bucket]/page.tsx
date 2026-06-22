"use client";

import { useState, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hydrated } from "@/components/planner/Hydrated";
import { usePlanner } from "@/lib/planner/store";
import { BUCKET_MAP, type BucketKey } from "@/lib/planner/data";

export default function BucketPage({
  params,
}: {
  params: Promise<{ bucket: string }>;
}) {
  const { bucket } = use(params);
  const def = BUCKET_MAP[bucket as BucketKey];
  if (!def) notFound();

  return (
    <Hydrated>
      <Bucket bucketKey={def.key} />
    </Hydrated>
  );
}

function Bucket({ bucketKey }: { bucketKey: BucketKey }) {
  const def = BUCKET_MAP[bucketKey];
  const entries = usePlanner((s) => s.buckets[bucketKey]);
  const addEntry = usePlanner((s) => s.addEntry);
  const updateEntry = usePlanner((s) => s.updateEntry);
  const removeEntry = usePlanner((s) => s.removeEntry);

  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editNote, setEditNote] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addEntry(bucketKey, text, note || undefined);
    setText("");
    setNote("");
    setShowNote(false);
  };

  const startEdit = (id: string, t: string, n?: string) => {
    setEditId(id);
    setEditText(t);
    setEditNote(n ?? "");
  };
  const saveEdit = () => {
    if (!editId) return;
    updateEntry(bucketKey, editId, {
      text: editText.trim(),
      note: editNote.trim() || undefined,
    });
    setEditId(null);
  };

  return (
    <>
      <p className="fp-micro" style={{ marginBottom: 6 }}>
        <Link href="/planner/me" style={{ color: "inherit", textDecoration: "none" }}>
          ← all buckets
        </Link>
      </p>
      <h1 className="fp-h1">
        <span style={{ marginRight: 8, color: "var(--fp-primary)" }}>{def.emoji}</span>
        {def.title}
      </h1>
      <p className="fp-sub" style={{ marginBottom: 18 }}>{def.subtitle}</p>

      <form className="fp-add-form" onSubmit={submit}>
        <input
          className="fp-input"
          placeholder={def.placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="fp-btn fp-btn--primary" disabled={!text.trim()}>
          add
        </button>
        <button
          type="button"
          className="fp-btn fp-btn--ghost"
          onClick={() => setShowNote((v) => !v)}
        >
          {showNote ? "− note" : "+ note"}
        </button>
      </form>
      {showNote ? (
        <textarea
          className="fp-textarea"
          placeholder="A little context (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ marginBottom: 18 }}
        />
      ) : null}

      {entries.length === 0 ? (
        <div className="fp-empty">
          <strong>This one's empty.</strong>
          Three quick rows is plenty to start. You can add more whenever.
        </div>
      ) : (
        <div>
          {entries.map((e) =>
            editId === e.id ? (
              <div className="fp-row" key={e.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <input
                  className="fp-input"
                  value={editText}
                  onChange={(ev) => setEditText(ev.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <textarea
                  className="fp-textarea"
                  placeholder="note"
                  value={editNote}
                  onChange={(ev) => setEditNote(ev.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <div className="fp-btn-row">
                  <button className="fp-btn fp-btn--primary" onClick={saveEdit}>
                    save
                  </button>
                  <button
                    className="fp-btn fp-btn--ghost"
                    onClick={() => setEditId(null)}
                  >
                    cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="fp-row" key={e.id}>
                <div className="fp-row__text">
                  {e.text}
                  {e.note ? <span className="fp-row__note">{e.note}</span> : null}
                </div>
                <div className="fp-btn-row">
                  <button
                    className="fp-btn fp-btn--ghost"
                    onClick={() => startEdit(e.id, e.text, e.note)}
                    aria-label="edit"
                  >
                    edit
                  </button>
                  <button
                    className="fp-btn fp-btn--danger"
                    onClick={() => removeEntry(bucketKey, e.id)}
                    aria-label="delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}
