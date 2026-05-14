import { NextRequest } from "next/server";
import { firebaseAuth } from "./firebase-admin";
import { journalDb, journalUsers } from "../db";
import { eq } from "drizzle-orm";

export interface AuthenticatedUser {
  firebaseUid: string;
  email: string;
  dbUserId: string;
}

// Cache Firebase UID → DB user ID in the serverless function's process memory.
// Firebase tokens are valid for 1 hour; a 5-minute TTL is safe and eliminates
// the DB round-trip on every request within a warm instance.
const AUTH_CACHE_TTL_MS = 5 * 60 * 1000;
interface CacheEntry {
  user: AuthenticatedUser;
  expiresAt: number;
}
const authCache = new Map<string, CacheEntry>();

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

  // Check cache before hitting the DB.
  const now = Date.now();
  const cached = authCache.get(decoded.uid);
  if (cached && now < cached.expiresAt) {
    return cached.user;
  }

  const users = await journalDb
    .select({ id: journalUsers.id })
    .from(journalUsers)
    .where(eq(journalUsers.firebaseUid, decoded.uid))
    .limit(1);

  if (users.length === 0) {
    throw new AuthError("User not found");
  }

  const user: AuthenticatedUser = {
    firebaseUid: decoded.uid,
    email: decoded.email ?? "",
    dbUserId: users[0].id,
  };

  authCache.set(decoded.uid, { user, expiresAt: now + AUTH_CACHE_TTL_MS });
  return user;
}

// Call when a user record is deleted so stale entries don't linger.
export function invalidateAuthCache(firebaseUid: string): void {
  authCache.delete(firebaseUid);
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
