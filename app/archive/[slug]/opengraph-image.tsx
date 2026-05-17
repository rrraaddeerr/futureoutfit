import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getItemBySlug, priceTeaser } from "@/lib/inventory";

export const alt = "rent.co archive object";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated on demand (not prerendered) so builds stay fast as the catalog grows.
const TRUCK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="#ff5a1f" stroke-width="2.4" stroke-linecap="square"><path d="M2 8h17v13H2z"/><path d="M19 13h6l5 5v3h-11z"/><circle cx="9" cy="24" r="3"/><circle cx="24" cy="24" r="3"/></svg>`;
const truckUri = `data:image/svg+xml;base64,${Buffer.from(TRUCK).toString("base64")}`;

export default async function ItemOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getItemBySlug(slug);

  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/Archivo-Regular.ttf")),
    readFile(join(process.cwd(), "app/fonts/Archivo-ExtraBold.ttf")),
  ]);

  const title = item?.title ?? "Object not found";
  const category = item?.category ?? "Archive";
  const id = (item?.id ?? "rc-—").toUpperCase();
  const price = item ? priceTeaser(item) : "";
  const titleSize = title.length > 30 ? 66 : title.length > 20 ? 80 : 92;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0c0c0d",
          padding: "66px 78px",
          fontFamily: "Archivo",
          color: "#ededea",
          position: "relative",
        }}
      >
        <img
          src={truckUri}
          width={560}
          height={560}
          style={{ position: "absolute", right: -135, bottom: -90, opacity: 0.07 }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={truckUri} width={42} height={42} />
            <div style={{ fontSize: 34, fontWeight: 800, marginLeft: 13 }}>
              rent.co
            </div>
          </div>
          <div style={{ fontSize: 20, letterSpacing: 3, color: "#9a9a92" }}>
            {`${id} // ARCHIVE`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                backgroundColor: "#5f8338",
                color: "#131509",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 1,
                padding: "10px 20px",
                transform: "rotate(-1.5deg)",
              }}
            >
              {category.toUpperCase()}
            </div>
          </div>
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.04,
              marginTop: 26,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 800, color: "#ff5a1f" }}>
            {price}
          </div>
          <div style={{ fontSize: 22, fontWeight: 400, color: "#9a9a92" }}>
            Manual inquiry — no checkout
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: regular, weight: 400, style: "normal" },
        { name: "Archivo", data: bold, weight: 800, style: "normal" },
      ],
    }
  );
}
