import Link from "next/link";

const ACTIONS = [
  {
    index: "01",
    href: "/archive",
    label: "Browse Archive",
    purpose: "Search and explore curated, verified inventory.",
  },
  {
    index: "02",
    href: "/request",
    label: "Request Rental",
    purpose: "Submit a rental inquiry for the items you have selected.",
  },
  {
    index: "03",
    href: "/consult",
    label: "Request Consult",
    purpose: "Direct access to Rader for sourcing and project direction.",
  },
  {
    index: "04",
    href: "/source",
    label: "Source Something",
    purpose: "Send the impossible request — anything not listed.",
  },
];

export function CtaGrid() {
  return (
    <div className="cta-grid">
      {ACTIONS.map((a) => (
        <Link key={a.href} href={a.href} className="cta-card">
          <span className="cta-card__index">{a.index}</span>
          <span className="cta-card__label">{a.label}</span>
          <span className="cta-card__purpose">{a.purpose}</span>
          <span className="cta-card__arrow" aria-hidden="true">
            &rarr;
          </span>
        </Link>
      ))}
    </div>
  );
}
