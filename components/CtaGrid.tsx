import Link from "next/link";
import { DirectorChairIcon, WalkieIcon, TruckIcon } from "./Icons";

const ACTIONS = [
  {
    index: "01",
    channel: "CH 02",
    href: "/archive",
    label: "Browse Archive",
    purpose: "Search and explore curated, verified inventory.",
    Icon: DirectorChairIcon,
  },
  {
    index: "02",
    channel: "CH 06",
    href: "/request",
    label: "Request Rental",
    purpose: "Submit a rental inquiry for the items you have selected.",
    Icon: TruckIcon,
  },
  {
    index: "03",
    channel: "CH 03",
    href: "/consult",
    label: "Request Consult",
    purpose: "Direct access to Rader for sourcing and project direction.",
    Icon: WalkieIcon,
  },
  {
    index: "04",
    channel: "CH 04",
    href: "/source",
    label: "Source Something",
    purpose: "Send the impossible request — anything not listed.",
    Icon: TruckIcon,
  },
];

export function CtaGrid() {
  return (
    <div className="cta-grid">
      {ACTIONS.map((a) => (
        <Link key={a.href} href={a.href} className="cta-card">
          <span className="cta-card__index">{a.index}</span>
          <span className="cta-card__channel">{a.channel}</span>
          <span className="cta-card__icon" aria-hidden="true">
            <a.Icon size={32} color="var(--accent)" />
          </span>
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
