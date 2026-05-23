"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { BrandStamp } from "./BrandStamp";

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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

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
