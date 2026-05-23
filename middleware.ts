import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "rentco_access";

function validCodes(): Set<string> {
  const raw = process.env.ACCESS_CODES ?? "operator:Operator,launch:Launch";
  const set = new Set<string>();
  for (const part of raw.split(",")) {
    const code = part.split(":")[0]?.trim().toLowerCase();
    if (code) set.add(code);
  }
  return set;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get(COOKIE)?.value?.toLowerCase();
  if (cookie && validCodes().has(cookie)) {
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
