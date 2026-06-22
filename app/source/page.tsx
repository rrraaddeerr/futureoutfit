import type { Metadata } from "next";
import { SourcingForm } from "@/components/forms/SourcingForm";
import { TapeLabel } from "@/components/TapeLabel";

export const metadata: Metadata = {
  title: "Source Something",
  description:
    "Send the impossible request. If it isn't in the archive, rent.co works the network to source it — objects, sets, or whole worlds.",
};

export default function SourcePage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <div className="page-head__slate">
            <span>CH 04 — SOURCE</span>
            <span className="page-head__slate-sep" aria-hidden="true">│</span>
            <span>NETWORK ONLINE</span>
          </div>
          <TapeLabel className="page-head__tape" rotate={-2}>
            Source
          </TapeLabel>
          <h1>
            Send the <span className="hot marker-underline">impossible</span> request.
          </h1>
          <p className="page-head__lead">
            The archive is a curated subset — it will never hold everything. If
            you need an object, a set of objects, or a whole world that
            isn&apos;t listed, this is the form for it.
          </p>
        </div>
      </section>

      <section className="form-wrap">
        <div className="wrap">
          <div className="form-grid">
            <SourcingForm />
            <aside className="form-aside">
              <TapeLabel className="form-aside__tape" rotate={2}>
                How it works
              </TapeLabel>
              <h3>If it exists, we find it.</h3>
              <ul>
                <li>We work a sourcing network beyond the public archive.</li>
                <li>Vendors, partners, and one-off finds — all on the table.</li>
                <li>If it doesn&apos;t exist yet, we figure out how to build it.</li>
                <li>Logistics, delivery, and install can be scoped in.</li>
                <li>Be specific or be vague — references help either way.</li>
              </ul>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
