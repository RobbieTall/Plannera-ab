import { createHash } from "node:crypto";

import {
  computePathwayCommercialScopeDigest,
  evaluatePathwayCommercialBinding,
  type PathwayCommercialBindingBlocker,
  type PathwayCommercialBindingEvaluation,
  type PathwayExactCommercialScope,
} from "./pathway-commercial-binding";
import type { ByronRoadClassificationEvidence } from "./pathway-byron-rural-setbacks";
import {
  assessPathwayRealSiteEvidence,
  type PathwayRealSiteEvidencePackage,
} from "./pathway-real-site-evidence";
import type {
  PathwaySiteEvidenceManifest,
  PathwaySiteEvidenceValue,
} from "./pathway-site-evidence";

export const PATHWAY_REAL_SITE_COMMERCIAL_BRIDGE_VERSION =
  "byron-ru2-shed-real-site-commercial-bridge.v1" as const;

export type PathwayRealSiteCommercialBlocker =
  | PathwayCommercialBindingBlocker
  | "REAL_SITE_EVIDENCE_REQUIRED"
  | "REAL_SITE_ROAD_SOURCE_MISMATCH"
  | "REAL_SITE_MANIFEST_SCOPE_MISMATCH"
  | "REAL_SITE_UPLOAD_SET_MISMATCH";

export type PathwayRealSiteCommercialBridgeInput = {
  manifest: PathwaySiteEvidenceManifest;
  evidencePackage: PathwayRealSiteEvidencePackage;
  roadEvidence: ByronRoadClassificationEvidence | null;
  asOf: Date;
};

export type PathwayRealSiteCommercialBridgeEvaluation = {
  bridgeVersion: typeof PATHWAY_REAL_SITE_COMMERCIAL_BRIDGE_VERSION;
  productionCheckoutEnabled: false;
  freePathwayCheckEligible: boolean;
  planningControlsPackEligible: boolean;
  submissionSeeEligible: boolean;
  blockers: PathwayRealSiteCommercialBlocker[];
  exactScope: PathwayExactCommercialScope | null;
  commercialBinding: PathwayCommercialBindingEvaluation;
  redactedEvidenceSummary: {
    status: "EVIDENCE_CONFIRMED" | "MORE_EVIDENCE_REQUIRED";
    acceptedDocumentCount: number;
    manuallyReviewedDocumentCount: number;
    containsRawSiteIdentifiers: false;
  };
};

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const canonicalValue = (value: PathwaySiteEvidenceValue) =>
  JSON.stringify(value);

const isObservationCurrent = (
  observation: PathwaySiteEvidenceManifest["observations"][number],
  assessedAt: number,
) => {
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
};

const manifestValue = (
  manifest: PathwaySiteEvidenceManifest,
  factKey:
    | "PROPOSAL_FOOTPRINT_SQM"
    | "PROPOSAL_HEIGHT_M"
    | "ROAD_CLASSIFICATION"
    | "ROAD_BOUNDARY_SETBACK_M"
    | "SIDE_REAR_SETBACK_M"
    | "EVIDENCE_UPLOAD_SET",
): PathwaySiteEvidenceValue | null => {
  const assessedAt = Date.parse(manifest.assessedAt);
  const values = new Map<string, PathwaySiteEvidenceValue>();

  for (const observation of manifest.observations) {
    if (
      observation.factKey === factKey &&
      isObservationCurrent(observation, assessedAt)
    ) {
      values.set(canonicalValue(observation.value), observation.value);
    }
  }

  return values.size === 1 ? [...values.values()][0] : null;
};

export const formatPathwaySideRearSetbacks = ({
  sideSetbackM,
  rearSetbackM,
}: {
  sideSetbackM: number;
  rearSetbackM: number;
}): string[] => [
  "REAR_SETBACK_M=" + rearSetbackM,
  "SIDE_SETBACK_M=" + sideSetbackM,
];

const roadEvidenceMatchesPackage = (
  evidencePackage: PathwayRealSiteEvidencePackage,
  roadEvidence: ByronRoadClassificationEvidence | null,
) => {
  if (!roadEvidence?.sourceUrl) return false;

  const roadDocument = evidencePackage.documents.find(
    (document) => document.role === "ROAD_CLASSIFICATION",
  );
  if (!roadDocument) return false;

  const expectedCategory = evidencePackage.roadClassification.category;
  const expectedBasis =
    expectedCategory === "CLASSIFIED_ROAD"
      ? "TFNSW_POSITIVE_STATE_OR_REGIONAL_MATCH"
      : "BYRON_COUNCIL_EXPLICIT_OTHER_ROAD";

  return (
    roadEvidence.category === expectedCategory &&
    roadEvidence.basis === expectedBasis &&
    roadEvidence.status === "CURRENT" &&
    sha256(roadEvidence.sourceUrl) ===
      evidencePackage.roadClassification.sourceReferenceHash &&
    roadDocument.sourceReferenceHash ===
      evidencePackage.roadClassification.sourceReferenceHash &&
    roadEvidence.sourcePublishedOn === roadDocument.issuedAt &&
    roadEvidence.checkedAt === roadDocument.retrievedAt
  );
};

