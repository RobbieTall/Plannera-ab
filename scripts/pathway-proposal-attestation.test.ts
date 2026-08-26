import { describe, expect, it } from "vitest";

import {
  BYRON_RURAL_ROAD_SETBACK_METRES,
  evaluateProposalAttestation,
} from "../src/lib/pathway-proposal-attestation";

const baseInput = {
  proposalPurpose: "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE" as const,
  landAreaHectares: 3.2,
  proposedBuildingFootprintSquareMetres: 96,
  existingFarmBuildingFootprintSquareMetres: 0,
  proposedBuildingHeightMetres: 4.2,
  roadSetbackMetres: 72,
  sideSetbackMetres: 24,
  otherBoundarySetbackMetres: 35,
  roadCategory: "UNRESOLVED" as const,
};

describe("protected pathway proposal attestation", () => {
  it("keeps a robust preliminary distance result evidence-gated", () => {
    const result = evaluateProposalAttestation(baseInput);

    expect(BYRON_RURAL_ROAD_SETBACK_METRES).toEqual({
      classifiedRoad: 55,
      otherRoad: 15,
    });
    expect(result.landAreaSquareMetres).toBe(25_000);
    expect(result.aggregateFarmBuildingFootprintSquareMetres).toBe(96);
    expect(result.aggregateSiteCoveragePercent).toBeCloseTo(0.32);
    expect(result.preliminaryRoadSetbackOutcome).toBe(
      "MEETS_BOTH_POSSIBLE_MINIMUMS",
    );
    expect(result.roadDistanceRobustToUnresolvedCategory).toBe(true);
    expect(result.trust).toBe("USER_ATTESTED");
    expect(result.decision).toBe("MORE_EVIDENCE_REQUIRED");
    expect(result.paidArtefactsEligible).toBe(false);
  });

  it("does not choose the lower minimum when road category is unresolved", () => {
    const result = evaluateProposalAttestation({
      ...baseInput,
      roadSetbackMetres: 20,
    });

    expect(result.preliminaryRoadSetbackOutcome).toBe(
      "MEETS_OTHER_ROAD_MINIMUM_ONLY",
    );
    expect(result.meetsOtherRoadMinimum).toBe(true);
    expect(result.meetsClassifiedRoadMinimum).toBe(false);
    expect(result.roadDistanceRobustToUnresolvedCategory).toBe(false);
    expect(result.decision).toBe("MORE_EVIDENCE_REQUIRED");
  });

  it("rejects impossible attested dimensions", () => {
    expect(() =>
      evaluateProposalAttestation({
        ...baseInput,
        landAreaHectares: 0.005,
      }),
    ).toThrow(
      "Aggregate farm-building footprint must not exceed the attested land area.",
    );

    expect(() =>
      evaluateProposalAttestation({
        ...baseInput,
        proposedBuildingHeightMetres: -1,
      }),
    ).toThrow("proposedBuildingHeightMetres must be greater than zero.");
  });
});
