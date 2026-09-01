import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { ITEM74H_VISUAL_ACCEPTANCE_BRANCH } from "@/lib/item74h-visual-acceptance";
import { GET } from "./route";

const originalEnvironment = {
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  PLANNING_PACK_CHECKOUT_ENABLED:
    process.env.PLANNING_PACK_CHECKOUT_ENABLED,
  SUBMISSION_SEE_CHECKOUT_ENABLED:
    process.env.SUBMISSION_SEE_CHECKOUT_ENABLED,
};

const setEnvironment = (values: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

afterEach(() => {
  setEnvironment(originalEnvironment);
});

describe("Item 74H visual acceptance transport guard", () => {
  it("returns a plain no-store 404 outside the exact protected Preview", async () => {
    setEnvironment({
      VERCEL: "1",
      VERCEL_ENV: "production",
      VERCEL_GIT_COMMIT_REF: "main",
      PLANNING_PACK_CHECKOUT_ENABLED: "false",
      SUBMISSION_SEE_CHECKOUT_ENABLED: "false",
    });

    const response = GET(
      new NextRequest(
        "https://plannera.example/internal/item74h-commercial-acceptance",
      ),
    );

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("redirects only the exact checkout-disabled Preview to the guarded view", () => {
    setEnvironment({
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: ITEM74H_VISUAL_ACCEPTANCE_BRANCH,
      PLANNING_PACK_CHECKOUT_ENABLED: "false",
      SUBMISSION_SEE_CHECKOUT_ENABLED: "false",
    });

    const response = GET(
      new NextRequest(
        "https://plannera.example/internal/item74h-commercial-acceptance",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://plannera.example/internal/item74h-commercial-acceptance/view",
    );
  });
});
