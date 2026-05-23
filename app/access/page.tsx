import type { Metadata } from "next";
import { BrandStamp } from "@/components/BrandStamp";
import { AccessForm } from "./AccessForm";

export const metadata: Metadata = {
  title: "Invite only",
  robots: { index: false, follow: false },
};

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@r-ent.co";

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const dest =
    typeof from === "string" && from.startsWith("/") && !from.startsWith("/access")
      ? from
      : "/";

  return (
    <div className="access-screen">
      <div className="access-screen__card">
        <div className="access-screen__stamp">
          <BrandStamp size={180} />
        </div>

        <div className="access-screen__meta">SOFT LAUNCH // INVITE ONLY</div>

        <h1 className="access-screen__title">
          The archive is open<br />for invited guests.
        </h1>

        <p className="access-screen__copy">
          rent.co is in operator preview. Enter the code you were sent and
          step inside.
        </p>

        <AccessForm from={dest} />

        <p className="access-screen__footnote">
          No code?{" "}
          <a href={`mailto:${CONTACT_EMAIL}?subject=Invite%20to%20rent.co`}>
            ask for one
          </a>{" "}
          — every invite is hand-issued.
        </p>
      </div>

      <div className="access-screen__base">
        rent.co // operated by RaderENT // Vancouver HQ, access anywhere
      </div>
    </div>
  );
}
