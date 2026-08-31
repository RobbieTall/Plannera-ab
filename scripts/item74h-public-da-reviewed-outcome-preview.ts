import {
  fetchItem74hCadastralEvidence,
  Item74hCadastralEvidenceError,
} from "../src/lib/item74h-cadastral-evidence";

const ENABLED =
  process.env.ITEM74H_PUBLIC_DA_ACCEPTANCE_ENABLED === "true";
const EXPECTED_BRANCHES = new Set([
  "integration/item74h-public-da-20260830",
  "agent/item74h-evidence-refinement-20260830",
  "agent/item74h-layout-evidence-20260831",
  "agent/item74h-setback-evidence-20260831",
  "agent/item74h-registered-plan-proof-20260901",
]);

class ReviewedEvidenceFailure extends Error {
  constructor(readonly code: string) {
    super("Item 74H reviewed public evidence failed closed");
  }
}

const reviewedOutcome = {
  version: "item74h-public-da-reviewed-outcome.v4",
  case: {
    council: "Byron Shire Council",
    daNumber: "10.2025.535.1",
    address: "870 Wilsons Creek Road, Wilsons Creek",
    lot: "Lot 11 DP 1225487",
    determination: "APPROVED",
  },
  confirmedFacts: [
    {
      fact: "PROPOSAL_USE",
      value: "new farm machinery shed",
      recordNumber: "E2026/60560",
      pageRef: "determination",
    },
    {
      fact: "SHED_FOOTPRINT_SQM",
      value: 200,
      recordNumber: "E2026/59935",
      pageRef: "page-9",
    },
    {
      fact: "SHED_HEIGHT_M",
      value: 5.996,
      recordNumber: "E2026/59935",
      pageRef: "page-9",
    },
    {
      fact: "LOT_AREA_HA",
      value: 39.47,
      recordNumber: "E2025/131546",
      pageRef: "page-1",
    },
    {
      fact: "OFFICIAL_CADASTRAL_PLAN_AREA_HA",
      value: 38.8312589,
      recordNumber: "NSW_CADASTRE_WFS",
      pageRef: "current Lot_M feature checked 2026-09-01",
      sourceUrl:
        "https://portal.spatial.nsw.gov.au/server/rest/services/Cadastre_History/FeatureServer/3",
      qualifier:
        "Current NSW Digital Cadastral Database plan area; it does not replace the registered plan image or prove shed setbacks.",
    },
    {
      fact: "ROAD_AUTHORITY",
      value: "Byron Shire Council for the section 138 works",
      recordNumber: "E2025/131541",
      pageRef: "page-2",
    },
    {
      fact: "ROAD_CLASSIFICATION",
      value: "OTHER_ROAD",
      recordNumber: "TFNSW_CLASSIFIED_AND_REGIONAL_ROADS",
      pageRef: "complete schedule and current categorisation dataset checked 2026-08-30",
      sourceUrl:
        "https://www.transport.nsw.gov.au/system/files/media/documents/2023/classified-roads-schedule-1.pdf",
    },
    {
      fact: "INDICATIVE_SHED_TO_FENCE_DISTANCE_M",
      value: 11.693,
      recordNumber: "E2026/59935",
      pageRef: "page-1",
      qualifier:
        "Indicative only: the plan marks the site boundary as approximate and does not classify this dimension as a road, side or rear setback.",
    },
  ],
  missingEvidence: [
    {
      requirement: "REGISTERED_CADASTRAL_SURVEY",
      reason:
        "The detail survey says its boundaries were compiled from DCDB, disclaims being a Survey under the Surveying Act 2002, and does not identify a registered surveyor; stamped-plan page 1 also labels the site boundary as approximate.",
    },
    {
      requirement: "LOT_AREA_RECONCILIATION",
      reason:
        "The Council-hosted detail survey states 39.47 hectares while the current official NSW cadastral feature records 38.8312589 hectares; the registered plan must resolve the difference before a paid output treats a land-area value as submission-grade.",
    },
    {
      requirement: "ROAD_SETBACK_M",
      reason:
        "Stamped-plan page 1 shows an indicative 11.693 metre shed-to-fence dimension, but the approximate boundary is not identified as the road boundary.",
    },
    {
      requirement: "SIDE_SETBACK_M",
      reason:
        "Stamped-plan page 1 shows an indicative 11.693 metre shed-to-fence dimension, but the approximate boundary is not identified as a side boundary.",
    },
    {
      requirement: "REAR_SETBACK_M",
      reason:
        "Stamped-plan page 1 shows an indicative 11.693 metre shed-to-fence dimension, but the approximate boundary is not identified as a rear boundary.",
    },
  ],
  decision: "MORE_EVIDENCE_REQUIRED",
  commercialAccess: {
    freePathwayCheckAvailable: true,
    planningControlsPack49Eligible: false,
    submissionSee749Eligible: false,
  },
  operatorDecisionRecorded: true,
  evidencePromotionPerformed: false,
  persistenceMutationPerformed: false,
  productionMutationPerformed: false,
  productionCheckoutEnabled: false,
} as const;

