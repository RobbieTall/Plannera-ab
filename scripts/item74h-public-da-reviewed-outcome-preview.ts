export {};

const ENABLED =
  process.env.ITEM74H_PUBLIC_DA_ACCEPTANCE_ENABLED === "true";
const EXPECTED_BRANCHES = new Set([
  "integration/item74h-public-da-20260830",
  "agent/item74h-evidence-refinement-20260830",
]);

class ReviewedEvidenceFailure extends Error {
  constructor(readonly code: string) {
    super("Item 74H reviewed public evidence failed closed");
  }
}

const reviewedOutcome = {
  version: "item74h-public-da-reviewed-outcome.v2",
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
  ],
  missingEvidence: [
    {
      requirement: "REGISTERED_CADASTRAL_SURVEY",
      reason:
        "The detail survey says its boundaries were compiled from DCDB, disclaims being a Survey under the Surveying Act 2002, and does not identify a registered surveyor.",
    },
    {
      requirement: "ROAD_SETBACK_M",
      reason:
        "No unambiguous shed-to-road measurement was found on the reviewed pages.",
    },
    {
      requirement: "SIDE_SETBACK_M",
      reason:
        "No unambiguous shed-to-side-boundary measurement was found on the reviewed pages.",
    },
    {
      requirement: "REAR_SETBACK_M",
      reason:
        "No unambiguous shed-to-rear-boundary measurement was found on the reviewed pages.",
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

const main = () => {
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

  if (
    reviewedOutcome.decision !== "MORE_EVIDENCE_REQUIRED" ||
    !reviewedOutcome.commercialAccess.freePathwayCheckAvailable ||
    reviewedOutcome.commercialAccess.planningControlsPack49Eligible ||
    reviewedOutcome.commercialAccess.submissionSee749Eligible ||
    reviewedOutcome.missingEvidence.length !== 4 ||
    !reviewedOutcome.confirmedFacts.some(
      ({ fact, value }) => fact === "SHED_HEIGHT_M" && value === 5.996,
    ) ||
    !reviewedOutcome.confirmedFacts.some(
      ({ fact, value }) =>
        fact === "ROAD_CLASSIFICATION" && value === "OTHER_ROAD",
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

try {
  main();
} catch (error) {
  console.error(
    JSON.stringify({
      gate: "item74h-public-da-reviewed-outcome",
      status: "FAIL_CLOSED",
      errorCode:
        error instanceof ReviewedEvidenceFailure
          ? error.code
          : "UNCLASSIFIED",
      productionMutationPerformed: false,
      productionCheckoutEnabled: false,
      containsSecret: false,
      containsDownloadCapability: false,
      containsContentHash: false,
      containsFullDocument: false,
    }),
  );
  process.exitCode = 1;
}
