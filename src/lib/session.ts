import type { NextRequest } from "next/server";

import { decodeSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";

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
