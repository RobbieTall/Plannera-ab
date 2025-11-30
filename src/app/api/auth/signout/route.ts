import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Clear session cookie
  res.cookies.set("session", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });

  return res;
}
