export const BYRON_RURAL_SETBACK_CONTROL = {
  id: "byron-dcp-2014-d2-rural-road-setbacks.v1",
  lga: "BYRON",
  zones: ["RU1", "RU2", "RU4"] as const,
  proposalTypes: ["SHED_OUTBUILDING"] as const,
  instrument: {
    title:
      "Byron Shire Development Control Plan 2014, Chapter D2: Residential Accommodation and Ancillary Development in Rural Zones",
    chapterEffectiveOn: "2023-02-28",
    sourceUrl:
      "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-d2-residential-accommodation-and-ancillary-development-in-rural-zones-adopted-9-february-2023-effective-28-february-2023-amendments-and-ct-2022-combined-adopted-version.pdf",
    currencyRegisterTitle:
      "Byron Shire Development Control Plan 2014 Part A Preliminary",
    currencyRegisterEffectiveOn: "2025-06-06",
    currencyRegisterCheckedOn: "2026-08-25",
    currencyRegisterUrl:
      "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-part-a-preliminary-adopted-22-may-2025-effective-6-june-2025.pdf",
    section: "D2.2.1 Rural Character and Amenity",
  },
  roadFrontageMetres: {
    classifiedRoad: 55,
    otherRoad: 15,
  },
  sideAndRear: {
    numericMinimumMetres: null,
    assessment:
      "Merit assessment against Chapter D2 objectives and performance criteria, with Building Code of Australia compliance required.",
  },
} as const;

export type ByronRoadCategory =
  | "CLASSIFIED_ROAD"
  | "OTHER_ROAD"
  | "UNRESOLVED";

export type ByronRoadEvidenceBasis =
  | "TFNSW_POSITIVE_STATE_OR_REGIONAL_MATCH"
  | "BYRON_COUNCIL_EXPLICIT_OTHER_ROAD"
  | "DATASET_ABSENCE_ONLY"
  | "MISSING";

export interface ByronRoadClassificationEvidence {
  category: ByronRoadCategory;
  basis: ByronRoadEvidenceBasis;
  status: "CURRENT" | "STALE" | "ERROR";
  sourceUrl: string | null;
  sourcePublishedOn: string | null;
  checkedAt: string | null;
}

export interface ByronRuralSetbackInput {
  asOf: Date;
  roadEvidence: ByronRoadClassificationEvidence | null;
  proposedRoadSetbackMetres: number | null;
}

export type ByronRoadSetbackDecision =
  | "PROCEED"
  | "MERIT_ASSESSED"
  | "MORE_EVIDENCE_REQUIRED";

export interface ByronRuralSetbackAssessment {
  controlId: typeof BYRON_RURAL_SETBACK_CONTROL.id;
  roadSetbackDecision: ByronRoadSetbackDecision;
  confirmedRoadCategory: Exclude<ByronRoadCategory, "UNRESOLVED"> | null;
  minimumRoadSetbackMetres: number | null;
  proposedRoadSetbackMetres: number | null;
  sideAndRearDecision: "MERIT_ASSESSED";
  siteEvidenceComplete: false;
  paidEligibilityUnlocked: false;
  reasons: string[];
  provenance: typeof BYRON_RURAL_SETBACK_CONTROL.instrument;
}

const MAX_EVIDENCE_AGE_DAYS = 31;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function isHttpsUrl(value: string | null): value is string {
  if (!value) return false;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function hasCurrentEvidence(
  evidence: ByronRoadClassificationEvidence,
  asOf: Date,
): boolean {
  if (
    evidence.status !== "CURRENT" ||
    !isHttpsUrl(evidence.sourceUrl) ||
    !evidence.sourcePublishedOn ||
    !evidence.checkedAt
  ) {
    return false;
  }

  const publishedAt = Date.parse(evidence.sourcePublishedOn);
  const checkedAt = Date.parse(evidence.checkedAt);
  const asOfTime = asOf.getTime();

  if (
    !Number.isFinite(publishedAt) ||
    !Number.isFinite(checkedAt) ||
    !Number.isFinite(asOfTime) ||
    publishedAt > checkedAt ||
    checkedAt > asOfTime
  ) {
    return false;
  }

  return (
    asOfTime - checkedAt <= MAX_EVIDENCE_AGE_DAYS * MILLISECONDS_PER_DAY
  );
}

function confirmedRoadCategory(
  evidence: ByronRoadClassificationEvidence,
): Exclude<ByronRoadCategory, "UNRESOLVED"> | null {
  if (
    evidence.category === "CLASSIFIED_ROAD" &&
    evidence.basis === "TFNSW_POSITIVE_STATE_OR_REGIONAL_MATCH"
  ) {
    return "CLASSIFIED_ROAD";
  }

  if (
    evidence.category === "OTHER_ROAD" &&
    evidence.basis === "BYRON_COUNCIL_EXPLICIT_OTHER_ROAD"
  ) {
    return "OTHER_ROAD";
  }

  return null;
}

export function assessByronRuralRoadSetback(
  input: ByronRuralSetbackInput,
): ByronRuralSetbackAssessment {
  const reasons: string[] = [];
  const evidence = input.roadEvidence;
  const category =
    evidence && hasCurrentEvidence(evidence, input.asOf)
      ? confirmedRoadCategory(evidence)
      : null;

  if (!evidence) {
    reasons.push("Authoritative road-category evidence is missing.");
  } else if (!hasCurrentEvidence(evidence, input.asOf)) {
    reasons.push(
      "Road-category evidence is stale, invalid, or unavailable.",
    );
  } else if (!category) {
    reasons.push(
      "Dataset absence alone does not prove that a road is an other road.",
    );
  }

  const proposedRoadSetbackMetres =
    typeof input.proposedRoadSetbackMetres === "number" &&
    Number.isFinite(input.proposedRoadSetbackMetres) &&
    input.proposedRoadSetbackMetres >= 0
      ? input.proposedRoadSetbackMetres
      : null;

  if (proposedRoadSetbackMetres === null) {
    reasons.push("A measured proposed road setback is required.");
  }

  const minimumRoadSetbackMetres =
    category === "CLASSIFIED_ROAD"
      ? BYRON_RURAL_SETBACK_CONTROL.roadFrontageMetres.classifiedRoad
      : category === "OTHER_ROAD"
        ? BYRON_RURAL_SETBACK_CONTROL.roadFrontageMetres.otherRoad
        : null;

  let roadSetbackDecision: ByronRoadSetbackDecision =
    "MORE_EVIDENCE_REQUIRED";

  if (
    minimumRoadSetbackMetres !== null &&
    proposedRoadSetbackMetres !== null
  ) {
    if (proposedRoadSetbackMetres >= minimumRoadSetbackMetres) {
      roadSetbackDecision = "PROCEED";
      reasons.push("The proposed road setback meets the DCP minimum.");
    } else {
      roadSetbackDecision = "MERIT_ASSESSED";
      reasons.push(
        "The proposed road setback is below the DCP minimum and requires written merit justification.",
      );
    }
  }

  reasons.push(
    "Side and rear setbacks remain merit-assessed and require Building Code of Australia confirmation.",
  );

  return {
    controlId: BYRON_RURAL_SETBACK_CONTROL.id,
    roadSetbackDecision,
    confirmedRoadCategory: category,
    minimumRoadSetbackMetres,
    proposedRoadSetbackMetres,
    sideAndRearDecision: "MERIT_ASSESSED",
    siteEvidenceComplete: false,
    paidEligibilityUnlocked: false,
    reasons,
    provenance: BYRON_RURAL_SETBACK_CONTROL.instrument,
  };
}
