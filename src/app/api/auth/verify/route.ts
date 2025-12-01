import { NextRequest, NextResponse } from "next/server";

import {
  NEXT_AUTH_SESSION_COOKIE,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  attachUserToSession,
  createAnonymousSession,
  decodeSessionCookie,
  serializeSession,
  verifyMagicLinkToken,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { claimSessionProjectsForUser } from "@/lib/projects";
import { getSessionFromRequest } from "@/lib/session";
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
    const decodedSession = decodeSessionCookie(sessionCookie);
    const requestSession = getSessionFromRequest(request);
    // Only use the client-provided session id for claiming anonymous projects so we target the
    // same records created from the landing page flow. If the cookie is missing/invalid, we still
    // create a fresh session for the authenticated user, but skip the claim.
    const baseSession = decodedSession ?? createAnonymousSession();
    const upgradedSession = attachUserToSession(baseSession, user.id);

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

    if (requestSession?.sessionId) {
      await claimSessionProjectsForUser(requestSession.sessionId, user.id);
    }

    const isSecure = request.nextUrl.protocol === "https:";
    const nextAuthSessionCookieName = `${isSecure ? "__Secure-" : ""}next-auth.session-token`;

    response.cookies.set(nextAuthSessionCookieName, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isSecure,
        });
    response.cookies.set(NEXT_AUTH_SESSION_COOKIE.name, sessionToken, {
      ...NEXT_AUTH_SESSION_COOKIE.options,
      expires: sessionExpires,
    });

    return response;
  } catch (error) {
    console.error("Magic link verification failed", error);
    return NextResponse.json({ error: "Unable to verify magic link" }, { status: 500 });
  }
}
