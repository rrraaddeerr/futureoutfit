"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { BrandStamp } from "./BrandStamp";

function useGuestLabel(): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)rentco_guest=([^;]+)/);
    if (m) {
      try {
        setLabel(decodeURIComponent(m[1]));
      } catch {
        setLabel(m[1]);
      }
    }
  }, []);
  return label;
}

const NAV = [
  { href: "/archive", label: "Archive" },
  { href: "/consult", label: "Consult" },
  { href: "/source", label: "Source" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const count = useCart((s) => s.ids.length);
  const hydrated = useCart((s) => s.hydrated);
  const guest = useGuestLabel();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  if (pathname === "/access") return null;
  if (pathname === "/planner" || pathname.startsWith("/planner/")) return null;

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <Link href="/" className="brand" onClick={() => setOpen(false)} aria-label="rent.co — home">
          <BrandStamp size={64} className="brand__stamp" />
        </Link>

        <nav className={`site-nav ${open ? "site-nav--open" : ""}`}>
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`site-nav__link ${isActive(link.href) ? "is-active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/request"
            className={`site-nav__request ${isActive("/request") ? "is-active" : ""}`}
            onClick={() => setOpen(false)}
          >
            Rental request
            <span className="site-nav__count">{hydrated ? count : 0}</span>
          </Link>
        </nav>

        {guest ? (
          <Link
            href="/ops"
            className="site-header__guest"
            aria-label={`Signed in as ${guest} — open operator dashboard`}
            title={`Invited as ${guest} — tap for /ops`}
          >
            <span className="site-header__guest-prefix">OPERATOR //</span>{" "}
            <span className="site-header__guest-name">{guest}</span>
          </Link>
        ) : null}

        <button
          type="button"
          className="site-header__menu"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
    </header>
  );
}
