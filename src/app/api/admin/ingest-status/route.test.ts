import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    instrument: { findMany: vi.fn() },
    workspaceSourceChunk: { groupBy: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/legislation/config", () => ({
  ALL_INSTRUMENT_CONFIG: [
    {
      slug: "byron-lep-2014",
      name: "Byron Local Environmental Plan 2014",
      shortName: "Byron LEP 2014",
      instrumentType: "LEP",
    },
    {
      slug: "kempsey-lep-2013",
      name: "Kempsey Local Environmental Plan 2013",
      shortName: "Kempsey LEP 2013",
      instrumentType: "LEP",
    },
    {
      slug: "sepp-housing-2021",
      name: "Housing SEPP",
      shortName: "Housing",
      instrumentType: "SEPP",
    },
    {
      slug: "sepp-empty",
      name: "Empty SEPP",
      shortName: "Empty",
      instrumentType: "SEPP",
    },
  ],
}));

import { GET } from "./route";

const makeRequest = (secret?: string) =>
  new Request(`https://example.com/api/admin/ingest-status${secret ? `?secret=${secret}` : ""}`);

describe("GET /api/admin/ingest-status", () => {
  const originalSecret = process.env.INGEST_ADMIN_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INGEST_ADMIN_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.INGEST_ADMIN_SECRET = originalSecret;
  });

  it("returns 401 when secret is missing or wrong", async () => {
    const missingResponse = await GET(makeRequest());
    const wrongResponse = await GET(makeRequest("wrong-secret"));

    expect(missingResponse.status).toBe(401);
    expect(await missingResponse.json()).toEqual({ error: "unauthorized" });
    expect(wrongResponse.status).toBe(401);
    expect(await wrongResponse.json()).toEqual({ error: "unauthorized" });
    expect(prismaMock.instrument.findMany).not.toHaveBeenCalled();
    expect(prismaMock.workspaceSourceChunk.groupBy).not.toHaveBeenCalled();
  });

  it("returns 200 with the ingest status shape when secret matches", async () => {
    prismaMock.instrument.findMany.mockResolvedValue([
      {
        slug: "byron-lep-2014",
        name: "Byron Local Environmental Plan 2014",
        shortName: "Byron LEP 2014",
        instrumentType: "LEP",
        _count: { clauses: 2 },
        clauses: [{ createdAt: new Date("2026-01-02T03:04:05.000Z") }],
      },
    ]);
    prismaMock.workspaceSourceChunk.groupBy.mockResolvedValue([
      {
        lgaCode: "BYRON",
        _count: { _all: 3 },
        _max: { createdAt: new Date("2026-01-03T03:04:05.000Z") },
      },
    ]);

    const response = await GET(makeRequest("test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.generatedAt).toEqual(expect.any(String));
    expect(prismaMock.instrument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: { in: ["byron-lep-2014", "kempsey-lep-2013", "sepp-housing-2021", "sepp-empty"] } },
      }),
    );
    expect(payload.instruments).toEqual([
      {
        slug: "byron-lep-2014",
        name: "Byron Local Environmental Plan 2014",
        shortName: "Byron LEP 2014",
        instrumentType: "LEP",
        clauseCount: 2,
        lastIngestedAt: "2026-01-02T03:04:05.000Z",
      },
      {
        slug: "kempsey-lep-2013",
        name: "Kempsey Local Environmental Plan 2013",
        shortName: "Kempsey LEP 2013",
        instrumentType: "LEP",
        clauseCount: 0,
        lastIngestedAt: null,
      },
      {
        slug: "sepp-housing-2021",
        name: "Housing SEPP",
        shortName: "Housing",
        instrumentType: "SEPP",
        clauseCount: 0,
        lastIngestedAt: null,
      },
      {
        slug: "sepp-empty",
        name: "Empty SEPP",
        shortName: "Empty",
        instrumentType: "SEPP",
        clauseCount: 0,
        lastIngestedAt: null,
      },
    ]);
    expect(payload.councilDcp).toEqual([
      {
        lgaCode: "BYRON",
        chunkCount: 3,
        lastIngestedAt: "2026-01-03T03:04:05.000Z",
      },
    ]);
    expect(payload.summary).toMatchObject({ totalInstruments: 4, totalClauses: 2, totalDcpChunks: 3 });
  });

  it("computes summary fields correctly from mock data", async () => {
    prismaMock.instrument.findMany.mockResolvedValue([
      { slug: "byron-lep-2014", name: "Byron LEP", shortName: "Byron", instrumentType: "LEP", _count: { clauses: 10 }, clauses: [] },
      { slug: "kempsey-lep-2013", name: "Kempsey LEP", shortName: "Kempsey", instrumentType: "LEP", _count: { clauses: 20 }, clauses: [] },
      { slug: "sepp-housing-2021", name: "Housing SEPP", shortName: "Housing", instrumentType: "SEPP", _count: { clauses: 5 }, clauses: [] },
      { slug: "sepp-empty", name: "Empty SEPP", shortName: "Empty", instrumentType: "SEPP", _count: { clauses: 0 }, clauses: [] },
    ]);
    prismaMock.workspaceSourceChunk.groupBy.mockResolvedValue([
      { lgaCode: "BYRON", _count: { _all: 7 }, _max: { createdAt: null } },
      { lgaCode: "KEMPSEY", _count: { _all: 11 }, _max: { createdAt: new Date("2026-02-01T00:00:00.000Z") } },
    ]);

    const response = await GET(makeRequest("test-secret"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.summary).toEqual({
      totalInstruments: 4,
      instrumentsWithClauses: 3,
      totalClauses: 35,
      totalDcpChunks: 18,
      byronLepClauses: 10,
      kempseylLepClauses: 20,
      seppCount: 1,
      byronDcpChunks: 7,
      kempseylDcpChunks: 11,
    });
  });
});
