import { NextResponse } from "next/server";

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

export async function POST(req: Request) {
  let body: { code?: unknown; from?: unknown } = {};
  try {
    body = await req.json();
  } catch {}
  const code =
    typeof body.code === "string" ? body.code.trim().toLowerCase() : "";
  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Enter an invite code." },
      { status: 400 }
    );
  }
  const label = codeMap().get(code);
  if (!label) {
    return NextResponse.json(
      { ok: false, error: "That code isn't on the list." },
      { status: 401 }
    );
  }
  const from =
    typeof body.from === "string" &&
    body.from.startsWith("/") &&
    !body.from.startsWith("/access") &&
    !body.from.startsWith("/api/")
      ? body.from
      : "/";
  const res = NextResponse.json({ ok: true, label, redirect: from });
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  };
  res.cookies.set(COOKIE, code, opts);
  res.cookies.set(GUEST, label, { ...opts, httpOnly: false });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(GUEST, "", { path: "/", maxAge: 0 });
  return res;
}
