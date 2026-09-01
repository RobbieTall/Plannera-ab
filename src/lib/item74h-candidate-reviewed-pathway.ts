import { createHash } from "node:crypto";

import {
  ITEM74H_CANDIDATE_ZONE_BOUNDARY_EVIDENCE,
  item74hCandidateZoneDecision,
  verifyItem74hCandidateZoneBoundaryEvidence,
} from "./item74h-candidate-zone-boundary-evidence";
import { buildPathwayCommercialPresentation } from "./pathway-commercial-presentation";
import {
  createPathwayProgressiveCommercialBinding,
  evaluateWorkingPathwayArtefactPolicy,
  verifyPathwayProgressiveCommercialBinding,
} from "./pathway-progressive-commercial-binding";

export const ITEM74H_CANDIDATE_REVIEWED_PATHWAY_VERSION =
  "item74h-candidate-reviewed-pathway.v2" as const;
export const ITEM74H_CANDIDATE_SCOPE_KEY =
  "byron:lot-138-dp1265934:storage-shed:da-10.2026.223.1" as const;

export type CandidateGateDecision =
  | "STOP"
  | "PROCEED"
  | "MERIT"
  | "MORE_EVIDENCE";

export type CandidateDecisionBranch = {
  condition: string;
  decision: CandidateGateDecision;
};

export type CandidateDecisionGate = {
  gate: string;
  question: string;
  evidence: string[];
  outcome: CandidateGateDecision;
  reason: string;
  branches: CandidateDecisionBranch[];
};

const CONFIRMED_CONTROL_KEYS = [
  "BYRON_LEP_2014_PCO_2014_297",
  "PARCEL_INTERIOR_ZONE_R2",
  "C2_BOUNDARY_TOUCH_EXCLUDED_FROM_ZONE_MEMBERSHIP",
  "BYRON_DCP_2014_CURRENT_SOURCE",
  "DA_PATHWAY_APPROVED_10_2026_223_1",
  "APPROVED_PLAN_SHED_AREA_24_SQM",
  "APPROVED_PLAN_SOUTHERN_BOUNDARY_DIMENSION_1_625_M",
] as const;

const OUTSTANDING_EVIDENCE = [
  "REGISTERED_BOUNDARY_OR_SET_OUT_CONFIRMATION",
  "STAMPED_PLAN_PAGE_2_HEIGHT_AND_ELEVATIONS",
  "DETERMINATION_CONDITIONS_OPERATOR_REVIEW",
  "CURRENT_LEP_DCP_CONTROL_REVALIDATION_AT_FINAL_GENERATION",
] as const;

export const ITEM74H_CANDIDATE_REVIEWED_EVIDENCE = {
  version: ITEM74H_CANDIDATE_REVIEWED_PATHWAY_VERSION,
  reviewedAt: "2026-09-01",
  environment: "PREVIEW",
  site: {
    address: "33 Lorikeet Lane, Mullumbimby NSW 2482",
    lga: "Byron",
    lot: 138,
    depositedPlan: "DP1265934",
    cadastre: {
      cadid: 180752773,
      planoid: 3829161,
      authoritativeAreaSquareMetres: 2331.671,
      approvedPlanAreaSquareMetres: 2333,
      areaDifferenceSquareMetres: 1.329,
    },
    planning: {
      lep: "Byron Local Environmental Plan 2014",
      lepPco: "2014-297",
      parcelInteriorZones: ["R2"],
      boundaryAdjacentZones: ["C2"],
      zoneRelationship: "C2_BOUNDARY_TOUCH_NO_INTERIOR_OVERLAP",
      zoneCurrencyDate: "2026-08-21",
      dcp: "Byron Development Control Plan 2014",
    },
  },
  proposal: {
    description: "Storage shed",
    councilApplication: "10.2026.223.1",
    councilStatus: "APPROVED",
    councilDeterminationDate: "2026-07-14",
    approvedPlanAreaSquareMetres: 24,
    approvedPlanSouthernBoundaryDimensionMetres: 1.625,
    proposalZone: "R2",
    proposalZoneConfirmed: true,
    heightMetres: null,
  },
  zoneBoundaryEvidence: ITEM74H_CANDIDATE_ZONE_BOUNDARY_EVIDENCE,
  sourceDocuments: [
    {
      record: "E2026/47502",
      role: "STAMPED_PLANS",
      review: "PAGE_1_OPERATOR_REVIEWED",
      evidence:
        "Council approval stamp, case linkage, 24 sqm shed footprint and 1.625 m southern boundary dimension",
    },
    {
      record: "E2026/47506",
      role: "SITE_PLAN",
      review: "PAGE_1_OPERATOR_REVIEWED",
      evidence:
        "Exact lot, address, proposed footprint, area and depicted boundary dimension",
    },
    {
      record: "E2026/47509",
      role: "DETAIL_SURVEY",
      review: "PAGE_1_OPERATOR_REVIEWED",
      evidence:
        "Survey authorship, contours, parcel layout and explicit non-boundary-survey limitation",
    },
    {
      record: "E2026/80895",
      role: "DETERMINATION",
      review: "MACHINE_ACCEPTED_NOT_OPERATOR_REVIEWED",
      evidence: "Official approval record; conditions still require operator review",
    },
  ],
  provenance: {
    councilTracker:
      "https://datracker.byron.nsw.gov.au/MasterViewUI-External/Application/ApplicationDetails/010.2026.00000223.001/",
    privateReviewPageCount: 3,
    sourcePdfRetained: false,
    privateSourceHashExposed: false,
    scannerOutputExposed: false,
    transientResidueCount: 0,
  },
  confirmedControlKeys: CONFIRMED_CONTROL_KEYS,
  outstandingEvidence: OUTSTANDING_EVIDENCE,
  limitations: [
    "The retained detail survey expressly says it is not a Survey under the Surveying Act 2002.",
    "C2 touches the cadastral boundary but has no detected parcel-interior overlap; boundary touch must not be treated as split zoning.",
    "The retained stamped page does not prove the shed height or elevations.",
    "The 1.625 m figure is an approved-plan dimension, not a certified legal boundary setback.",
  ],
} as const;

