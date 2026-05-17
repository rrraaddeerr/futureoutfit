import Link from "next/link";
import { CtaGrid } from "@/components/CtaGrid";
import { ItemCard } from "@/components/ItemCard";
import { TapeLabel } from "@/components/TapeLabel";
import { getFeaturedItems } from "@/lib/inventory";

const FEATURED_CATEGORIES = [
  { label: "Seating", q: "category=Seating" },
  { label: "Lighting", q: "category=Lighting" },
  { label: "Staging", q: "category=Staging" },
  { label: "Cases & Carts", q: "category=Cases+%26+Carts" },
  { label: "Signage", q: "category=Signage" },
  { label: "Greenery", q: "category=Greenery" },
  { label: "Neon", q: "tag=Neon" },
  { label: "Server Room", q: "tag=Server+Room" },
  { label: "Backstage", q: "tag=Backstage" },
  { label: "Nightlife", q: "tag=Nightlife" },
  { label: "Festival", q: "tag=Festival" },
  { label: "Airport", q: "tag=Airport" },
];

export default function HomePage() {
  const featured = getFeaturedItems(6);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <TapeLabel className="hero__tape" rotate={-2}>
            Operated by RaderENT // Vancouver
          </TapeLabel>
          <h1 className="hero__title">
            Rent the archive.
            <br />
            Source the <span className="hot">impossible</span>.
          </h1>
          <p className="hero__lead">
            Rental, sourcing, and infrastructure for culture. rent.co is the
            archive and logistics layer for the people who build culture
            physically — touring, fashion, nightlife, festivals, film, and
            everything that needs a real room.
          </p>
          <p className="hero__note">
            Manual inquiry platform — not a checkout. Every request is read and
            confirmed by a person.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <SectionHead tape="Start here" title="Four ways in" />
          <CtaGrid />
        </div>
      </section>

      <section className="section section--alt">
        <div className="wrap">
          <SectionHead
            tape="Categories"
            title="Search by function or by world"
            note="Filed under practical event categories and cross-tagged with the cultural vocabulary you actually search in."
          />
          <div className="cat-grid">
            {FEATURED_CATEGORIES.map((c) => (
              <Link key={c.label} href={`/archive?${c.q}`} className="cat-tile">
                <span className="cat-tile__label">{c.label}</span>
                <span className="cat-tile__arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <SectionHead
            tape="From the archive"
            title="Featured objects"
            note="A curated subset, manually verified. Availability is confirmed by hand — nothing here is a live cart."
            action={{ href: "/archive", label: "Browse all" }}
          />
          <div className="grid">
            {featured.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="wrap">
          <div className="dual">
            <div className="dual__card">
              <TapeLabel rotate={2}>Consult</TapeLabel>
              <h3>Need direction, not just objects?</h3>
              <p>
                Request a consult for direct access to Rader — sourcing,
                creative problem-solving, and project direction for the builds
                that don&apos;t fit a catalogue.
              </p>
              <Link href="/consult" className="btn btn--accent">
                Request consult
              </Link>
            </div>
            <div className="dual__card">
              <TapeLabel rotate={-2}>Source</TapeLabel>
              <h3>Need something that isn&apos;t listed?</h3>
              <p>
                Send the impossible request. If it exists, we work the network
                to find it. If it doesn&apos;t, we figure out how to build it.
              </p>
              <Link href="/source" className="btn btn--ghost">
                Source something
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({
  tape,
  title,
  note,
  action,
}: {
  tape: string;
  title: string;
  note?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="section-head">
      <div>
        <TapeLabel className="section-head__tape">{tape}</TapeLabel>
        <h2 className="section-head__title">{title}</h2>
        {note && <p className="section-head__note">{note}</p>}
      </div>
      {action && (
        <Link href={action.href} className="section-head__action">
          {action.label} &rarr;
        </Link>
      )}
    </div>
  );
}
