"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const FLAG = "rentco_welcome_seen";

export function WelcomeFlash() {
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (pathname === "/access") return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(FLAG)) return;
    const m = document.cookie.match(/(?:^|;\s*)rentco_guest=([^;]+)/);
    if (!m) return;
    let label = m[1];
    try {
      label = decodeURIComponent(m[1]);
    } catch {}
    setName(label);
    sessionStorage.setItem(FLAG, "1");
    const close = setTimeout(() => setClosing(true), 4200);
    const unmount = setTimeout(() => setName(null), 4900);
    return () => {
      clearTimeout(close);
      clearTimeout(unmount);
    };
  }, [pathname]);

  if (!name) return null;

  return (
    <div
      className={`welcome-flash ${closing ? "welcome-flash--closing" : ""}`}
      role="status"
      aria-live="polite"
      onClick={() => setClosing(true)}
    >
      <span className="welcome-flash__meta">YOU&apos;RE IN</span>
      <span className="welcome-flash__name">Welcome, {name}.</span>
      <span className="welcome-flash__hint">Look around.</span>
    </div>
  );
}
