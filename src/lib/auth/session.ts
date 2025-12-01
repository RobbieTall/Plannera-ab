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
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const parsedSession = decodeSessionCookie(sessionCookie) ?? createAnonymousSession();

  if (!sessionCookie) {
    const serialized = serializeSession(parsedSession);
    cookieStore.set(serialized.name, serialized.value, serialized.attributes);
  }

  const authSession = await getServerSession(authOptions);

  const userId = parsedSession.userId ?? authSession?.user?.id ?? null;
  const user = authSession?.user?.email ? { email: authSession.user.email } : null;

  return {
    userId,
    sessionId: parsedSession.id,
    user,
  };
}
