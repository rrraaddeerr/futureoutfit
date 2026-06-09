import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { newSetId, newSlug, putSet, setsConfigured } from "@/lib/sets";

export const metadata: Metadata = {
  title: "New set",
  robots: { index: false, follow: false },
};

async function createSet(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim() || "Untitled set";
  const client = (formData.get("client") as string)?.trim() || "";
  const intro = (formData.get("intro") as string)?.trim() || "";
  const id = newSetId();
  const slug = newSlug();
  const now = new Date().toISOString();
  await putSet({
    id,
    slug,
    name,
    client,
    intro,
    groups: [],
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
