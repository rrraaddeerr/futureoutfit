import type { Metadata } from "next";
import { ConsultForm } from "@/components/forms/ConsultForm";
import { TapeLabel } from "@/components/TapeLabel";

export const metadata: Metadata = {
  title: "Request Consult",
  description:
    "Direct access to Rader for sourcing, creative problem-solving, and project direction. Book a consult through rent.co.",
};

export default function ConsultPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <div className="page-head__slate">
            <span>CH 03 — CONSULT</span>
            <span className="page-head__slate-sep" aria-hidden="true">│</span>
            <span>DIRECT LINE</span>
          </div>
          <TapeLabel className="page-head__tape" rotate={-2}>
            Consult
          </TapeLabel>
          <h1>
            Direct access to <span className="hot marker-underline">Rader</span>.
          </h1>
          <p className="page-head__lead">
            Not every build fits a catalogue. A consult is a direct line for
            sourcing, creative problem-solving, logistics, and project direction
            — for the people making culture happen physically.
          </p>
        </div>
      </section>

      <section className="form-wrap">
        <div className="wrap">
          <div className="form-grid">
            <ConsultForm />
            <aside className="form-aside">
              <TapeLabel className="form-aside__tape" rotate={2}>
                What it covers
              </TapeLabel>
              <h3>One line, the whole problem.</h3>
              <ul>
                <li>Creative direction and object/location pairing.</li>
                <li>Sourcing strategy for things that aren&apos;t listed.</li>
                <li>Event infrastructure, logistics, and load planning.</li>
                <li>Problem-solving for tight timelines and odd constraints.</li>
                <li>Honest answers — including when renting isn&apos;t the move.</li>
              </ul>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
