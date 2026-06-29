import type { Metadata } from "next";
import Link from "next/link";
import {
  listSets,
  setsConfigured,
  deriveStage,
  SET_STAGES,
  SET_STAGE_LABELS,
  type SetDoc,
} from "@/lib/sets";
import { buildThumbLookup, previewThumbs } from "@/lib/set-thumbs";
import { DirectorChairIcon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Sets — Pipeline",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  if (!setsConfigured()) {
    return (
      <div className="ops">
        <div className="wrap">
          <div className="ops__card">
            <div className="ops__card-title">NOT CONFIGURED</div>
            <p style={{ marginTop: 10 }}>
              Sets storage isn&apos;t wired up. See <code>/sets</code> for setup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  let sets: SetDoc[] = [];
  let error: string | null = null;
  try {
    sets = await listSets();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const thumbs = buildThumbLookup();

  // Bucket sets into stage columns.
  const columns = SET_STAGES.map((stage) => ({
    stage,
    sets: sets.filter((s) => deriveStage(s) === stage),
  }));

  // "Live" = anything not draft and not returned — the active workload.
  const liveCount = sets.filter((s) => {
    const st = deriveStage(s);
    return st !== "draft" && st !== "returned";
  }).length;

  return (
    <div className="ops">
      <div className="wrap">
        <div className="comms">
          <span className="comms__channel">CH 01 — SETS / PIPELINE</span>
          <span className="comms__sep">/</span>
          <span>RaderENT operator console</span>
          <span className="comms__sep">/</span>
          <span className="comms__signal" aria-hidden="true"><i/><i/><i/><i/></span>
          <span className="comms__over">
            {sets.length === 0 ? "STANDING BY" : `${liveCount} ACTIVE · ${sets.length} TOTAL`}
          </span>
        </div>

        <header className="ops__head">
          <div>
            <div className="ops__kicker">OPERATOR</div>
            <h1 className="ops__title sharpie">
              <DirectorChairIcon size={42} color="var(--accent)" />
              <span>Pipeline</span>
            </h1>
          </div>
          <div className="ops__head-links">
            <Link href="/sets" className="curate__btn">≣ List</Link>
            <Link href="/sets/new" className="curate__btn curate__btn--accent">+ New set</Link>
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
            <h3>Nothing in the pipeline yet.</h3>
            <p>Once you have sets, they&apos;ll lane up here by stage.</p>
            <Link href="/sets" className="curate__btn curate__btn--accent">Back to sets</Link>
          </div>
        ) : (
          <div className="pipeline">
            {columns.map(({ stage, sets: colSets }) => (
              <section className={`pipeline__col pipeline__col--${stage}`} key={stage}>
                <header className="pipeline__col-head">
                  <span className="pipeline__col-name">{SET_STAGE_LABELS[stage].short}</span>
                  <span className="pipeline__col-count">{colSets.length}</span>
                </header>
                <div className="pipeline__col-body">
                  {colSets.length === 0 ? (
                    <div className="pipeline__empty">—</div>
                  ) : (
                    colSets.map((s) => {
                      const itemCount =
                        s.groups?.reduce((n, g) => n + g.items.length, 0) ?? 0;
                      const groupCount = s.groups?.length ?? 0;
                      const t = previewThumbs(s, thumbs, 2);
                      return (
                        <Link
                          key={s.id}
                          href={`/sets/${encodeURIComponent(s.id)}`}
                          className="pipeline__card"
                        >
                          <div className="pipeline__card-top">
                            <div className="pipeline__card-name">
                              {s.name || "Untitled set"}
                            </div>
                            {t.length > 0 ? (
                              <div className="pipeline__card-thumbs" aria-hidden="true">
                                {t.map((src, i) => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img key={src + i} src={src} alt="" loading="lazy" />
                                ))}
                              </div>
                            ) : null}
                          </div>
                          {s.client ? (
                            <div className="pipeline__card-client">for {s.client}</div>
                          ) : null}
                          <div className="pipeline__card-meta">
                            {groupCount} {groupCount === 1 ? "group" : "groups"} ·{" "}
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
