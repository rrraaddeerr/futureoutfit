"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SetDoc, SetGroup, SetItem, SetResponse } from "@/lib/sets";

type CatalogItem = {
  barcode: string;
  title: string;
  subcategory: string;
  priceWeek: number | null;
  thumb: string | null;
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

function newGroupId() {
  return "g_" + Math.random().toString(36).slice(2, 10);
}

export function SetEditor({
  initialSet,
  initialResponses,
  catalog,
}: {
  initialSet: SetDoc;
  initialResponses: SetResponse[];
  catalog: CatalogItem[];
}) {
  const [doc, setDoc] = useState<SetDoc>(initialSet);
  const [responses] = useState<SetResponse[]>(initialResponses);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Auto-save 800 ms after the last change.
  useEffect(() => {
    if (save.kind === "saving") return;
    const handle = setTimeout(async () => {
      if (JSON.stringify(doc) === JSON.stringify(initialSet)) return;
      setSave({ kind: "saving" });
      try {
        const res = await fetch(`/api/sets/${encodeURIComponent(doc.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(doc),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setSave({ kind: "error", message: json.error ?? `HTTP ${res.status}` });
          return;
        }
        setSave({ kind: "saved", at: Date.now() });
      } catch (err) {
        setSave({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }, 800);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const updateDoc = (mutate: (d: SetDoc) => void) => {
    setDoc((prev) => {
      const next = structuredClone(prev);
      mutate(next);
      return next;
    });
  };

  const addGroup = () =>
    updateDoc((d) => {
      d.groups.push({
        id: newGroupId(),
        label: "New section",
        pick: "any",
        items: [],
      });
    });

  const updateGroup = (gid: string, mutate: (g: SetGroup) => void) =>
    updateDoc((d) => {
      const g = d.groups.find((x) => x.id === gid);
      if (g) mutate(g);
    });

  const removeGroup = (gid: string) =>
    updateDoc((d) => {
      d.groups = d.groups.filter((g) => g.id !== gid);
    });

  const moveGroup = (gid: string, dir: -1 | 1) =>
    updateDoc((d) => {
      const i = d.groups.findIndex((g) => g.id === gid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.groups.length) return;
      [d.groups[i], d.groups[j]] = [d.groups[j], d.groups[i]];
    });

  const addItem = (gid: string, item: CatalogItem) =>
    updateGroup(gid, (g) => {
      if (g.items.find((i) => i.barcode === item.barcode)) return;
      g.items.push({ barcode: item.barcode });
    });

  const removeItem = (gid: string, barcode: string) =>
    updateGroup(gid, (g) => {
      g.items = g.items.filter((i) => i.barcode !== barcode);
    });

  const updateItem = (
    gid: string,
    barcode: string,
    mutate: (i: SetItem) => void
  ) =>
    updateGroup(gid, (g) => {
      const i = g.items.find((x) => x.barcode === barcode);
      if (i) mutate(i);
    });

  const moveItem = (gid: string, barcode: string, dir: -1 | 1) =>
    updateGroup(gid, (g) => {
      const i = g.items.findIndex((x) => x.barcode === barcode);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= g.items.length) return;
      [g.items[i], g.items[j]] = [g.items[j], g.items[i]];
    });

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog.slice(0, 60);
    return catalog
      .filter((c) => {
        const blob = `${c.title} ${c.subcategory} ${c.barcode}`.toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 120);
  }, [search, catalog]);

  const byBarcode = useMemo(() => {
    const m = new Map<string, CatalogItem>();
    for (const c of catalog) m.set(c.barcode, c);
    return m;
  }, [catalog]);

  const presentationUrl =
    typeof window !== "undefined" ? `${window.location.origin}/set/${doc.slug}` : "";

  const copyLink = async () => {
    if (!presentationUrl) return;
    try {
      await navigator.clipboard.writeText(presentationUrl);
    } catch {
      window.prompt("Copy this URL:", presentationUrl);
    }
  };

  // Tally responses per item
  const tallies = useMemo(() => {
    const map = new Map<string, { approve: number; maybe: number; pass: number }>();
    for (const r of responses) {
      for (const [key, v] of Object.entries(r.decisions)) {
        const cur = map.get(key) ?? { approve: 0, maybe: 0, pass: 0 };
        if (v === "approve") cur.approve++;
        else if (v === "maybe") cur.maybe++;
        else if (v === "pass") cur.pass++;
        map.set(key, cur);
      }
    }
    return map;
  }, [responses]);

  return (
    <div className="set-edit">
      <div className="wrap">
        <header className="set-edit__bar">
          <div className="set-edit__bar-meta">
            <Link href="/sets" className="curate__btn">← Sets</Link>
            <span className="set-edit__save">
              {save.kind === "saving"
                ? "saving…"
                : save.kind === "saved"
                ? "saved ✓"
                : save.kind === "error"
                ? `save failed: ${save.message}`
                : ""}
            </span>
          </div>
          <div className="set-edit__bar-actions">
            <button
              type="button"
              onClick={copyLink}
              className="curate__btn"
              disabled={doc.unpublished}
              title={doc.unpublished ? "Publish first" : "Copy public URL"}
            >
              Copy share link
            </button>
            <button
              type="button"
              onClick={() =>
                updateDoc((d) => {
                  d.unpublished = !d.unpublished;
                })
              }
              className={`curate__btn ${doc.unpublished ? "curate__btn--accent" : ""}`}
            >
              {doc.unpublished ? "Publish" : "Unpublish"}
            </button>
            <Link
              href={`/set/${doc.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="curate__btn"
            >
              Preview ↗
            </Link>
          </div>
        </header>

        <section className="set-edit__head">
          <input
            type="text"
            value={doc.name}
            placeholder="Set name"
            onChange={(e) =>
              updateDoc((d) => {
                d.name = e.target.value;
              })
            }
            className="set-edit__title"
          />
          <div className="set-edit__head-row">
            <input
              type="text"
              value={doc.client ?? ""}
              placeholder="Client / director"
              onChange={(e) =>
                updateDoc((d) => {
                  d.client = e.target.value;
                })
              }
              className="set-edit__client"
            />
            {presentationUrl ? (
              <code className="set-edit__url">{presentationUrl}</code>
            ) : null}
          </div>
          <textarea
            value={doc.intro ?? ""}
            placeholder="Intro shown to the client at the top of the page."
            onChange={(e) =>
              updateDoc((d) => {
                d.intro = e.target.value;
              })
            }
            className="set-edit__intro"
            rows={3}
          />
        </section>

        {doc.groups.length === 0 ? (
          <div className="set-edit__empty">
            <h3>No groups yet.</h3>
            <p>Add a group (e.g. "Seating", "Lighting") then add items to it.</p>
          </div>
        ) : null}

        {doc.groups.map((g, gi) => (
          <section key={g.id} className="set-edit__group">
            <header className="set-edit__group-head">
              <input
                type="text"
                value={g.label}
                onChange={(e) =>
                  updateGroup(g.id, (gr) => {
                    gr.label = e.target.value;
                  })
                }
                className="set-edit__group-label"
              />
              <select
                value={g.pick ?? "any"}
                onChange={(e) =>
                  updateGroup(g.id, (gr) => {
                    gr.pick = e.target.value as SetGroup["pick"];
                  })
                }
                className="set-edit__group-pick"
              >
                <option value="any">Open: client picks any combination</option>
                <option value="one">Pick one</option>
                <option value="all">All confirmed — no choice</option>
              </select>
              <button
                type="button"
                onClick={() => moveGroup(g.id, -1)}
                disabled={gi === 0}
                className="curate__btn"
                aria-label="Move group up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveGroup(g.id, 1)}
                disabled={gi >= doc.groups.length - 1}
                className="curate__btn"
                aria-label="Move group down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeGroup(g.id)}
                className="curate__btn"
                aria-label="Delete group"
              >
                ✗
              </button>
            </header>

            <textarea
              value={g.note ?? ""}
              placeholder="Note for this group (optional) — context, materials, why this set."
              onChange={(e) =>
                updateGroup(g.id, (gr) => {
                  gr.note = e.target.value;
                })
              }
              className="set-edit__group-note"
              rows={2}
            />

            <div className="set-edit__items">
              {g.items.map((it, ii) => {
                const cat = byBarcode.get(it.barcode);
                const tally = tallies.get(`${g.id}:${it.barcode}`);
                return (
                  <div className="set-edit__item" key={it.barcode}>
                    <div className="set-edit__item-thumb">
                      {cat?.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cat.thumb} alt="" />
                      ) : (
                        <span className="muted mono">no img</span>
                      )}
                    </div>
                    <div className="set-edit__item-body">
                      <input
                        type="text"
                        value={it.title ?? cat?.title ?? ""}
                        placeholder={cat?.title ?? "Item title"}
                        onChange={(e) =>
                          updateItem(g.id, it.barcode, (i) => {
                            i.title = e.target.value;
                          })
                        }
                        className="set-edit__item-title"
                      />
                      <div className="set-edit__item-meta">
                        {cat?.priceWeek != null ? `$${cat.priceWeek}/wk · ` : ""}
                        {it.barcode}
                      </div>
                      <textarea
                        value={it.note ?? ""}
                        placeholder="Operator note — 'my pick', 'pairs with X', etc."
                        onChange={(e) =>
                          updateItem(g.id, it.barcode, (i) => {
                            i.note = e.target.value;
                          })
                        }
                        className="set-edit__item-note"
                        rows={2}
                      />
                    </div>
                    <div className="set-edit__item-actions">
                      <label className="set-edit__pick-toggle">
                        <input
                          type="checkbox"
                          checked={!!it.operatorPick}
                          onChange={(e) =>
                            updateItem(g.id, it.barcode, (i) => {
                              i.operatorPick = e.target.checked;
                            })
                          }
                        />
                        <span>★ pick</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => moveItem(g.id, it.barcode, -1)}
                        disabled={ii === 0}
                        className="curate__btn"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(g.id, it.barcode, 1)}
                        disabled={ii >= g.items.length - 1}
                        className="curate__btn"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(g.id, it.barcode)}
                        className="curate__btn"
                      >
                        ✗
                      </button>
                      {tally ? (
                        <div className="set-edit__tally">
                          <span style={{ color: "var(--tape)" }}>{tally.approve}✓</span>
                          {" "}<span style={{ color: "var(--muted)" }}>{tally.maybe}◐</span>
                          {" "}<span>{tally.pass}✗</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                className="set-edit__add-item"
                onClick={() => setPickerFor(g.id)}
              >
                + Add item
              </button>
            </div>
          </section>
        ))}

        <button
          type="button"
          className="curate__btn curate__btn--accent set-edit__add-group"
          onClick={addGroup}
        >
          + Add group
        </button>

        {responses.length > 0 ? (
          <section className="set-edit__responses">
            <h2>Responses ({responses.length})</h2>
            {responses.map((r) => (
              <div className="set-edit__response" key={r.visitor}>
                <div className="set-edit__response-head">
                  <b>{r.name}</b>
                  <span className="muted">
                    {new Date(r.updated_at).toLocaleString()}
                  </span>
                </div>
                {r.note ? <p className="set-edit__response-note">{r.note}</p> : null}
              </div>
            ))}
          </section>
        ) : null}
      </div>

      {pickerFor ? (
        <div className="set-picker" onClick={() => setPickerFor(null)}>
          <div className="set-picker__panel" onClick={(e) => e.stopPropagation()}>
            <header className="set-picker__head">
              <input
                type="search"
                autoFocus
                placeholder="Search archive — title, category, barcode…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="set-picker__search"
              />
              <button
                type="button"
                onClick={() => setPickerFor(null)}
                className="curate__btn"
              >
                Close
              </button>
            </header>
            <div className="set-picker__grid">
              {filteredCatalog.map((c) => (
                <button
                  key={c.barcode}
                  type="button"
                  className="set-picker__tile"
                  onClick={() => {
                    addItem(pickerFor, c);
                  }}
                >
                  <div className="set-picker__tile-img">
                    {c.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.thumb} alt="" />
                    ) : null}
                  </div>
                  <div className="set-picker__tile-name">{c.title}</div>
                  <div className="set-picker__tile-meta">
                    {c.subcategory}
                    {c.priceWeek != null ? ` · $${c.priceWeek}/wk` : ""}
                  </div>
                </button>
              ))}
              {filteredCatalog.length === 0 ? (
                <div className="muted">No matches.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
