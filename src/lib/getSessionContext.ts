import { cookies } from "next/headers";

import { createAnonymousSession, decodeSessionCookie, serializeSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import type { RequestSession } from "@/lib/session";

const mapSessionStateToContext = (value: string | undefined): RequestSession | null => {
  const parsed = decodeSessionCookie(value);

  if (!parsed) {
    return null;
  }

  return {
    sessionId: parsed.id,
    userId: parsed.userId ?? null,
  };
};

export const getSessionContext = (): RequestSession => {
  const cookieStore = cookies();
  const existingCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const existingSession = mapSessionStateToContext(existingCookie);

  if (existingSession) {
    return existingSession;
  }

  const anonymousSession = createAnonymousSession();
  const serialized = serializeSession(anonymousSession);

  // When sign-in is introduced, we can attach the authenticated userId here.
  cookieStore.set(serialized.name, serialized.value, serialized.attributes);

  return {
    sessionId: anonymousSession.id,
    userId: anonymousSession.userId ?? null,
  };
};
