import { describe, expect, it } from "vitest";

import { buildSourceAttribution } from "@/lib/workspace-chat";
import type { ClauseSummary } from "@/lib/legislation";

const makeClause = (overrides: Partial<ClauseSummary> = {}): ClauseSummary => ({
  instrumentId: "instrument-1",
  instrumentName: "Byron LEP 2014",
  instrumentType: "LEP" as ClauseSummary["instrumentType"],
  clauseId: "clause-1",
  clauseKey: "cl.4.1C",
  title: "Minimum lot sizes for dual occupancies",
  snippet: "Dual occupancy minimum lot size controls apply to land in the Byron Shire.",
  isCurrent: true,
  currentAsAt: null,
  ...overrides,
});

describe("buildSourceAttribution", () => {
  it("returns cited confidence from statutory clauses when coverage is searchable", () => {
    const attribution = buildSourceAttribution({
      clauses: [makeClause()],
      coverageState: "SEARCHABLE_READY",
      modelWasCalled: true,
    });

    expect(attribution.confidence).toBe("cited");
    expect(attribution.coverageState).toBe("SEARCHABLE_READY");
    expect(attribution.sources).toEqual([
      expect.objectContaining({
        ref: "Byron LEP 2014 cl.4.1C",
        type: "LEP",
        title: "Minimum lot sizes for dual occupancies",
      }),
    ]);
  });

  it("returns cited confidence from DCP clause excerpts", () => {
    const attribution = buildSourceAttribution({
      dcpClauses: [
        {
          ref: "Byron DCP 2014 §D1.2",
          title: "Dual occupancy setbacks",
          headingPath: ["Chapter D1", "Dual occupancy setbacks"],
          bodyText: "The front setback requirement is stated in the DCP excerpt.",
        },
      ],
      coverageState: "PROCESSING",
      modelWasCalled: true,
    });

    expect(attribution.confidence).toBe("cited");
    expect(attribution.sources).toEqual([
      expect.objectContaining({
        ref: "Byron DCP 2014 §D1.2",
        type: "DCP",
        title: "Dual occupancy setbacks",
      }),
    ]);
  });

  it("returns inferred confidence when the model answered without retrieved statutory or DCP grounding", () => {
    const attribution = buildSourceAttribution({
      clauses: [],
      dcpClauses: [],
      dcpChunks: [],
      coverageState: "NOT_STARTED",
      modelWasCalled: true,
    });

    expect(attribution.confidence).toBe("inferred");
    expect(attribution.sources).toEqual([
      {
        ref: "AI reasoning",
        type: "model",
        title: "Model-generated — not from a retrieved statutory source",
      },
    ]);
  });

  it("returns unresolved confidence for forced fallback coverage-gap replies", () => {
    const attribution = buildSourceAttribution({
      clauses: [makeClause()],
      coverageState: "QUEUED",
      coverageNotice: "Coverage notice for Byron: local DCP controls are being prepared.",
      forcedFallbackReply: "I can’t confirm local numeric controls yet.",
      modelWasCalled: false,
    });

    expect(attribution).toEqual({
      confidence: "unresolved",
      sources: [],
      coverageState: "QUEUED",
      coverageNotice: "Coverage notice for Byron: local DCP controls are being prepared.",
    });
  });
});