const main = async () => {
  if (!ENABLED) {
    console.log(
      JSON.stringify({
        gate: "item74h-public-da-reviewed-outcome",
        status: "SKIPPED_FEATURE_DISABLED",
        productionCheckoutEnabled: false,
      }),
    );
    return;
  }

  if (
    process.env.VERCEL_ENV !== "preview" ||
    !EXPECTED_BRANCHES.has(process.env.VERCEL_GIT_COMMIT_REF ?? "") ||
    process.env.PLANNING_PACK_CHECKOUT_ENABLED === "true" ||
    process.env.SUBMISSION_SEE_CHECKOUT_ENABLED === "true"
  ) {
    throw new ReviewedEvidenceFailure("PREVIEW_SAFETY_BOUNDARY_REJECTED");
  }

  const cadastralEvidence = await fetchItem74hCadastralEvidence();
  if (
    Math.abs(cadastralEvidence.planAreaHectares - 38.8312589) > 0.0000001 ||
    cadastralEvidence.areaDifferenceHectares <= 0.63 ||
    cadastralEvidence.areaDifferencePercent <= 1.6
  ) {
    throw new ReviewedEvidenceFailure("CADASTRAL_AREA_RECONCILIATION_REJECTED");
  }

  if (
    reviewedOutcome.decision !== "MORE_EVIDENCE_REQUIRED" ||
    !reviewedOutcome.commercialAccess.freePathwayCheckAvailable ||
    reviewedOutcome.commercialAccess.planningControlsPack49Eligible ||
    reviewedOutcome.commercialAccess.submissionSee749Eligible ||
    reviewedOutcome.missingEvidence.length !== 5 ||
    !reviewedOutcome.confirmedFacts.some(
      ({ fact, value }) => fact === "SHED_HEIGHT_M" && value === 5.996,
    ) ||
    !reviewedOutcome.confirmedFacts.some(
      ({ fact, value }) =>
        fact === "ROAD_CLASSIFICATION" && value === "OTHER_ROAD",
    ) ||
    !reviewedOutcome.confirmedFacts.some(
      ({ fact, value }) =>
        fact === "OFFICIAL_CADASTRAL_PLAN_AREA_HA" &&
        value === cadastralEvidence.planAreaHectares,
    ) ||
    !reviewedOutcome.confirmedFacts.some(
      ({ fact, value, recordNumber, pageRef }) =>
        fact === "INDICATIVE_SHED_TO_FENCE_DISTANCE_M" &&
        value === 11.693 &&
        recordNumber === "E2026/59935" &&
        pageRef === "page-1",
    ) ||
    reviewedOutcome.evidencePromotionPerformed ||
    reviewedOutcome.persistenceMutationPerformed ||
    reviewedOutcome.productionMutationPerformed ||
    reviewedOutcome.productionCheckoutEnabled
  ) {
    throw new ReviewedEvidenceFailure("REVIEWED_OUTCOME_CONTRACT_REJECTED");
  }

  console.log(
    JSON.stringify({
      gate: "item74h-public-da-reviewed-outcome",
      status: "PASS",
      environment: "preview",
      version: reviewedOutcome.version,
      daNumber: reviewedOutcome.case.daNumber,
      decision: reviewedOutcome.decision,
      confirmedFactCount: reviewedOutcome.confirmedFacts.length,
      missingEvidence: reviewedOutcome.missingEvidence.map(
        ({ requirement }) => requirement,
      ),
      authoritativeCadastralParcelConfirmed: true,
      cadastralPlanAreaHectares: cadastralEvidence.planAreaHectares,
      detailSurveyAreaHectares: cadastralEvidence.detailSurveyAreaHectares,
      lotAreaReconciliationRequired: true,
      rawParcelGeometryRetained: false,
      rawParcelIdentifierRetained: false,
      ...reviewedOutcome.commercialAccess,
      operatorDecisionRecorded: reviewedOutcome.operatorDecisionRecorded,
      evidencePromotionPerformed: reviewedOutcome.evidencePromotionPerformed,
      persistenceMutationPerformed: reviewedOutcome.persistenceMutationPerformed,
      productionMutationPerformed: reviewedOutcome.productionMutationPerformed,
      productionCheckoutEnabled: reviewedOutcome.productionCheckoutEnabled,
      containsSecret: false,
      containsDownloadCapability: false,
      containsContentHash: false,
      containsFullDocument: false,
    }),
  );
};

void main().catch((error) => {
  console.error(
    JSON.stringify({
      gate: "item74h-public-da-reviewed-outcome",
      status: "FAIL_CLOSED",
      errorCode:
        error instanceof ReviewedEvidenceFailure ||
        error instanceof Item74hCadastralEvidenceError
          ? error.code
          : "UNCLASSIFIED",
      productionMutationPerformed: false,
      productionCheckoutEnabled: false,
      containsSecret: false,
      containsDownloadCapability: false,
      containsContentHash: false,
      containsFullDocument: false,
      containsRawParcelGeometry: false,
      containsRawParcelIdentifier: false,
    }),
  );
  process.exitCode = 1;
});
