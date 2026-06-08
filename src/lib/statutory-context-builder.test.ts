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
});
