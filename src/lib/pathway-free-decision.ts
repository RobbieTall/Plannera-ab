import {
  assessPathwayCheck,
  type PathwayCheckAcceptance,
  type PathwayCheckCandidate,
  type PathwayOutcome,
} from "./pathway-check-acceptance";
import {
  evaluateProposalAttestation,
  type ProposalAttestationEvaluation,
  type ProposalAttestationInput,
} from "./pathway-proposal-attestation";
import type { PathwayTfnswRoadEvidenceBridgeResult } from "./pathway-tfnsw-road-evidence-bridge";

export type PathwayFreeDecisionGateId =
  | "BASE_PATHWAY_CONTRACT"
  | "ROAD_CLASSIFICATION"
  | "PROPOSAL_MEASUREMENTS"
  | "COMMERCIAL_EVIDENCE";

export type PathwayFreeDecisionGate = {
  id: PathwayFreeDecisionGateId;
  outcome: PathwayOutcome;
  evidenceState:
    | "ACCEPTED"
    | "EVIDENCE_VERIFIED"
    | "USER_ATTESTED"
    | "MORE_EVIDENCE_REQUIRED";
  reasoning: string;
};

export type PathwayFreeDecisionResult = {
  status: "ready" | "blocked";
  decision: "MORE_EVIDENCE_REQUIRED";
  freeOutputEligible: boolean;
  planningControlsPackEligible: false;
  submissionSeeEligible: false;
  acceptance: PathwayCheckAcceptance;
  gates: PathwayFreeDecisionGate[];
  proposal: ProposalAttestationEvaluation;
  reasons: string[];
  privacy: {
    rawAddressReturned: false;
    coordinatesReturned: false;
    rawSpatialResponsesReturned: false;
  };
};

const roadEvidenceIsVerified = (
  roadEvidence: PathwayTfnswRoadEvidenceBridgeResult,
): boolean => {
  if (roadEvidence.status !== "EVIDENCE_VERIFIED") return false;
  const observation = roadEvidence.observation;
  if (
    !observation ||
    observation.factKey !== "ROAD_CLASSIFICATION" ||
    observation.value !== "CLASSIFIED_ROAD" ||
    observation.sourceKind !== "AUTHORITATIVE_SPATIAL" ||
    observation.trustLevel !== "EVIDENCE_VERIFIED" ||
    roadEvidence.redactedSummary.frontageBound !== true ||
    roadEvidence.redactedSummary.matchingFeatureCount <= 0
  ) {
    throw new Error(
      "Verified road evidence is inconsistent with the shared evidence graph.",
    );
  }
  return true;
};

export function evaluateFreeByronShedPathway(input: {
  candidate: PathwayCheckCandidate;
  proposalAttestation: ProposalAttestationInput;
  roadEvidence: PathwayTfnswRoadEvidenceBridgeResult;
}): PathwayFreeDecisionResult {
  const acceptance = assessPathwayCheck(input.candidate);
  const proposal = evaluateProposalAttestation(input.proposalAttestation);
  const roadVerified = roadEvidenceIsVerified(input.roadEvidence);
  const previewTarget =
    input.candidate.target === "pathway_preview" &&
    input.candidate.commercialMode !== "production";
  const freeOutputEligible = acceptance.ready && previewTarget;

  const gates: PathwayFreeDecisionGate[] = [
    {
      id: "BASE_PATHWAY_CONTRACT",
      outcome: acceptance.ready ? "PROCEED" : "MORE_EVIDENCE_REQUIRED",
      evidenceState: acceptance.ready ? "ACCEPTED" : "MORE_EVIDENCE_REQUIRED",
      reasoning: acceptance.ready
        ? "The versioned free Pathway Check contract is accepted for safe rendering."
        : "The free Pathway Check candidate has unresolved acceptance issues.",
    },
    {
      id: "ROAD_CLASSIFICATION",
      outcome: roadVerified ? "PROCEED" : "MORE_EVIDENCE_REQUIRED",
      evidenceState: roadVerified
        ? "EVIDENCE_VERIFIED"
        : "MORE_EVIDENCE_REQUIRED",
      reasoning: roadVerified
        ? "A positive current State or Regional intersection is bound to a verified frontage point."
        : "The relevant frontage has no positive current authoritative road-classification evidence.",
    },
    {
      id: "PROPOSAL_MEASUREMENTS",
      outcome: "MORE_EVIDENCE_REQUIRED",
      evidenceState: "USER_ATTESTED",
      reasoning:
        "The proposal dimensions, setbacks and agricultural purpose are useful estimates but are not surveyed or evidence-verified.",
    },
    {
      id: "COMMERCIAL_EVIDENCE",
      outcome: "MORE_EVIDENCE_REQUIRED",
      evidenceState: "MORE_EVIDENCE_REQUIRED",
      reasoning:
        "The paid products require the remaining evidence manifest and operator approval independently of this free result.",
    },
  ];

  const reasons = [
    ...acceptance.issues.map((issue) => issue.detail),
    ...(roadVerified
      ? []
      : [
          "Authoritative road classification for the relevant frontage is still required.",
        ]),
    "Proposal dimensions and setbacks remain user-attested until bound to accepted plans or survey evidence.",
    "The A$49 pack and A$749 SEE remain locked until their complete trust requirements are met.",
  ];

  return {
    status: freeOutputEligible ? "ready" : "blocked",
    decision: "MORE_EVIDENCE_REQUIRED",
    freeOutputEligible,
    planningControlsPackEligible: false,
    submissionSeeEligible: false,
    acceptance,
    gates,
    proposal,
    reasons: [...new Set(reasons)],
    privacy: {
      rawAddressReturned: false,
      coordinatesReturned: false,
      rawSpatialResponsesReturned: false,
    },
  };
}
