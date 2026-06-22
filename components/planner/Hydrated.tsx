"use client";

import { usePlanner } from "@/lib/planner/store";

export function Hydrated({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hydrated = usePlanner((s) => s.hydrated);
  if (!hydrated) {
    return (
      <>
        {fallback ?? (
          <>
            <div className="fp-skeleton" />
            <div className="fp-skeleton" style={{ height: 140 }} />
            <div className="fp-skeleton" style={{ height: 60, width: "60%" }} />
          </>
        )}
      </>
    );
  }
  return <>{children}</>;
}
