import type { Metadata } from "next";
import { BrandStamp } from "@/components/BrandStamp";
import { getAllItems } from "@/lib/inventory";
import { AccessForm } from "./AccessForm";

export const metadata: Metadata = {
  title: "Invite only",
  robots: { index: false, follow: false },
};

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@r-ent.co";

type Tease = { src: string; title: string };

function shuffled(): Tease[] {
  const pool = getAllItems()
    .filter((item) => item.images?.[0])
    .map((item) => ({ src: item.images[0]!, title: item.title }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function chunk<T>(arr: T[], rows: number): T[][] {
  const out: T[][] = Array.from({ length: rows }, () => []);
  arr.forEach((item, i) => out[i % rows].push(item));
  return out;
}

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; code?: string }>;
}) {
  const { from, code } = await searchParams;
  const dest =
    typeof from === "string" && from.startsWith("/") && !from.startsWith("/access")
      ? from
      : "/";
  const initialCode =
    typeof code === "string" ? code.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) : "";

  const rows = chunk(shuffled(), 3);
  const directions = ["left", "right", "left"] as const;
  const speeds = ["80s", "110s", "95s"];

  return (
    <div className="access-screen">
      <div className="access-screen__marquee" aria-hidden="true">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`access-marquee access-marquee--${directions[i]}`}
            style={{ ["--speed" as never]: speeds[i] }}
          >
            <div className="access-marquee__track">
              {[...row, ...row].map((item, j) => (
                <div className="access-marquee__cell" key={j}>
                  <img src={item.src} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="access-screen__veil" aria-hidden="true" />

      <div className="access-screen__inner">
        <div className="access-screen__card">
          <div className="access-screen__stamp">
            <BrandStamp size={170} />
          </div>

          <div className="access-screen__slate">
            <span>CHECKPOINT</span>
            <span className="access-screen__slate-sep" aria-hidden="true">│</span>
            <span>RADERENT</span>
            <span className="access-screen__slate-sep" aria-hidden="true">│</span>
            <span>INVITE ONLY</span>
          </div>

          <h1 className="access-screen__title">
            The archive is open<br />for invited guests.
          </h1>

          <p className="access-screen__copy">
            rent.co is in operator preview. Enter the code you were sent and
            step inside.
          </p>

          <AccessForm from={dest} initialCode={initialCode} />

          <p className="access-screen__footnote">
            No code?{" "}
            <a href={`mailto:${CONTACT_EMAIL}?subject=Invite%20to%20rent.co`}>
              ask for one
            </a>{" "}
            — every invite is hand-issued.
          </p>
        </div>

        <div className="access-screen__base">
          {getAllItems().length} pieces in the archive · operated by RaderENT ·
          Vancouver HQ, access anywhere
        </div>
      </div>
    </div>
  );
}
