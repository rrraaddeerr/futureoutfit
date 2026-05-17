import Link from "next/link";
import { TruckMark } from "./TruckMark";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@rent.co";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__brand">
          <div className="brand">
            <TruckMark size={24} />
            <span className="brand__name">rent.co</span>
          </div>
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
        <span>rent.co // archive online</span>
        <span>&copy; {new Date().getFullYear()} RaderENT</span>
      </div>
    </footer>
  );
}
