import { createHash } from "node:crypto";

import {
  assessByronRuralRoadSetback,
  type ByronRoadClassificationEvidence,
  type ByronRoadSetbackDecision,
} from "./pathway-byron-rural-setbacks";
import {
  evaluatePathwaySiteEvidence,
  type PathwaySiteEvidenceManifest,
  type PathwaySiteEvidenceValue,
} from "./pathway-site-evidence";

export const PATHWAY_COMMERCIAL_BINDING_VERSION =
  "byron-ru2-shed-commercial-binding.v1" as const;

export type PathwayCommercialBindingBlocker =
  | "FREE_SITE_EVIDENCE_INCOMPLETE"
  | "PACK_SITE_EVIDENCE_INCOMPLETE"
  | "SEE_SITE_EVIDENCE_INCOMPLETE"
  | "ROAD_CONTROL_MORE_EVIDENCE_REQUIRED"
  | "ROAD_CATEGORY_SCOPE_MISMATCH"
  | "ROAD_SETBACK_SCOPE_MISMATCH";

export interface PathwayCommercialBindingInput {
  manifest: PathwaySiteEvidenceManifest;
  asOf: Date;
  roadEvidence: ByronRoadClassificationEvidence | null;
  proposedRoadSetbackMetres: number | null;
}

export interface PathwayExactCommercialScope {
  bindingVersion: typeof PATHWAY_COMMERCIAL_BINDING_VERSION;
  scopeDigest: string;
  siteEvidenceDigest: string;
  controlId: string;
  roadCategory: "CLASSIFIED_ROAD" | "OTHER_ROAD";
  minimumRoadSetbackMetres: number;
  proposedRoadSetbackMetres: number;
  outcome: Exclude<ByronRoadSetbackDecision, "MORE_EVIDENCE_REQUIRED">;
}

