import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth";

const expiredCookie = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set(SESSION_COOKIE_NAME, "", expiredCookie);
  res.cookies.set("next-auth.session-token", "", expiredCookie);
  res.cookies.set("__Secure-next-auth.session-token", "", { ...expiredCookie, secure: true });
  res.cookies.set("next-auth.callback-url", "", { ...expiredCookie, httpOnly: false });

  return res;
}
