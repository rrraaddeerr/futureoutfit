import type { Metadata } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const marker = localFont({
  src: "./fonts/PermanentMarker.woff2",
  variable: "--font-marker",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rent.co"),
  title: {
    default: "rent.co — Rental, sourcing, and infrastructure for culture",
    template: "%s — rent.co",
  },
  description:
    "rent.co is an inquiry-based rental and archive platform for curated physical inventory — sourcing, logistics, and consulting for the people who build culture. Operated by RaderENT.",
  keywords: [
    "event rental",
    "set design",
    "prop rental",
    "sourcing",
    "creative production",
    "archive",
    "Vancouver",
    "RaderENT",
  ],
  openGraph: {
    title: "rent.co — Rental, sourcing, and infrastructure for culture",
    description:
      "An inquiry-based rental and archive platform for curated physical inventory. Operated by RaderENT.",
    siteName: "rent.co",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={marker.variable}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
