import fs from "fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildLepConfigFromFileSync } from "@/lib/lep/lep-ingest-files";
import { parseInstrumentDocument } from "@/lib/legislation/parser";
import { extractZoneTables } from "@/lib/lep/zone-table-extractor";

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


const realZoneProjection = (xmlPath: string, zoneCode: string) => {
  const xml = fs.readFileSync(xmlPath, "utf-8");
  const { config } = buildLepConfigFromFileSync(xmlPath, { xml });
  const clauses = parseInstrumentDocument(config, xml, "xml");
  const table = extractZoneTables(clauses).find((entry) => entry.zoneCode === zoneCode);
  if (!table) throw new Error(`Missing ${zoneCode} in ${xmlPath}`);
  return table;
};

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



  it("uses shared Kempsey E2 zone projections for fresh projects without project lepData", async () => {
    mocks.findProjectByExternalId.mockResolvedValue({ id: "project-1", lgaName: "Kempsey", zoningCode: "E2", lepData: null });
    mocks.prisma.instrument.findFirst.mockResolvedValue({ id: "instrument-1", name: "Kempsey LEP 2013", slug: "kempsey-lep-2013" });
    mocks.prisma.lepZoneObjective.findMany.mockResolvedValue([
      { objective: "To strengthen the role of Kempsey as a commercial centre." },
    ]);
    mocks.prisma.lepZoneLandUse.findMany.mockResolvedValue([
      { permission: "WITH_CONSENT", description: "Commercial premises" },
      { permission: "PROHIBITED", description: "Heavy industrial storage establishment" },
    ]);
    mocks.prisma.clause.findMany.mockResolvedValue([
      clause("4.3", "Height of buildings", "Zone E2 11m", ["Part 4"]),
    ]);

    const result = await buildQuickSiteCheckLep("project-1", { debug: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.objectives).toContain("To strengthen the role of Kempsey as a commercial centre.");
    expect(result.permissibility?.permittedWithConsent).toContain("Commercial premises");
    expect(result.permissibility?.prohibited).toContain("Heavy industrial storage establishment");
    expect(result.controls.heightOfBuilding).toEqual({ value: "11m", clauseRef: "4.3", confidence: "Cited" });
    expect(result.debug?.zoneObjectiveSource).toBe("ingested");
    expect(result.debug?.landUseSource).toBe("ingested");
  });


  it.each([
    ["Byron", "Byron LEP 2014", "byron-lep-2014", "SP3", "data/nsw/xml/Byron-lep-2014.xml"],
    ["Kempsey", "Kempsey LEP 2013", "kempsey-lep-2013", "E2", "data/nsw/xml/Kempsey-lep-2013.xml"],
  ])("uses actual extracted %s %s projections for a fresh project without project lepData", async (lgaName, instrumentName, slug, zoneCode, xmlPath) => {
    const projection = realZoneProjection(xmlPath, zoneCode);
    mocks.findProjectByExternalId.mockResolvedValue({ id: "project-1", lgaName, zoningCode: zoneCode, lepData: null });
    mocks.prisma.instrument.findFirst.mockResolvedValue({ id: "instrument-1", name: instrumentName, slug });
    mocks.prisma.lepZoneObjective.findMany.mockResolvedValue(projection.objectives.map((objective) => ({ objective })));
    mocks.prisma.lepZoneLandUse.findMany.mockResolvedValue([
      ...projection.landUse.withConsent.map((description) => ({ permission: "WITH_CONSENT", description })),
      ...projection.landUse.prohibited.map((description) => ({ permission: "PROHIBITED", description })),
      ...projection.landUse.withoutConsent.map((description) => ({ permission: "WITHOUT_CONSENT", description })),
    ]);
    mocks.prisma.clause.findMany.mockResolvedValue([]);

    const result = await buildQuickSiteCheckLep("project-1", { debug: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.objectives.length).toBeGreaterThan(0);
    expect(result.permissibility?.permittedWithConsent.length).toBeGreaterThan(0);
    expect(result.permissibility?.prohibited.length).toBeGreaterThan(0);
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
