import { describe, expect, it } from "vitest";

import {
  evaluatePathwayCommercialBinding,
  type PathwayCommercialBindingInput,
} from "./pathway-commercial-binding";
import type { ByronRoadClassificationEvidence } from "./pathway-byron-rural-setbacks";
import {
  BYRON_RU2_SHED_SITE_EVIDENCE_REQUIREMENTS,
  PATHWAY_SITE_EVIDENCE_MANIFEST_VERSION,
  createPathwaySiteEvidenceManifest,
  hashPathwaySiteEvidenceValue,
  type PathwayCommercialStage,
  type PathwaySiteEvidenceManifest,
  type PathwaySiteEvidenceObservation,
  type PathwaySiteFactKey,
} from "./pathway-site-evidence";

const ASSESSED_AT = "2026-08-25T00:00:00.000Z";
const STAGE_RANK: Record<PathwayCommercialStage, number> = {
  FREE_PATHWAY_CHECK: 0,
  PLANNING_CONTROLS_PACK: 1,
  SUBMISSION_SEE: 2,
};

const VALUES: Record<PathwaySiteFactKey, string | number | boolean | string[]> = {
  ADDRESS_CONFIRMED: true,
  ZONE_CONFIRMED: "RU2",
  INSTRUMENT_CURRENT: true,
  AGRICULTURAL_ANCILLARY_USE: true,
  NON_HABITABLE_DESIGN: true,
  PROPOSAL_FOOTPRINT_SQM: 120,
  PROPOSAL_HEIGHT_M: 6,
  LANDHOLDING_AREA_SQM: 40_000,
  EXISTING_FARM_BUILDING_AREA_SQM: 0,
  ROAD_CLASSIFICATION: "CLASSIFIED_ROAD",
  ROAD_BOUNDARY_SETBACK_M: 55,
  SIDE_REAR_SETBACK_M: ["side:10", "rear:10"],
  WATERBODY_SETBACK_M: 50,
  HERITAGE_STATUS: "NOT_MAPPED",
  ENVIRONMENTAL_SENSITIVITY: "CHECKED",
  MAPPED_CONSTRAINTS: ["BUSHFIRE_CHECKED", "FLOOD_CHECKED"],
  RIDGELINE_VISUAL_IMPACT: "CHECKED",
  EVIDENCE_UPLOAD_SET: ["site-plan", "title"],
  OPERATOR_REVIEW: true,
};

function manifestForStage(
  stage: PathwayCommercialStage,
  overrides: Partial<typeof VALUES> = {},
): PathwaySiteEvidenceManifest {
  const values = { ...VALUES, ...overrides };
  const observations: PathwaySiteEvidenceObservation[] = [];

  for (const requirement of BYRON_RU2_SHED_SITE_EVIDENCE_REQUIREMENTS) {
    if (STAGE_RANK[requirement.introducedAtStage] > STAGE_RANK[stage]) {
      continue;
    }

    for (const [index, sourceGroup] of requirement.sourceGroups.entries()) {
      const sourceKind = sourceGroup.anyOf[0];
      const value = values[requirement.factKey];
      observations.push({
        factKey: requirement.factKey,
        value,
        valueHash: hashPathwaySiteEvidenceValue(value),
        sourceKind,
        trustLevel: sourceGroup.minimumTrustLevel,
        sourceUrl:
          sourceKind === "ADDRESS_RESOLVER" ||
          sourceKind === "AUTHORITATIVE_SPATIAL" ||
          sourceKind === "AUTHORITATIVE_INSTRUMENT"
            ? "https://example.com/authoritative-source"
            : undefined,
        sourceReference:
          requirement.factKey + ":" + sourceKind + ":" + index,
        retrievedAt: ASSESSED_AT,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        staleAt: "2026-09-25T00:00:00.000Z",
      });
    }
  }

  return createPathwaySiteEvidenceManifest({
    manifestVersion: PATHWAY_SITE_EVIDENCE_MANIFEST_VERSION,
    lgaCode: "BYRON",
    zoneCode: "RU2",
    proposalType: "SHED_OUTBUILDING",
    assessedAt: ASSESSED_AT,
    observations,
  });
}

