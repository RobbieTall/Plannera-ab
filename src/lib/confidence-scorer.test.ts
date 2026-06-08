import { describe, expect, it } from "vitest";

import { parseConfidenceFromMessage } from "./confidence-scorer";

describe("parseConfidenceFromMessage", () => {
  it("returns the base score when no confidence signals are present", () => {
    expect(parseConfidenceFromMessage("This response has plain planning context.")).toEqual({
      score: 0.5,
      breakdown: { citedClauses: 0, hedgingPhrases: 0, unresolvedGaps: 0 },
    });
  });

  it("counts cited clause and section references and applies the cited bonus", () => {
    expect(parseConfidenceFromMessage("Clause 3.2 applies alongside cl. 5 for landscaping.")).toEqual({
      score: 0.6,
      breakdown: { citedClauses: 2, hedgingPhrases: 0, unresolvedGaps: 0 },
    });
  });

  it("counts hedging phrases and applies the hedging penalty", () => {
    expect(parseConfidenceFromMessage("The consent authority may typically accept this, but the control is unclear.")).toEqual({
      score: 0.35,
      breakdown: { citedClauses: 0, hedgingPhrases: 3, unresolvedGaps: 0 },
    });
  });

  it("counts unresolved gap phrases and applies the gap penalty", () => {
    expect(parseConfidenceFromMessage("There is no data found for the site and I am unable to confirm the DCP control.")).toEqual({
      score: 0.3,
      breakdown: { citedClauses: 0, hedgingPhrases: 0, unresolvedGaps: 2 },
    });
  });

  it("combines mixed signals using the scoring formula", () => {
    expect(
      parseConfidenceFromMessage(
        "Section 4.1 and s. 5.3 may apply, but the setback is unclear and no DCP clause was found and the rear setback was not found.",
      ),
    ).toEqual({
      score: 0.3,
      breakdown: { citedClauses: 2, hedgingPhrases: 2, unresolvedGaps: 2 },
    });
  });

  it("caps positive cited-clause contribution so extreme citations remain within the 1.0 clamp", () => {
    const result = parseConfidenceFromMessage(
      "cl. 1 cl. 2 cl. 3 cl. 4 cl. 5 cl. 6 cl. 7 cl. 8 cl. 9 cl. 10 cl. 11 cl. 12",
    );

    expect(result.score).toBe(0.8);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.breakdown.citedClauses).toBe(12);
  });

  it("clamps the score at 0.0 for extreme unresolved and hedged content", () => {
    const result = parseConfidenceFromMessage(
      "may might generally typically unclear seek advice not available no DCP clause unable to confirm no data could not find not found",
    );

    expect(result.score).toBe(0);
    expect(result.breakdown.hedgingPhrases).toBe(6);
    expect(result.breakdown.unresolvedGaps).toBe(6);
  });
});
