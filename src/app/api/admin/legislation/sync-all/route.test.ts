import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { syncAllInstrumentsMock, getServerSessionMock } = vi.hoisted(() => ({
  syncAllInstrumentsMock: vi.fn(),
  getServerSessionMock: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/legislation/config", () => ({
  INSTRUMENT_CONFIG: [
    { slug: "epa-act-1979", name: "Environmental Planning and Assessment Act 1979", instrumentType: "ACT" },
    { slug: "sepp-housing-2021", name: "State Environmental Planning Policy (Housing) 2021", instrumentType: "SEPP" },
  ],
}));
vi.mock("@/lib/legislation/service", () => ({ syncAllInstruments: syncAllInstrumentsMock }));

import { POST } from "./route";

describe("POST /api/admin/legislation/sync-all", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalAdminSecret = process.env.ADMIN_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";
    process.env.ADMIN_SECRET = "test-secret";
    getServerSessionMock.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.ADMIN_SECRET = originalAdminSecret;
  });

  it("requires an admin secret or authenticated admin session", async () => {
    const response = await POST(new Request("http://localhost/api/admin/legislation/sync-all", { method: "POST" }));

    expect(response.status).toBe(401);
    expect(syncAllInstrumentsMock).not.toHaveBeenCalled();
  });

  it("syncs instruments.json configs and returns an ingestion summary", async () => {
    syncAllInstrumentsMock.mockResolvedValue([
      {
        status: "ok",
        config: { slug: "sepp-housing-2021", name: "State Environmental Planning Policy (Housing) 2021", instrumentType: "SEPP" },
        added: 12,
        updated: 1,
        parsedClauses: 13,
        instrument: {
          id: "instrument-1",
          slug: "sepp-housing-2021",
          name: "State Environmental Planning Policy (Housing) 2021",
          shortName: "Housing SEPP",
          instrumentType: "SEPP",
          jurisdiction: "NSW",
          lastSyncedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/admin/legislation/sync-all", {
        method: "POST",
        headers: { "x-admin-secret": "test-secret", "content-type": "application/json" },
        body: JSON.stringify({ slugs: ["sepp-housing-2021"] }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(syncAllInstrumentsMock).toHaveBeenCalledWith({
      configs: expect.arrayContaining([expect.objectContaining({ slug: "sepp-housing-2021" })]),
      slugs: ["sepp-housing-2021"],
      limit: undefined,
    });
    expect(payload.summary).toMatchObject({ total: 1, ok: 1, added: 12, updated: 1, parsedClauses: 13 });
  });
});
