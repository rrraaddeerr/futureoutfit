import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "rentco_access";
const GUEST = "rentco_guest";

function codeMap(): Map<string, string> {
  const raw = process.env.ACCESS_CODES ?? "operator:Operator,launch:Launch";
  const map = new Map<string, string>();
  for (const part of raw.split(",")) {
    const [code, label] = part.split(":").map((s) => s?.trim() ?? "");
    if (code) map.set(code.toLowerCase(), label || "Guest");
  }
  return map;
}

function setAccessCookies(res: NextResponse, code: string, label: string) {
  const opts = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  };
  res.cookies.set(COOKIE, code, { ...opts, httpOnly: true });
  res.cookies.set(GUEST, label, { ...opts, httpOnly: false });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Personal invite link: /i/<code> -> set cookie, drop visitor on homepage.
  const inviteMatch = pathname.match(/^\/i\/([A-Za-z0-9_-]+)\/?$/);
  if (inviteMatch) {
    const code = inviteMatch[1].toLowerCase();
    const label = codeMap().get(code);
    if (label) {
      const dest = req.nextUrl.clone();
      dest.pathname = "/";
      dest.search = "";
      const res = NextResponse.redirect(dest);
      setAccessCookies(res, code, label);
      return res;
    }
    // Unknown code in link — drop them at the gate with the code prefilled
    // so they can see what they tried and ask for a real one.
    const fallback = req.nextUrl.clone();
    fallback.pathname = "/access";
    fallback.search = "";
    fallback.searchParams.set("code", code);
    return NextResponse.redirect(fallback);
  }

  const cookie = req.cookies.get(COOKIE)?.value?.toLowerCase();
  if (cookie && codeMap().has(cookie)) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = "/access";
  url.search = "";
  if (pathname !== "/" && !pathname.startsWith("/access")) {
    url.searchParams.set("from", pathname + req.nextUrl.search);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!access|api/access|_next/static|_next/image|inventory/|fonts/|favicon.ico|icon.svg|apple-icon|opengraph-image|robots.txt|sitemap.xml|manifest.webmanifest).*)",
  ],
};