function digestEvidence(): string {
  return createHash("sha256")
    .update(JSON.stringify(ITEM74H_CANDIDATE_REVIEWED_EVIDENCE))
    .digest("hex");
}

export const ITEM74H_CANDIDATE_REVIEWED_EVIDENCE_DIGEST = digestEvidence();

export const ITEM74H_CANDIDATE_DECISION_GATES: readonly CandidateDecisionGate[] = [
  {
    gate: "00",
    question: "Is the site and parcel identity confirmed?",
    evidence: [
      "Council DA 10.2026.223.1",
      "Lot 138 DP1265934",
      "NSW cadastre cadid 180752773",
    ],
    outcome: "PROCEED",
    reason: "Council, approved-plan and authoritative cadastral identifiers agree.",
    branches: [
      { condition: "Identifiers agree", decision: "PROCEED" },
      { condition: "Address or parcel conflict", decision: "STOP" },
      { condition: "A material identifier is absent", decision: "MORE_EVIDENCE" },
    ],
  },
  {
    gate: "01",
    question: "Is the proposal an ancillary storage shed?",
    evidence: [
      "Council description: Shed",
      "Approved plan title: Proposed storage shed",
      "Existing dwelling shown on the approved plan",
    ],
    outcome: "PROCEED",
    reason: "The reviewed public case presents the proposal as a storage shed beside an existing dwelling.",
    branches: [
      { condition: "Ancillary storage purpose remains confirmed", decision: "PROCEED" },
      { condition: "A separate prohibited or independent use is proposed", decision: "STOP" },
      { condition: "The operational purpose changes or is ambiguous", decision: "MORE_EVIDENCE" },
    ],
  },
  {
    gate: "02",
    question: "Is the approval pathway evidenced?",
    evidence: [
      "Council approval stamp dated 14 July 2026",
      "Determined and approved DA 10.2026.223.1",
    ],
    outcome: "PROCEED",
    reason: "This case proves a development-application pathway; it does not prove every similar shed will be approved.",
    branches: [
      { condition: "Approved DA evidence remains in scope", decision: "PROCEED" },
      { condition: "A different exempt or complying pathway is asserted", decision: "MORE_EVIDENCE" },
      { condition: "A prohibited pathway is confirmed", decision: "STOP" },
    ],
  },
  {
    gate: "03",
    question: "Is the proposed footprint within authoritative zone geometry?",
    evidence: [
      "Current NSW zoning classifies the parcel interior as R2",
      "C2 touches only the cadastral boundary and has no detected interior overlap",
      "The approved shed is depicted 1.625 m inside the parcel",
    ],
    outcome: "PROCEED",
    reason: "An inside-parcel footprint is R2; boundary-touch-only C2 is not parcel zone membership.",
    branches: [
      { condition: "Positive interior-area overlap proves a permissive zone", decision: "PROCEED" },
      { condition: "Positive C2 area overlap requires written justification", decision: "MERIT" },
      { condition: "Current geometry or inside-parcel evidence is absent", decision: "MORE_EVIDENCE" },
      { condition: "A confirmed zone prohibits the proposal with no available pathway", decision: "STOP" },
    ],
  },
  {
    gate: "04",
    question: "Are the numeric envelope and legal setbacks submission-grade?",
    evidence: [
      "Approved plan area: 24 sqm",
      "Approved-plan southern boundary dimension: 1.625 m",
      "Detail survey carries a non-boundary-survey limitation",
      "Height is absent from the retained reviewed page",
    ],
    outcome: "MORE_EVIDENCE",
    reason: "Area and zone are confirmed for working outputs, but legal setback and height claims remain qualified.",
    branches: [
      { condition: "Height, legal boundaries and current controls are verified", decision: "PROCEED" },
      { condition: "A numeric variation requires justification", decision: "MERIT" },
      { condition: "Height or legal set-out evidence is absent", decision: "MORE_EVIDENCE" },
      { condition: "A non-negotiable numeric control is exceeded with no pathway", decision: "STOP" },
    ],
  },
  {
    gate: "05",
    question: "Can the customer progress commercially without a false final claim?",
    evidence: [
      "Existing progressive commercial binding",
      "A$49 same-scope credit contract",
      "Working SEE regeneration contract",
    ],
    outcome: "PROCEED",
    reason: "Both products can progress as working outputs while every unresolved item remains visible and final submission stays ineligible.",
    branches: [
      { condition: "Working scope preserves all evidence gaps", decision: "PROCEED" },
      { condition: "A final or submission-ready claim is requested now", decision: "STOP" },
      { condition: "Later evidence changes the pathway or controls", decision: "MERIT" },
      { condition: "Later evidence has not yet been reviewed", decision: "MORE_EVIDENCE" },
    ],
  },
];

