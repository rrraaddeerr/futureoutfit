import Link from "next/link";
import { TapeLabel } from "@/components/TapeLabel";

export default function NotFound() {
  return (
    <div className="notfound">
      <div className="wrap">
        <TapeLabel rotate={-3}>Off the map</TapeLabel>
        <h1>404</h1>
        <p>
          That object isn&apos;t in the archive — or never was. The catalogue is
          a curated subset.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/archive" className="btn btn--accent">
            Browse the archive
          </Link>
          <Link href="/source" className="btn btn--ghost">
            Source something
          </Link>
        </div>
      </div>
    </div>
  );
}
