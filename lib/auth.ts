import { NextRequest } from "next/server";
import { firebaseAuth } from "./firebase-admin";
import { journalDb, journalUsers } from "../db";
import { eq } from "drizzle-orm";

export interface AuthenticatedUser {
  firebaseUid: string;
  email: string;
  dbUserId: string;
}

export async function authenticateRequest(
  req: NextRequest
): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header");
  }

  const idToken = authHeader.slice(7);

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    throw new AuthError("Invalid or expired token");
  }

  const users = await journalDb
    .select({ id: journalUsers.id })
    .from(journalUsers)
    .where(eq(journalUsers.firebaseUid, decoded.uid))
    .limit(1);

  if (users.length === 0) {
    throw new AuthError("User not found");
  }

  return {
    firebaseUid: decoded.uid,
    email: decoded.email ?? "",
    dbUserId: users[0].id,
  };
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
