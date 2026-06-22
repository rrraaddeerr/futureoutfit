"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlanner } from "@/lib/planner/store";

const NAV = [
  { href: "/planner", label: "Today" },
  { href: "/planner/me", label: "Me" },
  { href: "/planner/paths", label: "Paths" },
  { href: "/planner/ideas", label: "Ideas" },
  { href: "/planner/believe", label: "Believe" },
  { href: "/planner/settings", label: "Settings" },
];

export function PlannerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/planner";
  const owner = usePlanner((s) => s.ownerName);
  const hydrated = usePlanner((s) => s.hydrated);

  const isActive = (href: string) =>
    href === "/planner" ? pathname === "/planner" : pathname.startsWith(href);

  return (
    <div className="fp-root">
      <div className="fp-topbar">
        <Link href="/planner" className="fp-topbar__brand">
          future <span>/</span> planner
        </Link>
        {hydrated && owner ? (
          <span className="fp-topbar__owner">for {owner}</span>
        ) : null}
      </div>
      <nav className="fp-nav" aria-label="Planner sections">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`fp-nav__link${isActive(n.href) ? " fp-nav__link--active" : ""}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <main className="fp-shell">{children}</main>
    </div>
  );
}
