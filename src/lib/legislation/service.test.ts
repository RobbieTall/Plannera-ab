import { beforeEach, describe, expect, it, vi } from "vitest";

const { clauseFindManyMock } = vi.hoisted(() => ({
  clauseFindManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    clause: {
      findMany: clauseFindManyMock,
    },
  },
}));

import { searchClauses } from "./service";

describe("searchClauses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds realistic statutory clauses using tokenised planning queries", async () => {
    clauseFindManyMock.mockResolvedValue([
      {
        id: "clause-low",
        instrumentId: "instrument-1",
        clauseKey: "4.3",
        title: "Height of buildings",
        bodyText: "The height of a building on any land is not to exceed the maximum height shown on the Height of Buildings Map.",
        isCurrent: true,
        retrievedAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        instrument: {
          name: "Byron Local Environmental Plan 2014",
          instrumentType: "LEP",
        },
      },
      {
        id: "clause-hit",
        instrumentId: "instrument-1",
        clauseKey: "4.1C",
        title: "Exceptions to minimum lot sizes for dual occupancies",
        bodyText: "Development consent may be granted for a dual occupancy if the lot satisfies the applicable minimum lot size controls.",
        isCurrent: true,
        retrievedAt: new Date("2026-01-02T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        instrument: {
          name: "Byron Local Environmental Plan 2014",
          instrumentType: "LEP",
        },
      },
    ]);

    const results = await searchClauses({
      query: "What controls apply to dual occupancy in Byron Shire?",
      instrumentSlugs: ["byron-lep-2014"],
      instrumentTypes: ["LEP"],
      limit: 5,
    });

    const findManyArgs = clauseFindManyMock.mock.calls[0][0];
    expect(findManyArgs.where.OR).toEqual(
      expect.arrayContaining([
        { bodyText: { contains: "dual", mode: "insensitive" } },
        { title: { contains: "occupancy", mode: "insensitive" } },
      ]),
    );
    expect(findManyArgs.where.instrument).toEqual({
      slug: { in: ["byron-lep-2014"] },
      instrumentType: { in: ["LEP"] },
    });
    expect(results[0]).toMatchObject({ clauseId: "clause-hit", clauseKey: "4.1C" });
  });
});
