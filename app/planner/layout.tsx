import type { Metadata, Viewport } from "next";
import { PlannerShell } from "@/components/planner/Shell";
import "./planner.css";

export const metadata: Metadata = {
  title: "Future Planner",
  description:
    "A quiet room for figuring out who you are and what shape your work could take.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#faf6f0",
  colorScheme: "light",
};

export default function PlannerLayout({ children }: { children: React.ReactNode }) {
  return <PlannerShell>{children}</PlannerShell>;
}
