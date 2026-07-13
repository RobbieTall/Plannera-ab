import { beforeEach, describe, expect, it, vi } from "vitest";

const { dcpFindManyMock, instrumentFindManyMock } = vi.hoisted(() => ({
  dcpFindManyMock: vi.fn(),
  instrumentFindManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dCPClause: { findMany: dcpFindManyMock },
    instrument: { findMany: instrumentFindManyMock },
  },
}));

import { buildStatutoryContextBlock } from "@/lib/statutory-context-builder";

describe("buildStatutoryContextBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dcpFindManyMock.mockResolvedValue([]);
    instrumentFindManyMock.mockResolvedValue([]);
  });

  it("formats retrieved LEP and DCP clauses into a prompt block", async () => {
    dcpFindManyMock.mockResolvedValue([
      {
        id: "dcp-1",
        lgaCode: "BYRON",
        instrumentSlug: "byron-dcp-2014",
        ref: "D1.2",
        title: "Setbacks",
        headingPath: ["Chapter D1", "Setbacks"],
        parentRef: null,
        depth: 2,
        bodyHtml: "",
        bodyText:
          "Front setback is 4.5m and side setback is 1.5m for the tested control.",
        topicTags: ["setbacks"],
        numericMeta: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    instrumentFindManyMock.mockResolvedValue([
      {
        id: "instrument-1",
        name: "Byron Local Environmental Plan 2014",
        clauses: [
          {
            clauseKey: "4.3",
            title: "Height of buildings",
            bodyText:
              "The height of a building on any land is not to exceed the maximum height shown for the land.",
          },
        ],
      },
    ]);

    const result = await buildStatutoryContextBlock({
      lgaCode: "byron",
      query: "height setbacks",
      maxDcpClauses: 5,
      maxLepClauses: 3,
    });

    expect(result.sourceTypes).toEqual(["cited"]);
    expect(result.promptBlock).toContain(
      "--- RETRIEVED PLANNING CONTROLS FOR BYRON ---",
    );
    expect(result.promptBlock).toContain(
      "[Byron Local Environmental Plan 2014 4.3]: Height of buildings",
    );
    expect(result.promptBlock).toContain(
      "[D1.2] Setbacks: Front setback is 4.5m",
    );
  });

  it("formats empty results as unresolved without fabricating clauses", async () => {
    const result = await buildStatutoryContextBlock({
      lgaCode: "KEMPSEY",
      query: "parking",
    });

    expect(result.dcpClauses).toEqual([]);
    expect(result.lepClauses).toEqual([]);
    expect(result.sourceTypes).toEqual(["unresolved"]);
    expect(result.promptBlock).toContain("No LEP clauses were found");
    expect(result.promptBlock).toContain("No DCP clauses were found");
  });

  it("respects maximum DCP and LEP clause limits", async () => {
    dcpFindManyMock.mockResolvedValue(
      Array.from({ length: 4 }, (_, index) => ({
        id: `dcp-${index}`,
        lgaCode: "BYRON",
        instrumentSlug: null,
        ref: `D1.${index}`,
        title: `DCP heading ${index}`,
        headingPath: [`DCP heading ${index}`],
        parentRef: null,
        depth: 1,
        bodyHtml: "",
        bodyText: `Setback control ${index}`,
        topicTags: [],
        numericMeta: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      })),
    );
    instrumentFindManyMock.mockResolvedValue([
      {
        id: "instrument-1",
        name: "Byron Local Environmental Plan 2014",
        clauses: Array.from({ length: 5 }, (_, index) => ({
          clauseKey: `4.${index}`,
          title: `LEP heading ${index}`,
          bodyText: `Height control ${index}`,
        })),
      },
    ]);

    const result = await buildStatutoryContextBlock({
      lgaCode: "BYRON",
      query: "height setback",
      maxDcpClauses: 2,
      maxLepClauses: 2,
    });

    expect(result.dcpClauses).toHaveLength(2);
    expect(result.lepClauses).toHaveLength(2);
  });

  it("uses the provided lgaCode when retrieving and formatting LEP clauses", async () => {
    instrumentFindManyMock.mockResolvedValue([
      {
        id: "instrument-ballina",
        name: "Ballina Local Environmental Plan 2012",
        clauses: [
          {
            clauseKey: "4.4",
            title: "Floor space ratio",
            bodyText:
              "The maximum floor space ratio for a building is not to exceed the floor space ratio shown for the land.",
          },
        ],
      },
    ]);

    const result = await buildStatutoryContextBlock({
      lgaCode: "ballina",
      query: "floor space ratio",
      maxLepClauses: 1,
    });

    expect(instrumentFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({
                  slug: expect.objectContaining({ contains: "ballina" }),
                }),
              ]),
            }),
          ]),
        }),
      }),
    );
    expect(result.lepClauses).toEqual([
      {
        clauseKey: "4.4",
        heading: "Floor space ratio",
        value:
          "The maximum floor space ratio for a building is not to exceed the floor space ratio shown for the land.",
        instrumentName: "Ballina Local Environmental Plan 2012",
      },
    ]);
    expect(result.promptBlock).toContain(
      "--- RETRIEVED PLANNING CONTROLS FOR BALLINA ---",
    );
    expect(result.promptBlock).toContain(
      "[Ballina Local Environmental Plan 2012 4.4]: Floor space ratio",
    );
  });

  it("prioritises commercial-zone clauses and excludes unrelated rural/residential-only provisions", async () => {
    const baseClause = {
      lgaCode: "KEMPSEY",
      instrumentSlug: "kempsey-dcp-2013",
      parentRef: null,
      depth: 2,
      bodyHtml: "",
      topicTags: ["setbacks"],
      numericMeta: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    dcpFindManyMock.mockResolvedValue([
      {
        ...baseClause,
        id: "commercial-dcp",
        ref: "KEMP-DCP-E2",
        title: "Commercial centre built form and setbacks",
        headingPath: ["Commercial development", "E2 Commercial Centre setbacks"],
        bodyText: "Controls for land in Zone E2 Commercial Centre include street activation, shopfront built form and commercial setback guidance.",
      },
      {
        ...baseClause,
        id: "rural-dcp",
        ref: "KEMP-DCP-RU1",
        title: "Rural boundary setbacks",
        headingPath: ["Rural development", "RU1 rural boundary setbacks"],
        bodyText: "This rural boundary setback control applies to land in Zone RU1 Primary Production and rural zones only.",
      },
      {
        ...baseClause,
        id: "residential-dcp",
        ref: "KEMP-DCP-R1",
        title: "Dual occupancy and secondary dwellings",
        headingPath: ["Residential development", "R1 dual occupancy"],
        bodyText: "Dual occupancy, bed and breakfast accommodation and secondary dwelling provisions apply in Zone R1 residential zones only.",
      },
    ]);
    instrumentFindManyMock.mockResolvedValueOnce([
      {
        id: "instrument-kempsey",
        name: "Kempsey Local Environmental Plan 2013",
        clauses: [
          {
            clauseKey: "2.3-E2",
            title: "Zone E2 Commercial Centre",
            bodyText: "Zone E2 Commercial Centre objectives support commercial premises, retail and business uses in the commercial centre.",
          },
          {
            clauseKey: "KEMP_2013_1",
            title: "Rural and residential accommodation controls",
            bodyText: "This clause applies to rural zones RU1 and residential zone R1 for rural boundary setbacks, dual occupancy and secondary dwellings.",
          },
        ],
      },
    ]);
    instrumentFindManyMock.mockResolvedValueOnce([]);

    const result = await buildStatutoryContextBlock({
      lgaCode: "KEMPSEY",
      query: "commercial setbacks and height limits",
      siteZone: "E2 – Commercial Centre",
      maxDcpClauses: 3,
      maxLepClauses: 3,
    });

    expect(result.dcpClauses.map((clause) => clause.clauseNumber)).toContain("KEMP-DCP-E2");
    expect(result.dcpClauses.map((clause) => clause.clauseNumber)).not.toContain("KEMP-DCP-RU1");
    expect(result.dcpClauses.map((clause) => clause.clauseNumber)).not.toContain("KEMP-DCP-R1");
    expect(result.lepClauses.map((clause) => clause.clauseKey)).toContain("2.3-E2");
    expect(result.lepClauses.map((clause) => clause.clauseKey)).not.toContain("KEMP_2013_1");
    expect(result.promptBlock).toContain("Zone E2 Commercial Centre");
    expect(result.promptBlock).not.toContain("rural boundary setbacks, dual occupancy");
  });

  it("excludes rural/residential-only provisions for Byron SP3 tourist sites", async () => {
    const baseClause = {
      lgaCode: "BYRON",
      instrumentSlug: "byron-dcp-2014",
      parentRef: null,
      depth: 2,
      bodyHtml: "",
      topicTags: ["permissibility"],
      numericMeta: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    dcpFindManyMock.mockResolvedValue([
      {
        ...baseClause,
        id: "tourist-dcp",
        ref: "BYRON-SP3",
        title: "Tourist and visitor accommodation",
        headingPath: ["Chapter D", "SP3 Tourist"],
        bodyText: "Controls for Zone SP3 Tourist support tourist and visitor accommodation and related built form.",
      },
      {
        ...baseClause,
        id: "tourist-mixed-use",
        ref: "BYRON-SP3-MIXED",
        title: "SP3 Tourist secondary dwelling prohibition",
        headingPath: ["Chapter D", "SP3 Tourist"],
        bodyText: "Zone SP3 Tourist controls state secondary dwelling is prohibited; the exact trigger term must not exclude a current-zone clause.",
      },
      {
        ...baseClause,
        id: "rural-secondary",
        ref: "BYRON-RU2-SECONDARY",
        title: "Rural secondary dwellings",
        headingPath: ["Rural development"],
        bodyText: "Secondary dwelling provisions apply to rural land in Zone RU2 Rural Landscape only.",
      },
      {
        ...baseClause,
        id: "residential-dual",
        ref: "BYRON-R2-DUAL",
        title: "Residential dual occupancy",
        headingPath: ["Residential development"],
        bodyText: "Dual occupancy provisions apply in residential zones only.",
      },
    ]);
    instrumentFindManyMock.mockResolvedValueOnce([
      {
        id: "instrument-byron",
        name: "Byron Local Environmental Plan 2014",
        clauses: [
          {
            clauseKey: "2.3-SP3",
            title: "Zone SP3 Tourist",
            bodyText: "Zone SP3 Tourist objectives support tourist and visitor accommodation.",
          },
          {
            clauseKey: "4.3-SP3",
            title: "Height of buildings",
            bodyText: "The height controls apply to Zone SP3 Tourist, business areas and some residential zone edge conditions; residential zone wording does not make this clause residential-only.",
          },
          {
            clauseKey: "4.2A",
            title: "Rural subdivision",
            bodyText: "This clause applies to rural zones RU1 and RU2 for rural subdivision only.",
          },
        ],
      },
    ]);
    instrumentFindManyMock.mockResolvedValueOnce([]);

    const result = await buildStatutoryContextBlock({
      lgaCode: "BYRON",
      query: "secondary dwelling tourist accommodation",
      siteZone: "SP3 – Tourist",
      maxDcpClauses: 3,
      maxLepClauses: 3,
    });

    expect(result.dcpClauses.map((clause) => clause.clauseNumber)).toContain("BYRON-SP3");
    expect(result.dcpClauses.map((clause) => clause.clauseNumber)).toContain("BYRON-SP3-MIXED");
    expect(result.dcpClauses.map((clause) => clause.clauseNumber)).not.toContain("BYRON-RU2-SECONDARY");
    expect(result.dcpClauses.map((clause) => clause.clauseNumber)).not.toContain("BYRON-R2-DUAL");
    expect(result.lepClauses.map((clause) => clause.clauseKey)).toContain("2.3-SP3");
    expect(result.lepClauses.map((clause) => clause.clauseKey)).toContain("4.3-SP3");
    expect(result.lepClauses.map((clause) => clause.clauseKey)).not.toContain("4.2A");
  });

});
