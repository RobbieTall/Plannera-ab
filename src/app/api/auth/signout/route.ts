import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Clear session cookies
  const expiredCookie = {
    httpOnly: true as const,
    maxAge: 0,
    path: "/",
  };

  res.cookies.set(SESSION_COOKIE_NAME, "", expiredCookie);
  res.cookies.set("next-auth.session-token", "", expiredCookie);
  res.cookies.set("__Secure-next-auth.session-token", "", expiredCookie);

  return res;
}
