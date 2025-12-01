import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getSessionContext } from "@/lib/getSessionContext";

export type UserContext = {
  sessionId: string;
  userId: string | null;
};

/**
 * Resolves the current requester context for server components and route handlers.
 * - Always returns the sessionId from our session cookie (creating one if needed).
 * - If the user is authenticated via NextAuth, surfaces their userId; otherwise null.
 */
export const getUserContext = async (): Promise<UserContext> => {
  const sessionContext = getSessionContext();
  const authSession = await getServerSession(authOptions);

  const userId = authSession?.user?.id ?? sessionContext.userId ?? null;

  return {
    sessionId: sessionContext.sessionId,
    userId,
  };
};
