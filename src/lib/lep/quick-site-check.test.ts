import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    siteContext: { findUnique: vi.fn() },
    instrument: { findFirst: vi.fn() },
    lepZoneObjective: { findMany: vi.fn() },
    lepZoneLandUse: { findMany: vi.fn() },
    clause: { findMany: vi.fn() },
  },
  findProjectByExternalId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/project-identifiers", () => ({
  normalizeProjectId: (value: string) => value,
  findProjectByExternalId: mocks.findProjectByExternalId,
}));
vi.mock("@/lib/site-context", () => ({
  serializeSiteContext: (_siteContext: unknown, project: { lgaName?: string; zoningCode?: string }) => ({
    lgaName: project.lgaName ?? "Byron",
    zoningCode: project.zoningCode ?? "R2",
  }),
}));
vi.mock("@/lib/legislation/config", () => ({ getInstrumentConfig: () => null }));
vi.mock("@/lib/lep/lep-search", () => ({ buildLepInstrumentFilter: (lga: string) => ({ lga }) }));
vi.mock("@/lib/lep/nsw-lga-normaliser", () => ({ resolveCanonicalNswLga: (lga: string) => lga }));

const { buildQuickSiteCheckLep } = await import("./quick-site-check");

const clause = (clauseKey: string, title: string, bodyText: string, hierarchyPath = ["Part 4"]) => ({
  clauseKey,
  title,
  bodyText,
  hierarchyPath,
});

describe("buildQuickSiteCheckLep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findProjectByExternalId.mockResolvedValue({ id: "project-1", lgaName: "Byron", zoningCode: "R2" });
    mocks.prisma.siteContext.findUnique.mockResolvedValue(null);
    mocks.prisma.instrument.findFirst.mockResolvedValue({ id: "instrument-1", name: "Byron LEP 2014", slug: "byron-lep-2014" });
    mocks.prisma.lepZoneObjective.findMany.mockResolvedValue([]);
    mocks.prisma.lepZoneLandUse.findMany.mockResolvedValue([]);
  });

  it("extracts cited Part 4 controls from ingested clause rows", async () => {
    mocks.prisma.clause.findMany.mockResolvedValue([
      clause("2.3", "Zone objectives and Land Use Table", "Zone R2 Low Density Residential\nObjectives of zone\nTo provide housing.\nPermitted without consent\nHome occupations\nPermitted with consent\nDwelling houses\nProhibited\nIndustries", ["Part 2"]),
      clause("4.1", "Minimum lot size", "Zone R2 500m²\nZone R3 300m²"),
      clause("4.3", "Height of buildings", "Zone R2 8.5m\nZone R3 11m"),
      clause("4.4", "Floor space ratio", "Zone R2 0.5:1\nZone R3 0.7:1"),
    ]);

    const result = await buildQuickSiteCheckLep("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.controls.heightOfBuilding).toEqual({ value: "8.5m", clauseRef: "4.3", confidence: "Cited" });
    expect(result.controls.fsr).toEqual({ value: "0.5:1", clauseRef: "4.4", confidence: "Cited" });
    expect(result.controls.minLotSize).toEqual({ value: "500m²", clauseRef: "4.1", confidence: "Cited" });
    expect(result.landUse.withConsent).toContain("Dwelling houses");
    expect(result.permissibility?.permittedWithConsent).toContain("Dwelling houses");
    expect(result.dataSource).toBe("db_clauses");
  });

  it("gracefully returns null controls when clauses are missing", async () => {
    mocks.prisma.clause.findMany.mockResolvedValue([
      clause("2.3", "Zone objectives and Land Use Table", "Zone R2\nObjectives of zone\nTo provide housing.", ["Part 2"]),
    ]);

    const result = await buildQuickSiteCheckLep("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.controls.heightOfBuilding).toBeNull();
    expect(result.controls.fsr).toBeNull();
    expect(result.controls.minLotSize).toBeNull();
    expect(result.permissibility).toBeNull();
  });
});
