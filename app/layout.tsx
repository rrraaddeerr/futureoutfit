import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JsonLd } from "@/components/JsonLd";
import { WelcomeFlash } from "@/components/WelcomeFlash";
import "./globals.css";

const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "rent.co",
  alternateName: "RaderENT",
  description:
    "Inquiry-based rental, sourcing, and infrastructure for culture — operated by RaderENT.",
  url: "https://r-ent.co",
  areaServed: "Worldwide",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Vancouver",
    addressRegion: "BC",
    addressCountry: "CA",
  },
};

const marker = localFont({
  src: "./fonts/PermanentMarker.woff2",
  variable: "--font-marker",
  weight: "400",
  display: "swap",
});

const rocksalt = localFont({
  src: "./fonts/RockSalt.ttf",
  variable: "--font-rocksalt",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://r-ent.co"),
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
  twitter: {
    card: "summary_large_image",
    title: "rent.co — Rental, sourcing, and infrastructure for culture",
    description:
      "An inquiry-based rental and archive platform for curated physical inventory. Operated by RaderENT.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0c0d",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${marker.variable} ${rocksalt.variable}`}>
      <body>
        <JsonLd data={ORGANIZATION_LD} />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <WelcomeFlash />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
