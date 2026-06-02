import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getLegislationHealthMock } = vi.hoisted(() => ({ getLegislationHealthMock: vi.fn() }));

vi.mock("@/lib/legislation/service", () => ({ getLegislationHealth: getLegislationHealthMock }));

import { GET } from "./route";

describe("GET /api/legislation/health", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("returns clause counts and last sync timestamps per instrument", async () => {
    getLegislationHealthMock.mockResolvedValue({
      instrumentCount: 1,
      clauseCount: 42,
      instruments: [
        {
          id: "instrument-1",
          slug: "sepp-housing-2021",
          name: "State Environmental Planning Policy (Housing) 2021",
          shortName: "Housing SEPP",
          instrumentType: "SEPP",
          jurisdiction: "NSW",
          currentClauseCount: 42,
          lastSyncedAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        },
      ],
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, instrumentCount: 1, clauseCount: 42 });
    expect(payload.instruments[0]).toMatchObject({
      slug: "sepp-housing-2021",
      currentClauseCount: 42,
      lastSyncedAt: "2026-01-01T00:00:00.000Z",
    });
  });
});
