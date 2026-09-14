import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@next-auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(() => ({})),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { createMagicLinkToken, verifyMagicLinkToken } from "@/lib/auth";

const originalMagicLinkSecret = process.env.MAGIC_LINK_SECRET;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

afterEach(() => {
  if (originalMagicLinkSecret === undefined) {
    delete process.env.MAGIC_LINK_SECRET;
  } else {
    process.env.MAGIC_LINK_SECRET = originalMagicLinkSecret;
  }

  if (originalNextAuthSecret === undefined) {
    delete process.env.NEXTAUTH_SECRET;
  } else {
    process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
  }
});

describe("magic-link secret resolution", () => {
  it("falls back to a nonblank NextAuth secret when the primary variable is blank", () => {
    delete process.env.MAGIC_LINK_SECRET;
    process.env.NEXTAUTH_SECRET = "test-only-fallback-secret";
    const token = createMagicLinkToken("owner@example.com");

    process.env.MAGIC_LINK_SECRET = "   ";

    expect(verifyMagicLinkToken(token)).toMatchObject({
      email: "owner@example.com",
    });
  });
});
