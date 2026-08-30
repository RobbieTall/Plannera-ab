export const BYRON_RURAL_ROAD_SETBACK_METRES = {
  classifiedRoad: 55,
  otherRoad: 15,
} as const;

export type ProposalAttestationTrust = "USER_ATTESTED";

export type PreliminaryRoadSetbackOutcome =
  | "MEETS_BOTH_POSSIBLE_MINIMUMS"
  | "MEETS_OTHER_ROAD_MINIMUM_ONLY"
  | "BELOW_BOTH_POSSIBLE_MINIMUMS";

export type ProposalAttestationInput = {
  proposalPurpose: "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE";
  landAreaHectares: number;
  proposedBuildingFootprintSquareMetres: number;
  existingFarmBuildingFootprintSquareMetres: number;
  proposedBuildingHeightMetres: number;
  roadSetbackMetres: number;
  sideSetbackMetres: number;
  otherBoundarySetbackMetres: number;
  roadCategory: "UNRESOLVED";
};

export type ProposalAttestationEvaluation = {
  trust: ProposalAttestationTrust;
  decision: "MORE_EVIDENCE_REQUIRED";
  paidArtefactsEligible: false;
  landAreaSquareMetres: number;
  aggregateFarmBuildingFootprintSquareMetres: number;
  aggregateSiteCoveragePercent: number;
  preliminaryRoadSetbackOutcome: PreliminaryRoadSetbackOutcome;
  meetsOtherRoadMinimum: boolean;
  meetsClassifiedRoadMinimum: boolean;
  roadDistanceRobustToUnresolvedCategory: boolean;
  requiredEvidence: readonly string[];
};

const requireFinite = (label: string, value: number): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
};

const requirePositive = (label: string, value: number): void => {
  requireFinite(label, value);
  if (value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
};

const requireNonNegative = (label: string, value: number): void => {
  requireFinite(label, value);
  if (value < 0) {
    throw new Error(`${label} must not be negative.`);
  }
};

export function evaluateProposalAttestation(
  input: ProposalAttestationInput,
): ProposalAttestationEvaluation {
  requirePositive("landAreaHectares", input.landAreaHectares);
  requirePositive(
    "proposedBuildingFootprintSquareMetres",
    input.proposedBuildingFootprintSquareMetres,
  );
  requireNonNegative(
    "existingFarmBuildingFootprintSquareMetres",
    input.existingFarmBuildingFootprintSquareMetres,
  );
  requirePositive(
    "proposedBuildingHeightMetres",
    input.proposedBuildingHeightMetres,
  );
  requireNonNegative("roadSetbackMetres", input.roadSetbackMetres);
  requireNonNegative("sideSetbackMetres", input.sideSetbackMetres);
  requireNonNegative(
    "otherBoundarySetbackMetres",
    input.otherBoundarySetbackMetres,
  );

  const landAreaSquareMetres = input.landAreaHectares * 10_000;
  const aggregateFarmBuildingFootprintSquareMetres =
    input.proposedBuildingFootprintSquareMetres +
    input.existingFarmBuildingFootprintSquareMetres;

  if (aggregateFarmBuildingFootprintSquareMetres > landAreaSquareMetres) {
    throw new Error(
      "Aggregate farm-building footprint must not exceed the attested land area.",
    );
  }

  const meetsOtherRoadMinimum =
    input.roadSetbackMetres >= BYRON_RURAL_ROAD_SETBACK_METRES.otherRoad;
  const meetsClassifiedRoadMinimum =
    input.roadSetbackMetres >=
    BYRON_RURAL_ROAD_SETBACK_METRES.classifiedRoad;

  const preliminaryRoadSetbackOutcome: PreliminaryRoadSetbackOutcome =
    meetsClassifiedRoadMinimum
      ? "MEETS_BOTH_POSSIBLE_MINIMUMS"
      : meetsOtherRoadMinimum
        ? "MEETS_OTHER_ROAD_MINIMUM_ONLY"
        : "BELOW_BOTH_POSSIBLE_MINIMUMS";

  return {
    trust: "USER_ATTESTED",
    decision: "MORE_EVIDENCE_REQUIRED",
    paidArtefactsEligible: false,
    landAreaSquareMetres,
    aggregateFarmBuildingFootprintSquareMetres,
    aggregateSiteCoveragePercent:
      (aggregateFarmBuildingFootprintSquareMetres / landAreaSquareMetres) * 100,
    preliminaryRoadSetbackOutcome,
    meetsOtherRoadMinimum,
    meetsClassifiedRoadMinimum,
    roadDistanceRobustToUnresolvedCategory:
      meetsOtherRoadMinimum && meetsClassifiedRoadMinimum,
    requiredEvidence: [
      "current cadastral survey or equivalent authoritative boundary evidence",
      "proposed building layout bound to the verified site evidence",
      "authoritative road classification",
      "verified proposal dimensions and setbacks",
      "applicable authoritative site-constraint evidence",
      "operator approval required by the paid-product trust policy",
    ],
  };
}
