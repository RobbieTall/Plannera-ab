import type { NextRequest } from "next/server";

import { createAnonymousSession, decodeSessionCookie, serializeSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export type RequestSession = {
  sessionId: string;
  userId: string | null;
};

export const getSessionFromRequest = (request: NextRequest): RequestSession | null => {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const parsed = decodeSessionCookie(sessionCookie);

  if (!parsed) {
    return null;
  }

  return {
    sessionId: parsed.id,
    userId: parsed.userId ?? null,
  };
};

export const getOrCreateSessionFromRequest = (
  request: NextRequest,
): { session: RequestSession; serializedCookie: ReturnType<typeof serializeSession> | null } => {
  const existingSession = getSessionFromRequest(request);

  if (existingSession) {
    return { session: existingSession, serializedCookie: null };
  }

  const anonymousSession = createAnonymousSession();
  const serializedCookie = serializeSession(anonymousSession);

  return {
    session: { sessionId: anonymousSession.id, userId: anonymousSession.userId ?? null },
    serializedCookie,
  };
};
