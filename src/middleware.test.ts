import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ITEM74H_VISUAL_ACCEPTANCE_PATH,
} from "@/lib/item74h-visual-acceptance";

import { middleware } from "./middleware";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Item 74H middleware HTTP boundary", () => {
  it("returns a real no-store 404 before session handling outside the authorised Preview", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "main");
    vi.stubEnv("PLANNING_PACK_CHECKOUT_ENABLED", "false");
    vi.stubEnv("SUBMISSION_SEE_CHECKOUT_ENABLED", "false");
    const request = new NextRequest(
      `https://plannera-ab.vercel.app${ITEM74H_VISUAL_ACCEPTANCE_PATH}`,
    );

    const response = await middleware(request);

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Not Found");
    expect(response.headers.get("cache-control")).toBe(
      "private, no-cache, no-store, max-age=0",
    );
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.cookies.get("np_session")).toBeUndefined();
  });

  it("preserves anonymous-session creation for ordinary routes", async () => {
    const response = await middleware(
      new NextRequest("https://plannera-ab.vercel.app/projects"),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get("np_session")?.value).toMatch(/^[^.]+\.[^.]+$/);
  });

  it("preserves the ensure endpoint cookie exemption", async () => {
    const response = await middleware(
      new NextRequest(
        "https://plannera-ab.vercel.app/api/projects/ensure?source=acceptance",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get("np_session")).toBeUndefined();
  });
});
