import type { Metadata } from "next";
import Link from "next/link";
import { listSets, setsConfigured, deriveStage, SET_STAGE_LABELS } from "@/lib/sets";
import { buildThumbLookup, previewThumbs } from "@/lib/set-thumbs";
import { DirectorChairIcon, TruckIcon } from "@/components/Icons";
import { GenerateSampleButton } from "./SetsActions";

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

  // Build a barcode → thumb lookup once so we can show set previews
  const thumbByBarcode = buildThumbLookup();

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
        <header className="ops__head sets-head">
          <div className="sets-head__bg" aria-hidden="true">
            <TruckIcon size={180} color="rgba(255,90,31,0.08)" />
          </div>
          <div>
            <div className="ops__kicker">OPERATOR</div>
            <h1 className="ops__title sharpie">
              <DirectorChairIcon size={42} color="var(--accent)" />
              <span>Sets</span>
            </h1>
          </div>
          <div className="ops__head-links">
            <Link href="/ops" className="curate__btn">← /ops</Link>
            {sets.length > 0 ? (
              <Link href="/sets/pipeline" className="curate__btn">⌗ Board</Link>
            ) : null}
            <GenerateSampleButton small />
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
          <div className="ops__card sets-empty">
            <DirectorChairIcon size={68} color="var(--muted)" className="sets-empty__icon" />
            <h3>No sets yet.</h3>
            <p>
              A set is a curated proposal — group some archive items, mark your
              picks, share the public URL. Client votes; you ship.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/sets/new" className="curate__btn curate__btn--accent">
                Build the first set
              </Link>
              <GenerateSampleButton small />
            </div>
            <p className="muted" style={{ marginTop: 14, fontSize: 12 }}>
              Or click <b>Generate sample</b> to spawn a fully-loaded demo set in
              one tap — useful for showing someone the flow before you have a
              real proposal.
            </p>
          </div>
        ) : (
          <div className="sets-list">
            {sets.map((s) => {
              const groupCount = s.groups?.length ?? 0;
              const itemCount = s.groups?.reduce((n, g) => n + g.items.length, 0) ?? 0;
              const stage = deriveStage(s);
              const status = {
                label: SET_STAGE_LABELS[stage].short,
                className: `is-${stage}`,
              };
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
                  <div className="sets-list__thumbs" aria-hidden="true">
                    {previewThumbs(s, thumbByBarcode).map((t, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={t + i} src={t} alt="" loading="lazy" />
                    ))}
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
