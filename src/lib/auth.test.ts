import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  SESSION_MAX_AGE_SECONDS,
  decodeSessionCookie,
  serializeSession,
  type SessionState,
} from "@/lib/auth";

const originalMagicLinkSecret = process.env.MAGIC_LINK_SECRET;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

afterEach(() => {
  vi.useRealTimers();
  if (originalMagicLinkSecret === undefined) delete process.env.MAGIC_LINK_SECRET;
  else process.env.MAGIC_LINK_SECRET = originalMagicLinkSecret;
  if (originalNextAuthSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
});

const encodeSession = (session: SessionState) => serializeSession(session).value;

describe("decodeSessionCookie", () => {
  it("accepts a current session signed with a configured secret", () => {
    process.env.MAGIC_LINK_SECRET = "test-session-secret";
    const session = { id: "session-1", userId: "user-1", createdAt: Date.now() };

    expect(decodeSessionCookie(encodeSession(session))).toEqual(session);
  });

  it("rejects an identity-bearing session when no signing secret is configured", () => {
    delete process.env.MAGIC_LINK_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    const session = { id: "session-1", userId: "user-1", createdAt: Date.now() };

    expect(decodeSessionCookie(encodeSession(session))).toBeNull();
  });

  it("rejects a signed session after the configured maximum age", () => {
    process.env.MAGIC_LINK_SECRET = "test-session-secret";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T00:00:00.000Z"));
    const session = {
      id: "session-1",
      userId: "user-1",
      createdAt: Date.now() - SESSION_MAX_AGE_SECONDS * 1000 - 1,
    };

    expect(decodeSessionCookie(encodeSession(session))).toBeNull();
  });

  it("rejects a session with a future creation time", () => {
    process.env.MAGIC_LINK_SECRET = "test-session-secret";
    const session = { id: "session-1", userId: "user-1", createdAt: Date.now() + 60_000 };

    expect(decodeSessionCookie(encodeSession(session))).toBeNull();
  });
});
