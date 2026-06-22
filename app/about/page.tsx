import type { Metadata } from "next";
import Link from "next/link";
import { TapeLabel } from "@/components/TapeLabel";

export const metadata: Metadata = {
  title: "About",
  description:
    "rent.co is an archive, a rental platform, a sourcing network, and an infrastructure system for culture. Operated by RaderENT from Vancouver, with access anywhere.",
};

const SERVICES = [
  "Rentals",
  "Sub-rentals",
  "Sourcing",
  "Consulting",
  "Logistics",
  "Delivery",
  "Storage support",
  "Location / object pairing",
  "Event infrastructure",
];

export default function AboutPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <div className="page-head__slate">
            <span>CH 05 — ABOUT</span>
            <span className="page-head__slate-sep" aria-hidden="true">│</span>
            <span>OPERATOR LOG</span>
          </div>
          <TapeLabel className="page-head__tape" rotate={-2}>
            About
          </TapeLabel>
          <h1>
            Infrastructure for <span className="hot marker-underline">culture</span>.
          </h1>
          <p className="page-head__lead">
            rent.co is the public platform. RaderENT is the operator behind it.
            Together they are rental, sourcing, and logistics for the people who
            build culture physically.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="prose">
            <p>
              Most rentals treat objects like a price list. rent.co treats them
              like an archive — curated, verified, and cross-tagged with the way
              people actually search: by era, by world, by vibe, by the room
              they&apos;re trying to build.
            </p>
            <p>
              It runs like an operating system for physical culture. A warehouse
              you can query. Functional, honest gear — chairs, cases, staging,
              signage, neon, server racks, a working box truck — pulled together
              for music, fashion, nightlife, festivals, touring, film, and the
              builders who move between them.
            </p>
            <p>
              This is a phase-1, inquiry-based platform. No checkout, no live
              inventory, no accounts. Availability is confirmed by a person, and
              pricing stays flexible for meaningful, community, and
              philanthropic work.
            </p>

            <h2>Four things at once</h2>
          </div>

          <dl className="def-grid">
            <div>
              <dt>Archive</dt>
              <dd>
                A curated, manually verified catalogue of physical inventory you
                can search and explore.
              </dd>
            </div>
            <div>
              <dt>Rental platform</dt>
              <dd>
                Select objects, send a request. Every rental is confirmed and
                quoted by hand — no automated cart.
              </dd>
            </div>
            <div>
              <dt>Sourcing network</dt>
              <dd>
                Vendors, partners, and one-off finds beyond the archive — for
                anything that isn&apos;t listed.
              </dd>
            </div>
            <div>
              <dt>Infrastructure system</dt>
              <dd>
                Logistics, delivery, storage, and event infrastructure — the
                unglamorous layer that makes builds happen.
              </dd>
            </div>
          </dl>

          <div className="prose" style={{ marginTop: 36 }}>
            <h2>Services</h2>
            <p>
              Rentals are the front door. The full operating range covers
              everything around them.
            </p>
            <div className="service-tags">
              {SERVICES.map((s) => (
                <TapeLabel key={s}>{s}</TapeLabel>
              ))}
            </div>

            <h2>Where we are</h2>
            <p>
              Vancouver HQ — with access anywhere. The warehouse and the archive
              are based in Vancouver, but sourcing, consulting, and logistics
              travel with the work. Tell us the city; we&apos;ll tell you what
              it takes.
            </p>
            <p>
              <Link href="/consult" className="hot">
                Request a consult
              </Link>{" "}
              for direct access to Rader, or{" "}
              <Link href="/archive" className="hot">
                browse the archive
              </Link>{" "}
              to start a rental.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
