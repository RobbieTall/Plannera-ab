import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSessionMock, getSessionContextMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  getSessionContextMock: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/getSessionContext", () => ({
  getSessionContext: getSessionContextMock,
}));

import { getUserContext } from "@/lib/getUserContext";

describe("getUserContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionContextMock.mockReturnValue({
      sessionId: "browser-session",
      userId: "copied-cookie-user",
    });
  });

  it("does not treat custom-cookie identity as authentication", async () => {
    getServerSessionMock.mockResolvedValue(null);

    await expect(getUserContext()).resolves.toEqual({
      sessionId: "browser-session",
      userId: null,
    });
  });

  it("uses revocable NextAuth identity while preserving browser continuity", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "database-user" } });

    await expect(getUserContext()).resolves.toEqual({
      sessionId: "browser-session",
      userId: "database-user",
    });
  });
});