function roadEvidence(
  overrides: Partial<ByronRoadClassificationEvidence> = {},
): ByronRoadClassificationEvidence {
  return {
    category: "CLASSIFIED_ROAD",
    basis: "TFNSW_POSITIVE_STATE_OR_REGIONAL_MATCH",
    status: "CURRENT",
    sourceUrl:
      "https://data.nsw.gov.au/data/dataset/2-nsw-roads-network-categorisation",
    sourcePublishedOn: "2026-07-17T00:00:00.000Z",
    checkedAt: ASSESSED_AT,
    ...overrides,
  };
}

function input(
  manifest: PathwaySiteEvidenceManifest,
  overrides: Partial<PathwayCommercialBindingInput> = {},
): PathwayCommercialBindingInput {
  return {
    manifest,
    asOf: new Date(ASSESSED_AT),
    roadEvidence: roadEvidence(),
    proposedRoadSetbackMetres: 55,
    ...overrides,
  };
}

describe("evaluatePathwayCommercialBinding", () => {
  it("keeps a free-only manifest out of both paid products", () => {
    const result = evaluatePathwayCommercialBinding(
      input(manifestForStage("FREE_PATHWAY_CHECK"), {
        roadEvidence: null,
        proposedRoadSetbackMetres: null,
      }),
    );

    expect(result.freePathwayCheckEligible).toBe(true);
    expect(result.planningControlsPackEligible).toBe(false);
    expect(result.submissionSeeEligible).toBe(false);
    expect(result.exactScope).toBeNull();
    expect(result.productionCheckoutEnabled).toBe(false);
  });

  it("binds a matching evidence-verified PROCEED scope to the A$49 pack", () => {
    const result = evaluatePathwayCommercialBinding(
      input(manifestForStage("PLANNING_CONTROLS_PACK")),
    );

    expect(result.planningControlsPackEligible).toBe(true);
    expect(result.submissionSeeEligible).toBe(false);
    expect(result.exactScope?.outcome).toBe("PROCEED");
    expect(result.exactScope?.minimumRoadSetbackMetres).toBe(55);
    expect(result.exactScope?.scopeDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(result.productionCheckoutEnabled).toBe(false);
  });

  it("binds an operator-approved MERIT scope to the submission SEE", () => {
    const result = evaluatePathwayCommercialBinding(
      input(
        manifestForStage("SUBMISSION_SEE", {
          ROAD_BOUNDARY_SETBACK_M: 50,
        }),
        { proposedRoadSetbackMetres: 50 },
      ),
    );

    expect(result.planningControlsPackEligible).toBe(true);
    expect(result.submissionSeeEligible).toBe(true);
    expect(result.exactScope?.outcome).toBe("MERIT_ASSESSED");
    expect(result.productionCheckoutEnabled).toBe(false);
  });

  it("blocks a road-category mismatch against the manifest", () => {
    const result = evaluatePathwayCommercialBinding(
      input(manifestForStage("PLANNING_CONTROLS_PACK"), {
        roadEvidence: roadEvidence({
          category: "OTHER_ROAD",
          basis: "BYRON_COUNCIL_EXPLICIT_OTHER_ROAD",
        }),
      }),
    );

    expect(result.planningControlsPackEligible).toBe(false);
    expect(result.blockers).toContain("ROAD_CATEGORY_SCOPE_MISMATCH");
    expect(result.exactScope).toBeNull();
  });

  it("blocks a measured-setback mismatch against the manifest", () => {
    const result = evaluatePathwayCommercialBinding(
      input(manifestForStage("PLANNING_CONTROLS_PACK"), {
        proposedRoadSetbackMetres: 56,
      }),
    );

    expect(result.planningControlsPackEligible).toBe(false);
    expect(result.blockers).toContain("ROAD_SETBACK_SCOPE_MISMATCH");
    expect(result.exactScope).toBeNull();
  });

  it("blocks paid binding when road evidence remains unresolved", () => {
    const result = evaluatePathwayCommercialBinding(
      input(manifestForStage("PLANNING_CONTROLS_PACK"), {
        roadEvidence: roadEvidence({
          category: "OTHER_ROAD",
          basis: "DATASET_ABSENCE_ONLY",
        }),
      }),
    );

    expect(result.planningControlsPackEligible).toBe(false);
    expect(result.blockers).toContain(
      "ROAD_CONTROL_MORE_EVIDENCE_REQUIRED",
    );
    expect(result.productionCheckoutEnabled).toBe(false);
  });
});