const manifestCommercialFactsMatch = (
  manifest: PathwaySiteEvidenceManifest,
  confirmed: NonNullable<
    ReturnType<typeof assessPathwayRealSiteEvidence>["confirmedEvidence"]
  >,
) =>
  manifestValue(manifest, "PROPOSAL_FOOTPRINT_SQM") ===
    confirmed.shedFootprintSqm &&
  manifestValue(manifest, "PROPOSAL_HEIGHT_M") === confirmed.shedHeightM &&
  manifestValue(manifest, "ROAD_CLASSIFICATION") ===
    confirmed.roadCategory &&
  manifestValue(manifest, "ROAD_BOUNDARY_SETBACK_M") ===
    confirmed.roadSetbackM &&
  canonicalValue(manifestValue(manifest, "SIDE_REAR_SETBACK_M") ?? []) ===
    canonicalValue(
      formatPathwaySideRearSetbacks({
        sideSetbackM: confirmed.sideSetbackM,
        rearSetbackM: confirmed.rearSetbackM,
      }),
    );

const compositeSiteEvidenceDigest = ({
  manifestDigest,
  realSiteDigest,
}: {
  manifestDigest: string;
  realSiteDigest: string;
}) =>
  sha256(
    JSON.stringify({
      bridgeVersion: PATHWAY_REAL_SITE_COMMERCIAL_BRIDGE_VERSION,
      manifestDigest,
      realSiteDigest,
    }),
  );

export const evaluatePathwayRealSiteCommercialBridge = (
  input: PathwayRealSiteCommercialBridgeInput,
): PathwayRealSiteCommercialBridgeEvaluation => {
  const realSite = assessPathwayRealSiteEvidence(
    input.evidencePackage,
    input.asOf,
  );
  const confirmed = realSite.confirmedEvidence;
  const base = evaluatePathwayCommercialBinding({
    manifest: input.manifest,
    asOf: input.asOf,
    roadEvidence: input.roadEvidence,
    proposedRoadSetbackMetres: confirmed?.roadSetbackM ?? null,
  });
  const blockers: PathwayRealSiteCommercialBlocker[] = [...base.blockers];

  if (!confirmed) {
    blockers.push("REAL_SITE_EVIDENCE_REQUIRED");
  }

  const roadSourceMatches =
    confirmed !== null &&
    roadEvidenceMatchesPackage(input.evidencePackage, input.roadEvidence);
  if (confirmed && !roadSourceMatches) {
    blockers.push("REAL_SITE_ROAD_SOURCE_MISMATCH");
  }

  const factsMatch =
    confirmed !== null &&
    manifestCommercialFactsMatch(input.manifest, confirmed);
  if (confirmed && !factsMatch) {
    blockers.push("REAL_SITE_MANIFEST_SCOPE_MISMATCH");
  }

  const uploadSetMatches =
    confirmed !== null &&
    manifestValue(input.manifest, "EVIDENCE_UPLOAD_SET") ===
      confirmed.siteEvidenceDigest;
  if (
    confirmed &&
    base.submissionSeeEligible &&
    !uploadSetMatches
  ) {
    blockers.push("REAL_SITE_UPLOAD_SET_MISMATCH");
  }

  const planningControlsPackEligible =
    base.planningControlsPackEligible &&
    confirmed !== null &&
    roadSourceMatches &&
    factsMatch;
  const submissionSeeEligible =
    base.submissionSeeEligible &&
    planningControlsPackEligible &&
    uploadSetMatches;

  let exactScope: PathwayExactCommercialScope | null = null;
  if (planningControlsPackEligible && confirmed && base.exactScope) {
    const siteEvidenceDigest = compositeSiteEvidenceDigest({
      manifestDigest: input.manifest.siteEvidenceDigest,
      realSiteDigest: confirmed.siteEvidenceDigest,
    });
    const scopeWithoutDigest = {
      bindingVersion: base.exactScope.bindingVersion,
      siteEvidenceDigest,
      controlId: base.exactScope.controlId,
      roadCategory: base.exactScope.roadCategory,
      minimumRoadSetbackMetres:
        base.exactScope.minimumRoadSetbackMetres,
      proposedRoadSetbackMetres:
        base.exactScope.proposedRoadSetbackMetres,
      outcome: base.exactScope.outcome,
    };

    exactScope = {
      ...scopeWithoutDigest,
      scopeDigest: computePathwayCommercialScopeDigest(scopeWithoutDigest),
    };
  }

  const commercialBinding: PathwayCommercialBindingEvaluation = {
    bindingVersion: base.bindingVersion,
    productionCheckoutEnabled: false,
    freePathwayCheckEligible: base.freePathwayCheckEligible,
    planningControlsPackEligible,
    submissionSeeEligible,
    blockers: base.blockers,
    exactScope,
  };

  return {
    bridgeVersion: PATHWAY_REAL_SITE_COMMERCIAL_BRIDGE_VERSION,
    productionCheckoutEnabled: false,
    freePathwayCheckEligible: base.freePathwayCheckEligible,
    planningControlsPackEligible,
    submissionSeeEligible,
    blockers: Array.from(new Set(blockers)),
    exactScope,
    commercialBinding,
    redactedEvidenceSummary: {
      status: realSite.status,
      acceptedDocumentCount: realSite.redactedSummary.acceptedDocumentCount,
      manuallyReviewedDocumentCount:
        realSite.redactedSummary.manuallyReviewedRoles.length,
      containsRawSiteIdentifiers: false,
    },
  };
};
