"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TapeLabel } from "@/components/TapeLabel";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="notfound">
      <div className="wrap">
        <TapeLabel rotate={-3}>System fault</TapeLabel>
        <h1>500</h1>
        <p>
          Something in the system gave out. The archive is still standing —
          give it another go.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button type="button" onClick={reset} className="btn btn--accent">
            Try again
          </button>
          <Link href="/" className="btn btn--ghost">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