function workingPayload(
  product: "PLANNING_CONTROLS_PACK" | "SUBMISSION_SEE",
  scopeDigest: string,
  outstandingEvidence: string[],
) {
  const planningPack = product === "PLANNING_CONTROLS_PACK";
  return {
    productCode: product,
    priceAudCents: planningPack ? 4900 : 74900,
    readiness: planningPack ? "WORKING_CONTROLS_PACK" : "WORKING_SEE",
    submissionReady: false,
    finalSubmissionEligible: false,
    scopeDigest,
    outstandingEvidence,
  };
}

export function buildItem74hCandidateReviewedPathwayProof() {
  const zoneDecision = item74hCandidateZoneDecision(
    ITEM74H_CANDIDATE_ZONE_BOUNDARY_EVIDENCE,
  );
  if (zoneDecision.decision !== "PROCEED" || zoneDecision.zone !== "R2") {
    throw new Error("Candidate zone evidence must be confirmed before binding");
  }

  const binding = createPathwayProgressiveCommercialBinding({
    scopeKey: ITEM74H_CANDIDATE_SCOPE_KEY,
    siteEvidenceDigest: ITEM74H_CANDIDATE_REVIEWED_EVIDENCE_DIGEST,
    pathwayDecision: "PROCEED",
    evidenceStatus: "MORE_EVIDENCE_REQUIRED",
    confirmedControlKeys: [...CONFIRMED_CONTROL_KEYS],
    outstandingEvidence: [...OUTSTANDING_EVIDENCE],
  });
  const presentation = buildPathwayCommercialPresentation({
    planningControlsPackReadiness: "WORKING",
    submissionSeeReadiness: "WORKING",
    submissionReady: false,
    productionCheckoutEnabled: false,
  });
  const assessment = {
    trustLevel: "SITE_CONFIRMED",
    isCurrent: true,
    evidenceCurrent: true,
    controlsCurrent: true,
    fixtureEvidence: false,
  };
  const planningControlsPackPayload = workingPayload(
    "PLANNING_CONTROLS_PACK",
    binding.scopeDigest,
    binding.outstandingEvidence,
  );
  const submissionSeePayload = workingPayload(
    "SUBMISSION_SEE",
    binding.scopeDigest,
    binding.outstandingEvidence,
  );

  return {
    version: ITEM74H_CANDIDATE_REVIEWED_PATHWAY_VERSION,
    manifest: ITEM74H_CANDIDATE_REVIEWED_EVIDENCE,
    evidenceDigest: ITEM74H_CANDIDATE_REVIEWED_EVIDENCE_DIGEST,
    gates: ITEM74H_CANDIDATE_DECISION_GATES,
    customerDecision: "MORE_EVIDENCE_REQUIRED" as const,
    binding,
    presentation,
    workingProducts: {
      planningControlsPack: {
        payload: planningControlsPackPayload,
        policy: evaluateWorkingPathwayArtefactPolicy({
          commercialStage: "PLANNING_CONTROLS_PACK_WORKING",
          scopeKey: binding.scopeKey,
          evidenceDigest: binding.siteEvidenceDigest,
          progressiveBinding: binding,
          artefactPayload: planningControlsPackPayload,
          assessment,
        }),
      },
      submissionSee: {
        payload: submissionSeePayload,
        policy: evaluateWorkingPathwayArtefactPolicy({
          commercialStage: "SUBMISSION_SEE_WORKING",
          scopeKey: binding.scopeKey,
          evidenceDigest: binding.siteEvidenceDigest,
          progressiveBinding: binding,
          artefactPayload: submissionSeePayload,
          assessment,
        }),
      },
    },
    finalSubmissionEligible: false,
    productionCheckoutEnabled: false,
    upgradeMessage:
      "Start with the working product now. Add legal set-out, stamped elevations and reviewed consent conditions later to strengthen and regenerate the same purchased project; the A$49 same-scope credit remains available against the A$749 SEE.",
  };
}

