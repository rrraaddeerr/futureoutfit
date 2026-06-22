"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandStamp } from "./BrandStamp";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@r-ent.co";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/access") return null;

  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__brand">
          <BrandStamp size={120} className="site-footer__stamp" />
          <p className="site-footer__line">
            Rental, sourcing, and infrastructure for culture.
          </p>
          <p className="site-footer__op">Operated by RaderENT — Vancouver HQ, access anywhere.</p>
        </div>

        <nav className="site-footer__col" aria-label="Platform">
          <h4>Platform</h4>
          <Link href="/archive">Browse archive</Link>
          <Link href="/request">Request rental</Link>
          <Link href="/consult">Request consult</Link>
          <Link href="/source">Source something</Link>
        </nav>

        <nav className="site-footer__col" aria-label="rent.co">
          <h4>rent.co</h4>
          <Link href="/about">About</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </nav>
      </div>

      <div className="site-footer__base">
        <span className="site-footer__base-channel" aria-hidden="true">
          <span className="site-footer__base-dot" />
          rent.co · channel online · all systems clear
        </span>
        <span>&copy; {new Date().getFullYear()} RaderENT · Vancouver HQ · access anywhere</span>
      </div>
    </footer>
  );
}
