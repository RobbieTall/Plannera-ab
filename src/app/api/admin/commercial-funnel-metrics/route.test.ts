import { beforeEach, describe, expect, it, vi } from "vitest";

const { isAuthorizedMock, buildReportMock } = vi.hoisted(() => ({
  isAuthorizedMock: vi.fn(),
  buildReportMock: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ isAuthorized: isAuthorizedMock }));
vi.mock("@/lib/commercial-funnel-events", () => ({
  COMMERCIAL_FUNNEL_RETENTION_DAYS: 90,
  buildCommercialFunnelReport: buildReportMock,
}));

import { GET } from "@/app/api/admin/commercial-funnel-metrics/route";
import { resolveCommercialFunnelMetricsWindow } from "@/lib/commercial-funnel-metrics";

describe("commercial funnel aggregate metrics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthorizedMock.mockReturnValue(true);
    buildReportMock.mockResolvedValue({ counts: { CHECK_STARTED: 2 } });
  });

  it("allows only a valid window of no more than the retention period", () => {
    const now = new Date("2026-07-24T00:00:00.000Z");
    expect(resolveCommercialFunnelMetricsWindow(
      new URL("http://localhost/api/admin/commercial-funnel-metrics"),
      now,
    )).toEqual({
      from: new Date("2026-06-24T00:00:00.000Z"),
      to: now,
    });
    expect(resolveCommercialFunnelMetricsWindow(
      new URL("http://localhost/api/admin/commercial-funnel-metrics?from=2026-01-01&to=2026-07-24"),
      now,
    )).toBeNull();
  });

  it("does not accept admin credentials from query parameters", async () => {
    isAuthorizedMock.mockReturnValue(false);
    const response = await GET(new Request(
      "http://localhost/api/admin/commercial-funnel-metrics?token=leaked-token",
    ));
    expect(response.status).toBe(401);
    expect(isAuthorizedMock).toHaveBeenCalledWith(null);
  });

  it("returns only the aggregate report to an authorised operator", async () => {
    const response = await GET(new Request(
      "http://localhost/api/admin/commercial-funnel-metrics",
      { headers: { "x-admin-token": "secret" } },
    ));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ counts: { CHECK_STARTED: 2 } });
    expect(buildReportMock).toHaveBeenCalledOnce();
  });
});
