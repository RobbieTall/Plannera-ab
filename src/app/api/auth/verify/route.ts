import { NextRequest, NextResponse } from "next/server";

import {
  attachUserToSession,
  createAnonymousSession,
  decodeSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  serializeSession,
  verifyMagicLinkToken,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const payload = verifyMagicLinkToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const email = payload.email.trim().toLowerCase();
    const user = await prisma.user.upsert({
      where: { email },
      update: { email, emailVerified: new Date() },
      create: { email, emailVerified: new Date() },
    });

    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const existingSession = decodeSessionCookie(sessionCookie) ?? createAnonymousSession();
    const upgradedSession = attachUserToSession(existingSession, user.id);

    const response = NextResponse.redirect(new URL("/", request.url));
    const serialized = serializeSession(upgradedSession);
    response.cookies.set(serialized.name, serialized.value, serialized.attributes);

    const sessionToken = randomUUID();
    const sessionExpires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: sessionExpires,
      },
    });

    const isSecure = request.nextUrl.protocol === "https:";
    const nextAuthSessionCookieName = `${isSecure ? "__Secure-" : ""}next-auth.session-token`;

    response.cookies.set(nextAuthSessionCookieName, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isSecure,
      expires: sessionExpires,
    });

    return response;
  } catch (error) {
    console.error("Magic link verification failed", error);
    return NextResponse.json({ error: "Unable to verify magic link" }, { status: 500 });
  }
}
