import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    siteContext: { findUnique: vi.fn() },
    instrument: { findFirst: vi.fn() },
    lepZoneObjective: { findMany: vi.fn() },
    lepZoneLandUse: { findMany: vi.fn() },
    clause: { findMany: vi.fn() },
    dCPClause: { findMany: vi.fn() },
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
    mocks.prisma.dCPClause.findMany.mockResolvedValue([]);
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
    expect(result.controls.setback).toBeNull();
  });



  it("uses shared zone projections for fresh projects without project lepData", async () => {
    mocks.findProjectByExternalId.mockResolvedValue({ id: "project-1", lgaName: "Byron", zoningCode: "SP3", lepData: null });
    mocks.prisma.lepZoneObjective.findMany.mockResolvedValue([
      { objective: "To provide for tourist-oriented development and related uses." },
    ]);
    mocks.prisma.lepZoneLandUse.findMany.mockResolvedValue([
      { permission: "WITH_CONSENT", description: "Tourist and visitor accommodation" },
      { permission: "PROHIBITED", description: "Residential accommodation" },
    ]);
    mocks.prisma.clause.findMany.mockResolvedValue([
      clause("4.3", "Height of buildings", "Zone SP3 9m", ["Part 4"]),
    ]);

    const result = await buildQuickSiteCheckLep("project-1", { debug: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.objectives).toContain("To provide for tourist-oriented development and related uses.");
    expect(result.permissibility?.permittedWithConsent).toContain("Tourist and visitor accommodation");
    expect(result.permissibility?.prohibited).toContain("Residential accommodation");
    expect(result.debug?.zoneObjectiveSource).toBe("ingested");
    expect(result.debug?.landUseSource).toBe("ingested");
  });

  it("extracts cited Kempsey E2 commercial controls from LEP and DCP rows and marks missing controls unavailable", async () => {
    mocks.findProjectByExternalId.mockResolvedValue({ id: "project-1", lgaName: "Kempsey", zoningCode: "E2" });
    mocks.prisma.instrument.findFirst.mockResolvedValue({ id: "instrument-1", name: "Kempsey LEP 2013", slug: "kempsey-lep-2013" });
    mocks.prisma.clause.findMany.mockResolvedValue([
      clause("2.3", "Zone objectives and Land Use Table", "Zone E2 Commercial Centre\nObjectives of zone\nTo strengthen commercial centres.\nPermitted with consent\nCommercial premises", ["Part 2"]),
      clause("4.3", "Height of buildings", "Zone E2 11m\nZone R1 8.5m"),
      clause("4.4", "Floor space ratio", "Zone E2 2:1\nZone R1 0.75:1"),
    ]);
    mocks.prisma.dCPClause.findMany.mockResolvedValue([
      {
        ref: "Part D Commercial Centres",
        title: "Kempsey CBD built form and setbacks",
        headingPath: ["Part D", "Commercial Centres", "Setbacks"],
        bodyText: "For Zone E2 Commercial Centre development, the street setback is 0m to reinforce the main street edge.",
      },
      {
        ref: "Part D Active Frontages",
        title: "Active frontages",
        headingPath: ["Part D", "Commercial Centres", "Active frontages"],
        bodyText: "In the E2 Commercial Centre, active frontage must be provided to the primary street frontage.",
      },
      {
        ref: "Part B Parking",
        title: "Parking objectives",
        headingPath: ["Part B", "Parking"],
        bodyText: "Parking is to be safe and accessible for commercial development, but this excerpt does not set a numeric E2 rate.",
      },
    ]);

    const result = await buildQuickSiteCheckLep("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.controls.heightOfBuilding).toEqual({ value: "11m", clauseRef: "4.3", confidence: "Cited" });
    expect(result.controls.fsr).toEqual({ value: "2:1", clauseRef: "4.4", confidence: "Cited" });
    expect(result.controls.setback).toMatchObject({ value: "0m", confidence: "Cited", sourceRef: "Kempsey DCP 2026 Part D > Commercial Centres > Setbacks" });
    expect(result.controls.activeFrontageBuiltForm).toMatchObject({ confidence: "Cited", sourceRef: "Kempsey DCP 2026 Part D > Commercial Centres > Active frontages" });
    expect(result.controls.parking).toEqual({ value: "", clauseRef: "", sourceRef: "Kempsey DCP 2026 parking controls", confidence: "Unavailable" });
  });


  it("preserves SP3 clauses that explicitly include the current zone despite exclusion trigger terms", async () => {
    mocks.findProjectByExternalId.mockResolvedValue({ id: "project-1", lgaName: "Byron", zoningCode: "SP3" });
    mocks.prisma.clause.findMany.mockResolvedValue([
      clause("2.3", "Zone objectives and Land Use Table", "Zone SP3 Tourist\nObjectives of zone\nTo provide tourist accommodation.\nPermitted with consent\nTourist and visitor accommodation", ["Part 2"]),
      clause("4.3-SP3", "Height of buildings", "Zone SP3 Tourist height controls mention secondary dwelling prohibitions but apply to SP3 Tourist land."),
      clause("4.2A", "Rural subdivision", "Secondary dwelling provisions apply to rural land in Zone RU2 Rural Landscape only."),
    ]);

    const result = await buildQuickSiteCheckLep("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.part4.map((item) => item.clauseNumber)).toContain("4.3-SP3");
    expect(result.part4.map((item) => item.clauseNumber)).not.toContain("4.2A");
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
