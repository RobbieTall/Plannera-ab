import type { PathwayCommercialBindingEvaluation } from "./pathway-commercial-binding";

export const PATHWAY_PAID_ARTEFACT_POLICY_VERSION =
  "item74h-paid-artefact-policy.v1" as const;

export type PathwayPaidArtefactPolicyBlocker =
  | "UNSUPPORTED_FREE_STAGE"
  | "COMMERCIAL_BINDING_REQUIRED"
  | "COMMERCIAL_STAGE_INELIGIBLE"
  | "EXACT_SCOPE_REQUIRED"
  | "EXACT_SCOPE_KEY_MISMATCH"
  | "EVIDENCE_DIGEST_MISMATCH"
  | "ASSESSMENT_OUTCOME_MISMATCH"
  | "INSUFFICIENT_STAGE_TRUST"
  | "ASSESSMENT_NOT_CURRENT"
  | "EVIDENCE_NOT_CURRENT"
  | "CONTROLS_NOT_CURRENT"
  | "PRODUCTION_CHECKOUT_ENABLED";

export interface PathwayPaidArtefactPolicyInput {
  commercialStage:
    | "FREE_PATHWAY_CHECK"
    | "PLANNING_CONTROLS_PACK"
    | "SUBMISSION_SEE";
  scopeKey: string;
  evidenceDigest: string;
  commercialBinding: PathwayCommercialBindingEvaluation | null;
  assessment: {
    decision: string;
    trustLevel: string;
    isCurrent: boolean;
    evidenceCurrent: boolean;
    controlsCurrent: boolean;
  };
}

export interface PathwayPaidArtefactPolicyEvaluation {
  policyVersion: typeof PATHWAY_PAID_ARTEFACT_POLICY_VERSION;
  allowed: boolean;
  blockers: PathwayPaidArtefactPolicyBlocker[];
}

const TRUST_RANK: Record<string, number> = {
  GENERAL_GUIDANCE: 0,
  SITE_CONFIRMED: 1,
  EVIDENCE_VERIFIED: 2,
  OPERATOR_APPROVED: 3,
  SUBMISSION_READY: 4,
};

export function evaluatePaidArtefactBindingPolicy(
  input: PathwayPaidArtefactPolicyInput,
): PathwayPaidArtefactPolicyEvaluation {
  const blockers: PathwayPaidArtefactPolicyBlocker[] = [];
  const binding = input.commercialBinding;
  const exactScope = binding?.exactScope || null;

  if (input.commercialStage === "FREE_PATHWAY_CHECK") {
    blockers.push("UNSUPPORTED_FREE_STAGE");
  }
  if (!binding) {
    blockers.push("COMMERCIAL_BINDING_REQUIRED");
  } else {
    const stageEligible =
      input.commercialStage === "PLANNING_CONTROLS_PACK"
        ? binding.planningControlsPackEligible
        : input.commercialStage === "SUBMISSION_SEE"
          ? binding.submissionSeeEligible
          : false;
    if (!stageEligible) blockers.push("COMMERCIAL_STAGE_INELIGIBLE");
    if (binding.productionCheckoutEnabled !== false) {
      blockers.push("PRODUCTION_CHECKOUT_ENABLED");
    }
  }

  if (!exactScope) {
    blockers.push("EXACT_SCOPE_REQUIRED");
  } else {
    if (input.scopeKey !== exactScope.scopeDigest) {
      blockers.push("EXACT_SCOPE_KEY_MISMATCH");
    }
    if (
      input.evidenceDigest !== exactScope.siteEvidenceDigest
    ) {
      blockers.push("EVIDENCE_DIGEST_MISMATCH");
    }

    const expectedDecision =
      exactScope.outcome === "MERIT_ASSESSED"
        ? "MERIT_ASSESSMENT"
        : exactScope.outcome;
    if (input.assessment.decision !== expectedDecision) {
      blockers.push("ASSESSMENT_OUTCOME_MISMATCH");
    }
  }

  const requiredTrust =
    input.commercialStage === "SUBMISSION_SEE"
      ? TRUST_RANK.OPERATOR_APPROVED
      : TRUST_RANK.EVIDENCE_VERIFIED;
  if (
    (TRUST_RANK[input.assessment.trustLevel] ?? -1) <
    requiredTrust
  ) {
    blockers.push("INSUFFICIENT_STAGE_TRUST");
  }
  if (!input.assessment.isCurrent) {
    blockers.push("ASSESSMENT_NOT_CURRENT");
  }
  if (!input.assessment.evidenceCurrent) {
    blockers.push("EVIDENCE_NOT_CURRENT");
  }
  if (!input.assessment.controlsCurrent) {
    blockers.push("CONTROLS_NOT_CURRENT");
  }

  return {
    policyVersion: PATHWAY_PAID_ARTEFACT_POLICY_VERSION,
    allowed: blockers.length === 0,
    blockers,
  };
}
