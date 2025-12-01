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

  return res;
}
