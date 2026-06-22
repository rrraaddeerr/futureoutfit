import type { Metadata } from "next";
import Link from "next/link";
import { listSets, setsConfigured } from "@/lib/sets";

export const metadata: Metadata = {
  title: "Sets",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SetsPage() {
  if (!setsConfigured()) {
    return (
      <div className="ops">
        <div className="wrap">
          <header className="ops__head">
            <div>
              <div className="ops__kicker">OPERATOR</div>
              <h1 className="ops__title">Sets</h1>
            </div>
          </header>
          <div className="ops__card">
            <div className="ops__card-title">NOT CONFIGURED</div>
            <p style={{ marginTop: 10 }}>
              Set <code>RENTCO_SETS_URL</code> and <code>RENTCO_SETS_TOKEN</code>{" "}
              on Vercel to point at the deployed{" "}
              <code>rentco-sets</code> Cloudflare worker. See{" "}
              <code>worker/rentco-sets/README.md</code> for deploy steps.
            </p>
          </div>
        </div>
      </div>
    );
  }

  let sets: Awaited<ReturnType<typeof listSets>> = [];
  let error: string | null = null;
  try {
    sets = await listSets();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="ops">
      <div className="wrap">
        <div className="comms">
          <span className="comms__channel">CH 01 — SETS</span>
          <span className="comms__sep">/</span>
          <span>RaderENT operator console</span>
          <span className="comms__sep">/</span>
          <span className="comms__signal" aria-hidden="true"><i/><i/><i/><i/></span>
          <span className="comms__over">{sets.length === 0 ? "STANDING BY" : `${sets.length} ON DECK`}</span>
        </div>
        <header className="ops__head">
          <div>
            <div className="ops__kicker">OPERATOR</div>
            <h1 className="ops__title sharpie">Sets</h1>
          </div>
          <div className="ops__head-links">
            <Link href="/ops" className="curate__btn">← /ops</Link>
            <Link
              href="/sets/new"
              className="curate__btn curate__btn--accent"
            >
              + New set
            </Link>
          </div>
        </header>

        {error ? (
          <div className="ops__card">
            <div className="ops__card-title">ERROR</div>
            <p style={{ marginTop: 10, color: "var(--accent)" }}>{error}</p>
          </div>
        ) : sets.length === 0 ? (
          <div className="ops__card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <h3 style={{ marginBottom: 8 }}>No sets yet.</h3>
            <p style={{ color: "var(--muted)", marginBottom: 20 }}>
              Build a client proposal by adding items from the archive into
              groups, then share the public URL.
            </p>
            <Link href="/sets/new" className="curate__btn curate__btn--accent">
              Create the first set
            </Link>
          </div>
        ) : (
          <div className="sets-list">
            {sets.map((s) => {
              const groupCount = s.groups?.length ?? 0;
              const itemCount = s.groups?.reduce((n, g) => n + g.items.length, 0) ?? 0;
              const status = s.locked
                ? { label: "CLOSED", className: "is-closed" }
                : s.unpublished
                ? { label: "DRAFT", className: "is-draft" }
                : { label: "LIVE", className: "is-live" };
              return (
                <Link
                  key={s.id}
                  href={`/sets/${encodeURIComponent(s.id)}`}
                  className="sets-list__row"
                >
                  <span className={`sets-list__status ${status.className}`}>
                    {status.label}
                  </span>
                  <div className="sets-list__main">
                    <div className="sets-list__name">{s.name || "Untitled set"}</div>
                    {s.client ? (
                      <div className="sets-list__client">for {s.client}</div>
                    ) : null}
                  </div>
                  <div className="sets-list__meta">
                    <span>
                      {groupCount} {groupCount === 1 ? "group" : "groups"} ·{" "}
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </span>
                    <span className="sets-list__date">
                      {new Date(s.updated_at).toLocaleString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
