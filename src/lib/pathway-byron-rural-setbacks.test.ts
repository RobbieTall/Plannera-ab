import { describe, expect, it } from "vitest";

import {
  assessByronRuralRoadSetback,
  type ByronRoadClassificationEvidence,
} from "./pathway-byron-rural-setbacks";

const asOf = new Date("2026-08-25T00:00:00.000Z");

function evidence(
  overrides: Partial<ByronRoadClassificationEvidence> = {},
): ByronRoadClassificationEvidence {
  return {
    category: "CLASSIFIED_ROAD",
    basis: "TFNSW_POSITIVE_STATE_OR_REGIONAL_MATCH",
    status: "CURRENT",
    sourceUrl:
      "https://data.nsw.gov.au/data/dataset/2-nsw-roads-network-categorisation",
    sourcePublishedOn: "2026-07-17T00:00:00.000Z",
    checkedAt: "2026-08-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("assessByronRuralRoadSetback", () => {
  it("applies the 55 metre minimum to a positively matched classified road", () => {
    const result = assessByronRuralRoadSetback({
      asOf,
      roadEvidence: evidence(),
      proposedRoadSetbackMetres: 55,
    });

    expect(result.roadSetbackDecision).toBe("PROCEED");
    expect(result.minimumRoadSetbackMetres).toBe(55);
    expect(result.confirmedRoadCategory).toBe("CLASSIFIED_ROAD");
    expect(result.paidEligibilityUnlocked).toBe(false);
  });

  it("requires merit assessment below the classified-road minimum", () => {
    const result = assessByronRuralRoadSetback({
      asOf,
      roadEvidence: evidence(),
      proposedRoadSetbackMetres: 54.9,
    });

    expect(result.roadSetbackDecision).toBe("MERIT_ASSESSED");
    expect(result.paidEligibilityUnlocked).toBe(false);
  });

  it("applies the 15 metre minimum only when Council explicitly confirms other road", () => {
    const result = assessByronRuralRoadSetback({
      asOf,
      roadEvidence: evidence({
        category: "OTHER_ROAD",
        basis: "BYRON_COUNCIL_EXPLICIT_OTHER_ROAD",
        sourceUrl:
          "https://www.byron.nsw.gov.au/Council/Plans-Strategies/Roads-Infrastructure",
      }),
      proposedRoadSetbackMetres: 15,
    });

    expect(result.roadSetbackDecision).toBe("PROCEED");
    expect(result.minimumRoadSetbackMetres).toBe(15);
    expect(result.confirmedRoadCategory).toBe("OTHER_ROAD");
  });

  it("does not infer other road from absence in the State and Regional dataset", () => {
    const result = assessByronRuralRoadSetback({
      asOf,
      roadEvidence: evidence({
        category: "OTHER_ROAD",
        basis: "DATASET_ABSENCE_ONLY",
      }),
      proposedRoadSetbackMetres: 20,
    });

    expect(result.roadSetbackDecision).toBe("MORE_EVIDENCE_REQUIRED");
    expect(result.minimumRoadSetbackMetres).toBeNull();
    expect(result.confirmedRoadCategory).toBeNull();
  });

  it("fails closed for stale evidence", () => {
    const result = assessByronRuralRoadSetback({
      asOf,
      roadEvidence: evidence({
        status: "STALE",
        checkedAt: "2026-06-01T00:00:00.000Z",
      }),
      proposedRoadSetbackMetres: 60,
    });

    expect(result.roadSetbackDecision).toBe("MORE_EVIDENCE_REQUIRED");
    expect(result.paidEligibilityUnlocked).toBe(false);
  });

  it("requires a measured proposed setback", () => {
    const result = assessByronRuralRoadSetback({
      asOf,
      roadEvidence: evidence(),
      proposedRoadSetbackMetres: null,
    });

    expect(result.roadSetbackDecision).toBe("MORE_EVIDENCE_REQUIRED");
    expect(result.proposedRoadSetbackMetres).toBeNull();
  });

  it("keeps side and rear setbacks merit-assessed in every result", () => {
    const result = assessByronRuralRoadSetback({
      asOf,
      roadEvidence: null,
      proposedRoadSetbackMetres: null,
    });

    expect(result.sideAndRearDecision).toBe("MERIT_ASSESSED");
    expect(result.siteEvidenceComplete).toBe(false);
    expect(result.paidEligibilityUnlocked).toBe(false);
  });
});
