import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pruneMock } = vi.hoisted(() => ({ pruneMock: vi.fn() }));

vi.mock("@/lib/commercial-funnel-events", () => ({
  pruneExpiredCommercialFunnelEvents: pruneMock,
}));

import { GET } from "@/app/api/cron/commercial-funnel-retention/route";

const originalCronSecret = process.env.CRON_SECRET;

describe("commercial funnel retention cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "retention-secret";
    pruneMock.mockResolvedValue({ count: 3 });
  });

  afterEach(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it("fails closed without the exact Vercel bearer secret", async () => {
    const response = await GET(new Request(
      "http://localhost/api/cron/commercial-funnel-retention",
      { headers: { authorization: "Bearer wrong" } },
    ));
    expect(response.status).toBe(401);
    expect(pruneMock).not.toHaveBeenCalled();
  });

  it("deletes expired rows for an authenticated cron request", async () => {
    const response = await GET(new Request(
      "http://localhost/api/cron/commercial-funnel-retention",
      { headers: { authorization: "Bearer retention-secret" } },
    ));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, deleted: 3 });
  });
});
