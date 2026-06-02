import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchClausesMock } = vi.hoisted(() => ({
  searchClausesMock: vi.fn(),
}));

vi.mock("@/lib/legislation", () => ({
  searchClauses: searchClausesMock,
  serializeClauseSummary: (clause: { currentAsAt: Date } & Record<string, unknown>) => ({
    ...clause,
    currentAsAt: clause.currentAsAt.toISOString(),
  }),
}));

import { POST } from "./route";

describe("POST /api/legislation/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns statutory clause results when clauses exist", async () => {
    searchClausesMock.mockResolvedValue([
      {
        instrumentId: "instrument-1",
        instrumentName: "State Environmental Planning Policy (Housing) 2021",
        instrumentType: "SEPP",
        clauseId: "clause-1",
        clauseKey: "Part 2 Division 1",
        title: "Dual occupancies",
        snippet: "Dual occupancy development may be carried out with consent if the relevant standards are met.",
        isCurrent: true,
        currentAsAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/legislation/search", {
        method: "POST",
        body: JSON.stringify({
          query: "dual occupancy setbacks",
          instrumentSlugs: ["sepp-housing-2021"],
          instrumentTypes: ["SEPP"],
        }),
      }),
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(searchClausesMock).toHaveBeenCalledWith({
      query: "dual occupancy setbacks",
      instrumentSlugs: ["sepp-housing-2021"],
      instrumentTypes: ["SEPP"],
    });
    expect(payload.clauses).toHaveLength(1);
    expect(payload.clauses[0].title).toBe("Dual occupancies");
  });
});