export type Item74hCandidateReviewedPathwayProof = ReturnType<
  typeof buildItem74hCandidateReviewedPathwayProof
>;

export function verifyItem74hCandidateReviewedPathwayProof(
  proof: Item74hCandidateReviewedPathwayProof,
): boolean {
  const graphDecisions = new Set<CandidateGateDecision>();
  for (const gate of proof.gates) {
    graphDecisions.add(gate.outcome);
    for (const branch of gate.branches) graphDecisions.add(branch.decision);
  }
  const requiredDecisions: CandidateGateDecision[] = [
    "STOP",
    "PROCEED",
    "MERIT",
    "MORE_EVIDENCE",
  ];
  const expectedDigest = digestEvidence();
  const outstanding = new Set(proof.binding.outstandingEvidence);

  return (
    proof.version === ITEM74H_CANDIDATE_REVIEWED_PATHWAY_VERSION &&
    proof.manifest === ITEM74H_CANDIDATE_REVIEWED_EVIDENCE &&
    proof.evidenceDigest === expectedDigest &&
    verifyItem74hCandidateZoneBoundaryEvidence(
      proof.manifest.zoneBoundaryEvidence,
    ) &&
    proof.manifest.proposal.proposalZone === "R2" &&
    proof.manifest.proposal.proposalZoneConfirmed === true &&
    proof.binding.scopeKey === ITEM74H_CANDIDATE_SCOPE_KEY &&
    proof.binding.siteEvidenceDigest === expectedDigest &&
    proof.binding.evidenceStatus === "MORE_EVIDENCE_REQUIRED" &&
    proof.binding.pathwayDecision === "PROCEED" &&
    verifyPathwayProgressiveCommercialBinding(proof.binding) &&
    OUTSTANDING_EVIDENCE.every((item) => outstanding.has(item)) &&
    !outstanding.has("PROPOSAL_FOOTPRINT_ZONE_OVERLAY") &&
    requiredDecisions.every((decision) => graphDecisions.has(decision)) &&
    proof.gates.find((gate) => gate.gate === "03")?.outcome === "PROCEED" &&
    proof.gates.find((gate) => gate.gate === "04")?.outcome ===
      "MORE_EVIDENCE" &&
    proof.customerDecision === "MORE_EVIDENCE_REQUIRED" &&
    proof.presentation.planningControlsPack.priceLabel === "A$49" &&
    proof.presentation.submissionSee.priceLabel === "A$749" &&
    proof.presentation.planningControlsPack.canProgress === true &&
    proof.presentation.submissionSee.canProgress === true &&
    proof.presentation.submissionReady === false &&
    proof.presentation.productionCheckoutEnabled === false &&
    proof.presentation.planningControlsPack.checkoutEnabled === false &&
    proof.presentation.submissionSee.checkoutEnabled === false &&
    proof.workingProducts.planningControlsPack.policy.allowed === true &&
    proof.workingProducts.submissionSee.policy.allowed === true &&
    proof.workingProducts.planningControlsPack.payload.submissionReady ===
      false &&
    proof.workingProducts.submissionSee.payload.submissionReady === false &&
    proof.finalSubmissionEligible === false &&
    proof.productionCheckoutEnabled === false
  );
}