export interface PathwayCommercialBindingEvaluation {
  bindingVersion: typeof PATHWAY_COMMERCIAL_BINDING_VERSION;
  productionCheckoutEnabled: false;
  freePathwayCheckEligible: boolean;
  planningControlsPackEligible: boolean;
  submissionSeeEligible: boolean;
  blockers: PathwayCommercialBindingBlocker[];
  exactScope: PathwayExactCommercialScope | null;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isObservationCurrent(
  observation: PathwaySiteEvidenceManifest["observations"][number],
  assessedAt: number,
): boolean {
  if (
    observation.effectiveFrom &&
    Date.parse(observation.effectiveFrom) > assessedAt
  ) {
    return false;
  }
  if (
    observation.effectiveTo &&
    Date.parse(observation.effectiveTo) < assessedAt
  ) {
    return false;
  }
  if (observation.staleAt && Date.parse(observation.staleAt) <= assessedAt) {
    return false;
  }
  return true;
}

function boundValue(
  manifest: PathwaySiteEvidenceManifest,
  factKey: "ROAD_CLASSIFICATION" | "ROAD_BOUNDARY_SETBACK_M",
): PathwaySiteEvidenceValue | null {
  const assessedAt = Date.parse(manifest.assessedAt);
  const observations = manifest.observations.filter(
    (observation) =>
      observation.factKey === factKey &&
      isObservationCurrent(observation, assessedAt),
  );
  const values = new Map(
    observations.map((observation) => [
      JSON.stringify(observation.value),
      observation.value,
    ]),
  );

  return values.size === 1 ? [...values.values()][0] : null;
}

export function evaluatePathwayCommercialBinding(
  input: PathwayCommercialBindingInput,
): PathwayCommercialBindingEvaluation {
  const siteEvidence = evaluatePathwaySiteEvidence(input.manifest);
  const roadSetback = assessByronRuralRoadSetback({
    asOf: input.asOf,
    roadEvidence: input.roadEvidence,
    proposedRoadSetbackMetres: input.proposedRoadSetbackMetres,
  });
  const blockers: PathwayCommercialBindingBlocker[] = [];

  if (!siteEvidence.stages.FREE_PATHWAY_CHECK.eligible) {
    blockers.push("FREE_SITE_EVIDENCE_INCOMPLETE");
  }
  if (!siteEvidence.stages.PLANNING_CONTROLS_PACK.eligible) {
    blockers.push("PACK_SITE_EVIDENCE_INCOMPLETE");
  }
  if (!siteEvidence.stages.SUBMISSION_SEE.eligible) {
    blockers.push("SEE_SITE_EVIDENCE_INCOMPLETE");
  }
  if (roadSetback.roadSetbackDecision === "MORE_EVIDENCE_REQUIRED") {
    blockers.push("ROAD_CONTROL_MORE_EVIDENCE_REQUIRED");
  }

  const manifestRoadCategory = boundValue(
    input.manifest,
    "ROAD_CLASSIFICATION",
  );
  if (
    roadSetback.confirmedRoadCategory &&
    manifestRoadCategory !== roadSetback.confirmedRoadCategory
  ) {
    blockers.push("ROAD_CATEGORY_SCOPE_MISMATCH");
  }

  const manifestRoadSetback = boundValue(
    input.manifest,
    "ROAD_BOUNDARY_SETBACK_M",
  );
  if (
    roadSetback.proposedRoadSetbackMetres !== null &&
    manifestRoadSetback !== roadSetback.proposedRoadSetbackMetres
  ) {
    blockers.push("ROAD_SETBACK_SCOPE_MISMATCH");
  }

  const roadScopeReady =
    roadSetback.roadSetbackDecision !== "MORE_EVIDENCE_REQUIRED" &&
    roadSetback.confirmedRoadCategory !== null &&
    roadSetback.minimumRoadSetbackMetres !== null &&
    roadSetback.proposedRoadSetbackMetres !== null &&
    !blockers.includes("ROAD_CATEGORY_SCOPE_MISMATCH") &&
    !blockers.includes("ROAD_SETBACK_SCOPE_MISMATCH");

  const planningControlsPackEligible =
    siteEvidence.stages.PLANNING_CONTROLS_PACK.eligible && roadScopeReady;
  const submissionSeeEligible =
    siteEvidence.stages.SUBMISSION_SEE.eligible &&
    planningControlsPackEligible;

  const exactScope: PathwayExactCommercialScope | null = roadScopeReady
    ? {
        bindingVersion: PATHWAY_COMMERCIAL_BINDING_VERSION,
        scopeDigest: sha256(
          JSON.stringify({
            bindingVersion: PATHWAY_COMMERCIAL_BINDING_VERSION,
            siteEvidenceDigest: input.manifest.siteEvidenceDigest,
            controlId: roadSetback.controlId,
            roadCategory: roadSetback.confirmedRoadCategory,
            minimumRoadSetbackMetres:
              roadSetback.minimumRoadSetbackMetres,
            proposedRoadSetbackMetres:
              roadSetback.proposedRoadSetbackMetres,
            outcome: roadSetback.roadSetbackDecision,
          }),
        ),
        siteEvidenceDigest: input.manifest.siteEvidenceDigest,
        controlId: roadSetback.controlId,
        roadCategory: roadSetback.confirmedRoadCategory,
        minimumRoadSetbackMetres: roadSetback.minimumRoadSetbackMetres,
        proposedRoadSetbackMetres: roadSetback.proposedRoadSetbackMetres,
        outcome: roadSetback.roadSetbackDecision,
      }
    : null;

  return {
    bindingVersion: PATHWAY_COMMERCIAL_BINDING_VERSION,
    productionCheckoutEnabled: false,
    freePathwayCheckEligible:
      siteEvidence.stages.FREE_PATHWAY_CHECK.eligible,
    planningControlsPackEligible,
    submissionSeeEligible,
    blockers,
    exactScope,
  };
}
