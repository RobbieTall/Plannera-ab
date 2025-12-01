import { cookies } from "next/headers";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  createAnonymousSession,
  decodeSessionCookie,
  serializeSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export type SessionContext = {
  userId: string | null;
  sessionId: string;
  user: { email: string } | null;
};

export async function getSessionContext(): Promise<SessionContext> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    let parsedSession = null;

    if (sessionCookie) {
      try {
        parsedSession = decodeSessionCookie(sessionCookie);
      } catch (error) {
        console.error("[getSessionContext] Failed to decode session cookie", error);
      }
    }

    const session = parsedSession ?? createAnonymousSession();

    if (!sessionCookie || !parsedSession) {
      try {
        const serialized = serializeSession(session);
        cookieStore.set(serialized.name, serialized.value, serialized.attributes);
      } catch (error) {
        console.error("[getSessionContext] Failed to persist anonymous session", error);
      }
    }

    let authSession = null;
    try {
      authSession = await getServerSession(authOptions);
    } catch (error) {
      console.error("[getSessionContext] Failed to read auth session", error);
    }

    const userId = session.userId ?? authSession?.user?.id ?? null;
    const user = authSession?.user?.email ? { email: authSession.user.email } : null;

    return {
      userId,
      sessionId: session.id,
      user,
    };
  } catch (error) {
    console.error("[getSessionContext] failed, falling back to anonymous session", error);
    const anonymousSession = createAnonymousSession();

    try {
      const cookieStore = cookies();
      const serialized = serializeSession(anonymousSession);
      cookieStore.set(serialized.name, serialized.value, serialized.attributes);
    } catch (cookieError) {
      console.error("[getSessionContext] Failed to persist fallback anonymous session", cookieError);
    }

    return {
      userId: null,
      sessionId: anonymousSession.id,
      user: null,
    };
  }
}
