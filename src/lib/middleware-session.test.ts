import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  decodeMiddlewareSessionCookie,
  MIDDLEWARE_SESSION_COOKIE_NAME,
  serializeMiddlewareSession,
  type MiddlewareSessionState,
} from "./middleware-session";

const SECRET = "middleware-compatibility-test-secret";
const ENV = { MAGIC_LINK_SECRET: SECRET };

function nodeSessionToken(session: MiddlewareSessionState) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

describe("Edge middleware session compatibility", () => {
  it("serializes the exact HMAC wire format used by server authentication", async () => {
    const session: MiddlewareSessionState = {
      id: "session_compatibility",
      userId: "user_123",
      createdAt: 1_725_000_000_000,
    };

    const serialized = await serializeMiddlewareSession(session, ENV);

    expect(serialized.name).toBe(MIDDLEWARE_SESSION_COOKIE_NAME);
    expect(serialized.value).toBe(nodeSessionToken(session));
    expect(serialized.attributes).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 2_592_000,
    });
  });

  it("accepts a server-generated token without changing its session facts", async () => {
    const session: MiddlewareSessionState = {
      id: "session_from_server",
      userId: null,
      createdAt: 1_725_000_000_001,
    };

    await expect(
      decodeMiddlewareSessionCookie(nodeSessionToken(session), ENV),
    ).resolves.toEqual(session);
  });

  it("fails closed for a modified signature", async () => {
    const session: MiddlewareSessionState = {
      id: "session_tampered",
      createdAt: 1_725_000_000_002,
    };
    const token = nodeSessionToken(session);
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    await expect(
      decodeMiddlewareSessionCookie(tampered, ENV),
    ).resolves.toBeNull();
  });

  it("does not print or expose the signing secret", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const session: MiddlewareSessionState = {
      id: "session_no_secret_output",
      createdAt: 1_725_000_000_003,
    };

    const serialized = await serializeMiddlewareSession(session, ENV);

    expect(serialized.value).not.toContain(SECRET);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
