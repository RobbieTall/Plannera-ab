import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  claimProjectForUserMock,
  claimSessionProjectsForUserMock,
  createAnonymousSessionMock,
  decodeSessionCookieMock,
  getSessionFromRequestMock,
  serializeSessionMock,
  sessionCreateMock,
  userUpsertMock,
  verifyMagicLinkTokenMock,
} = vi.hoisted(() => ({
  claimProjectForUserMock: vi.fn(),
  claimSessionProjectsForUserMock: vi.fn(),
  createAnonymousSessionMock: vi.fn(),
  decodeSessionCookieMock: vi.fn(),
  getSessionFromRequestMock: vi.fn(),
  serializeSessionMock: vi.fn(),
  sessionCreateMock: vi.fn(),
  userUpsertMock: vi.fn(),
  verifyMagicLinkTokenMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  NEXT_AUTH_SESSION_COOKIE: {
    name: "next-auth.session-token",
    options: { httpOnly: true, sameSite: "lax", path: "/" },
  },
  SESSION_COOKIE_NAME: "plannera-session",
  SESSION_MAX_AGE_SECONDS: 3600,
  createAnonymousSession: createAnonymousSessionMock,
  decodeSessionCookie: decodeSessionCookieMock,
  serializeSession: serializeSessionMock,
  verifyMagicLinkToken: verifyMagicLinkTokenMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: { create: sessionCreateMock },
    user: { upsert: userUpsertMock },
  },
}));

vi.mock("@/lib/projects", () => ({
  claimProjectForUser: claimProjectForUserMock,
  claimSessionProjectsForUser: claimSessionProjectsForUserMock,
}));

vi.mock("@/lib/session", () => ({
  getSessionFromRequest: getSessionFromRequestMock,
}));

import { GET } from "./route";

const verifyRequest = (callbackUrl = "/projects") =>
  new NextRequest(
    `http://n/api/auth/verify?token=valid-token&callbackUrl=${encodeURIComponent(callbackUrl)}`,
  );

describe("magic-link verification redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "https://preview.example.test");
    vi.stubEnv("VERCEL_URL", "internal-deployment.vercel.app");
    verifyMagicLinkTokenMock.mockReturnValue({ email: "Person@Example.com" });
    createAnonymousSessionMock.mockReturnValue({ sessionId: "anonymous-session" });
    decodeSessionCookieMock.mockReturnValue(null);
    getSessionFromRequestMock.mockReturnValue(null);
    serializeSessionMock.mockReturnValue({
      name: "plannera-session",
      value: "signed-session",
      attributes: { httpOnly: true, sameSite: "lax", path: "/" },
    });
    userUpsertMock.mockResolvedValue({ id: "user-1" });
    sessionCreateMock.mockResolvedValue({});
    claimProjectForUserMock.mockResolvedValue(false);
    claimSessionProjectsForUserMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects an internal Vercel request to the configured public Preview origin", async () => {
    const response = await GET(verifyRequest());

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://preview.example.test/projects");
    expect(userUpsertMock).toHaveBeenCalledOnce();
    expect(sessionCreateMock).toHaveBeenCalledOnce();
  });

  it.each([
    ["protocol-relative URL", () => verifyRequest("//attacker.example/steal")],
    ["absolute URL", () => verifyRequest("https://attacker.example/steal")],
    ["backslash URL", () => verifyRequest("/\\attacker.example/steal")],
    [
      "percent-encoded backslash URL",
      () => new NextRequest(
        "http://n/api/auth/verify?token=valid-token&callbackUrl=/%5Cattacker.example/steal",
      ),
    ],
  ] as const)(
    "keeps an unsafe %s callback on the configured public origin",
    async (_label, createRequest) => {
      const response = await GET(createRequest());

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://preview.example.test/dashboard");
    },
  );

  it("fails before database writes when the public application URL is invalid", async () => {
    vi.stubEnv("APP_URL", "not-a-url");

    const response = await GET(verifyRequest());

    expect(response.status).toBe(500);
    expect(userUpsertMock).not.toHaveBeenCalled();
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });
});
