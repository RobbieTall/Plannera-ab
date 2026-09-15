import { afterEach, describe, expect, it, vi } from "vitest";

import { getBaseUrl } from "@/lib/email";

describe("getBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the configured public application origin instead of an internal request origin", () => {
    vi.stubEnv("APP_URL", "https://preview.example.test/path/");
    vi.stubEnv("VERCEL_URL", "internal-deployment.vercel.app");

    expect(getBaseUrl(new Request("http://n/api/auth/verify"))).toBe(
      "https://preview.example.test",
    );
  });

  it("uses the Vercel deployment origin when APP_URL is absent", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_URL", "deployment.example.vercel.app");

    expect(getBaseUrl()).toBe("https://deployment.example.vercel.app");
  });

  it.each([
    "not-a-url",
    "javascript:alert(1)",
    "https://user:password@preview.example.test",
  ])("rejects an unsafe configured application URL: %s", (appUrl) => {
    vi.stubEnv("APP_URL", appUrl);

    expect(() => getBaseUrl(new Request("http://n/api/auth/verify"))).toThrow(
      /APP_URL must be/,
    );
  });
});
