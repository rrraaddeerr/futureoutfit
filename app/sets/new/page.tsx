import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { newSetId, newSlug, putSet, setsConfigured } from "@/lib/sets";

export const metadata: Metadata = {
  title: "New set",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TEMPLATES: Record<
  string,
  { label: string; groups: Array<{ label: string; pick: "any" | "one" | "all" }> }
> = {
  blank: { label: "Blank", groups: [] },
  lounge: {
    label: "Lounge",
    groups: [
      { label: "Lounge seating", pick: "one" },
      { label: "Side tables", pick: "one" },
      { label: "Lighting", pick: "one" },
      { label: "Rugs / soft", pick: "one" },
    ],
  },
  dinner: {
    label: "Dinner",
    groups: [
      { label: "Dining chairs", pick: "one" },
      { label: "Tables", pick: "one" },
      { label: "Glassware & flatware", pick: "all" },
      { label: "Lighting", pick: "one" },
    ],
  },
  film: {
    label: "Film set",
    groups: [
      { label: "Hero seating", pick: "one" },
      { label: "Background seating", pick: "any" },
      { label: "Practical lighting", pick: "any" },
      { label: "Dressing", pick: "any" },
    ],
  },
  bar: {
    label: "Bar",
    groups: [
      { label: "Stools", pick: "one" },
      { label: "Back-bar dressing", pick: "any" },
      { label: "Glassware", pick: "all" },
      { label: "Lighting", pick: "one" },
    ],
  },
};

async function createSet(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim() || "Untitled set";
  const client = (formData.get("client") as string)?.trim() || "";
  const intro = (formData.get("intro") as string)?.trim() || "";
  const templateKey = (formData.get("template") as string) || "blank";
  const template = TEMPLATES[templateKey] ?? TEMPLATES.blank;
  const id = newSetId();
  const slug = newSlug();
  const now = new Date().toISOString();
  const groups = template.groups.map((g, i) => ({
    id: `g_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    label: g.label,
    pick: g.pick,
    items: [],
  }));
  await putSet({
    id,
    slug,
    name,
    client,
    intro,
    groups,
    unpublished: true,
    created_at: now,
    updated_at: now,
  });
  redirect(`/sets/${id}`);
}

export default function NewSetPage() {
  if (!setsConfigured()) {
    return (
      <div className="ops">
        <div className="wrap">
          <h1 style={{ marginTop: 24 }}>Sets not configured</h1>
          <p style={{ color: "var(--muted)" }}>
            Set <code>RENTCO_SETS_URL</code> + <code>RENTCO_SETS_TOKEN</code> on
            Vercel.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="ops">
      <div className="wrap" style={{ maxWidth: 640 }}>
        <header className="ops__head">
          <div>
            <div className="ops__kicker">OPERATOR</div>
            <h1 className="ops__title">New set</h1>
          </div>
          <div className="ops__head-links">
            <Link href="/sets" className="curate__btn">← Sets</Link>
          </div>
        </header>

        <form action={createSet} className="set-form">
          <label className="set-form__label">
            Name
            <input
              type="text"
              name="name"
              required
              maxLength={120}
              placeholder="e.g. Astra Tour 2026 — NYC Lounge"
              className="set-form__input"
            />
          </label>
          <label className="set-form__label">
            Client / director
            <input
              type="text"
              name="client"
              maxLength={120}
              placeholder="Optional"
              className="set-form__input"
            />
          </label>
          <label className="set-form__label">
            Intro note
            <textarea
              name="intro"
              maxLength={2000}
              rows={3}
              placeholder="Optional: a sentence or two the client sees at the top of the presentation."
              className="set-form__input"
            />
          </label>

          <fieldset className="set-form__templates">
            <legend className="set-form__label" style={{ marginBottom: 8 }}>
              Starter template
            </legend>
            <div className="set-form__template-grid">
              {Object.entries(TEMPLATES).map(([key, tpl], i) => (
                <label key={key} className="set-form__template">
                  <input
                    type="radio"
                    name="template"
                    value={key}
                    defaultChecked={i === 0}
                  />
                  <div className="set-form__template-card">
                    <div className="set-form__template-name">{tpl.label}</div>
                    <div className="set-form__template-meta">
                      {tpl.groups.length === 0
                        ? "Start from scratch"
                        : `${tpl.groups.length} groups: ${tpl.groups
                            .map((g) => g.label)
                            .join(", ")}`}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="curate__btn curate__btn--accent"
            style={{ alignSelf: "flex-start", marginTop: 6 }}
          >
            Create set
          </button>
        </form>
      </div>
    </div>
  );
}
