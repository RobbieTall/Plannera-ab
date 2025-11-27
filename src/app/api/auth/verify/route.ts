import { NextRequest, NextResponse } from "next/server";

import {
  attachUserToSession,
  createAnonymousSession,
  decodeSessionCookie,
  SESSION_COOKIE_NAME,
  serializeSession,
  verifyMagicLinkToken,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      update: { email },
      create: { email },
    });

    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const existingSession = decodeSessionCookie(sessionCookie) ?? createAnonymousSession();
    const upgradedSession = attachUserToSession(existingSession, user.id);

    const response = NextResponse.redirect(new URL("/", request.url));
    const serialized = serializeSession(upgradedSession);
    response.cookies.set(serialized.name, serialized.value, serialized.attributes);

    return response;
  } catch (error) {
    console.error("Magic link verification failed", error);
    return NextResponse.json({ error: "Unable to verify magic link" }, { status: 500 });
  }
}
