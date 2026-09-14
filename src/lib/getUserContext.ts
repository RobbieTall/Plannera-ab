import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getSessionContext } from "@/lib/getSessionContext";

export type UserContext = {
  sessionId: string;
  userId: string | null;
};

/**
 * Resolves the current requester context for server components and route handlers.
 * - Always returns the sessionId from our session cookie (creating one if needed).
 * - Surfaces userId only from the revocable database-backed NextAuth session.
 */
export const getUserContext = async (): Promise<UserContext> => {
  const sessionContext = getSessionContext();
  let authSession: Session | null = null;
  try {
    authSession = await getServerSession(authOptions);
  } catch {
    // getServerSession can attempt to refresh cookies during SSR. In Server Components,
    // cookie mutation is not allowed, so fall back to a guest context instead of crashing.
    authSession = null;
  }

  const userId = authSession?.user?.id ?? null;

  return {
    sessionId: sessionContext.sessionId,
    userId,
  };
};
