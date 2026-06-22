import type { Metadata } from "next";
import { TapeLabel } from "@/components/TapeLabel";
import { RequestClient } from "./RequestClient";

export const metadata: Metadata = {
  title: "Rental Request",
  description:
    "Submit a rental inquiry to rent.co for the objects you've selected from the archive. Manual inquiry — every request confirmed by hand.",
};

export default function RequestPage() {
  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <div className="page-head__slate">
            <span>CH 06 — RENTAL REQUEST</span>
            <span className="page-head__slate-sep" aria-hidden="true">│</span>
            <span>DISPATCH</span>
          </div>
          <TapeLabel className="page-head__tape" rotate={-2}>
            Rental Request
          </TapeLabel>
          <h1>
            Request a <span className="hot marker-underline">rental</span>.
          </h1>
          <p className="page-head__lead">
            Your selected objects, plus the details we need to confirm them.
            This is a manual inquiry — availability and pricing come back to you
            from a person, not a checkout.
          </p>
        </div>
      </section>

      <RequestClient />
    </>
  );
}
