import { createHash } from "node:crypto";

export const PATHWAY_PROGRESSIVE_COMMERCIAL_BINDING_VERSION =
  "item74h-progressive-commercial-binding.v1" as const;
export const PERSISTED_PATHWAY_PROGRESSIVE_COMMERCIAL_BINDING_KEY =
  "item74hProgressiveCommercialBinding" as const;

export type PathwayProgressiveCommercialStage =
  | "PLANNING_CONTROLS_PACK_WORKING"
  | "SUBMISSION_SEE_WORKING";
export type PathwayProgressiveDecision = "PROCEED" | "MERIT_ASSESSMENT";
export type PathwayEvidenceStatus = "CONFIRMED" | "MORE_EVIDENCE_REQUIRED";

export interface PathwayProgressiveCommercialBinding {
  bindingVersion: typeof PATHWAY_PROGRESSIVE_COMMERCIAL_BINDING_VERSION;
  scopeKey: string;
  scopeDigest: string;
  siteEvidenceDigest: string;
  pathwayDecision: PathwayProgressiveDecision;
  evidenceStatus: PathwayEvidenceStatus;
  confirmedControlKeys: string[];
  outstandingEvidence: string[];
  planningControlsPack: {
    productCode: "PLANNING_CONTROLS_PACK";
    priceAudCents: 4900;
    workingEligible: true;
  };
  submissionSee: {
    productCode: "SUBMISSION_SEE";
    priceAudCents: 74900;
    workingEligible: true;
  };
  finalSubmissionEligible: false;
  productionCheckoutEnabled: false;
}

export type PathwayProgressiveBindingPersistenceBlocker =
  | "RESULT_OBJECT_REQUIRED"
  | "INVALID_PROGRESSIVE_BINDING"
  | "SCOPE_KEY_MISMATCH"
  | "EVIDENCE_DIGEST_MISMATCH"
  | "DECISION_MISMATCH";

export type PathwayWorkingArtefactPolicyBlocker =
  | "PROGRESSIVE_BINDING_REQUIRED"
  | "INVALID_PROGRESSIVE_BINDING"
  | "SCOPE_KEY_MISMATCH"
  | "EVIDENCE_DIGEST_MISMATCH"
  | "WORKING_STAGE_DECLARATION_REQUIRED"
  | "PRODUCT_MISMATCH"
  | "PRICE_MISMATCH"
  | "SCOPE_DIGEST_MISMATCH"
  | "OUTSTANDING_EVIDENCE_MISMATCH"
  | "FINAL_READINESS_CLAIMED"
  | "INSUFFICIENT_STAGE_TRUST"
  | "FIXTURE_EVIDENCE"
  | "ASSESSMENT_NOT_CURRENT"
  | "EVIDENCE_NOT_CURRENT"
  | "CONTROLS_NOT_CURRENT"
  | "PRODUCTION_CHECKOUT_ENABLED";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalized(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function sameStrings(left: unknown, right: string[]): boolean {
  return (
    Array.isArray(left) &&
    left.every((value) => typeof value === "string") &&
    JSON.stringify(normalized(left as string[])) === JSON.stringify(normalized(right))
  );
}

export function computePathwayProgressiveScopeDigest(input: {
  scopeKey: string;
  siteEvidenceDigest: string;
  pathwayDecision: PathwayProgressiveDecision;
  evidenceStatus: PathwayEvidenceStatus;
  confirmedControlKeys: string[];
  outstandingEvidence: string[];
}): string {
  return sha256(
    JSON.stringify({
      scopeKey: input.scopeKey,
      siteEvidenceDigest: input.siteEvidenceDigest,
      pathwayDecision: input.pathwayDecision,
      evidenceStatus: input.evidenceStatus,
      confirmedControlKeys: normalized(input.confirmedControlKeys),
      outstandingEvidence: normalized(input.outstandingEvidence),
    }),
  );
}

export function createPathwayProgressiveCommercialBinding(input: {
  scopeKey: string;
  siteEvidenceDigest: string;
  pathwayDecision: PathwayProgressiveDecision;
  evidenceStatus: PathwayEvidenceStatus;
  confirmedControlKeys: string[];
  outstandingEvidence: string[];
}): PathwayProgressiveCommercialBinding {
  const confirmedControlKeys = normalized(input.confirmedControlKeys);
  const outstandingEvidence = normalized(input.outstandingEvidence);
  if (!input.scopeKey.trim() || !/^[a-f0-9]{64}$/.test(input.siteEvidenceDigest)) {
    throw new Error("Progressive binding requires a scope key and SHA-256 evidence digest");
  }
  if (confirmedControlKeys.length === 0) {
    throw new Error("Progressive binding requires at least one confirmed control");
  }
  if (
    input.evidenceStatus === "MORE_EVIDENCE_REQUIRED" &&
    outstandingEvidence.length === 0
  ) {
    throw new Error("Outstanding evidence must be named");
  }
  if (input.evidenceStatus === "CONFIRMED" && outstandingEvidence.length > 0) {
    throw new Error("Confirmed evidence cannot retain outstanding items");
  }

  const digestInput = {
    scopeKey: input.scopeKey,
    siteEvidenceDigest: input.siteEvidenceDigest,
    pathwayDecision: input.pathwayDecision,
    evidenceStatus: input.evidenceStatus,
    confirmedControlKeys,
    outstandingEvidence,
  };

  return {
    bindingVersion: PATHWAY_PROGRESSIVE_COMMERCIAL_BINDING_VERSION,
    ...digestInput,
    scopeDigest: computePathwayProgressiveScopeDigest(digestInput),
    planningControlsPack: {
      productCode: "PLANNING_CONTROLS_PACK",
      priceAudCents: 4900,
      workingEligible: true,
    },
    submissionSee: {
      productCode: "SUBMISSION_SEE",
      priceAudCents: 74900,
      workingEligible: true,
    },
    finalSubmissionEligible: false,
    productionCheckoutEnabled: false,
  };
}

export function verifyPathwayProgressiveCommercialBinding(
  binding: PathwayProgressiveCommercialBinding,
): boolean {
  return (
    isRecord(binding) &&
    typeof binding.scopeKey === "string" &&
    typeof binding.siteEvidenceDigest === "string" &&
    typeof binding.scopeDigest === "string" &&
    Array.isArray(binding.confirmedControlKeys) &&
    binding.confirmedControlKeys.every((value) => typeof value === "string") &&
    Array.isArray(binding.outstandingEvidence) &&
    binding.outstandingEvidence.every((value) => typeof value === "string") &&
    isRecord(binding.planningControlsPack) &&
    isRecord(binding.submissionSee) &&
    binding.bindingVersion === PATHWAY_PROGRESSIVE_COMMERCIAL_BINDING_VERSION &&
    Boolean(binding.scopeKey.trim()) &&
    /^[a-f0-9]{64}$/.test(binding.siteEvidenceDigest) &&
    /^[a-f0-9]{64}$/.test(binding.scopeDigest) &&
    (binding.pathwayDecision === "PROCEED" ||
      binding.pathwayDecision === "MERIT_ASSESSMENT") &&
    (binding.evidenceStatus === "CONFIRMED" ||
      binding.evidenceStatus === "MORE_EVIDENCE_REQUIRED") &&
    normalized(binding.confirmedControlKeys).length > 0 &&
    (binding.evidenceStatus === "CONFIRMED"
      ? normalized(binding.outstandingEvidence).length === 0
      : normalized(binding.outstandingEvidence).length > 0) &&
    binding.planningControlsPack.productCode === "PLANNING_CONTROLS_PACK" &&
    binding.planningControlsPack.priceAudCents === 4900 &&
    binding.planningControlsPack.workingEligible === true &&
    binding.submissionSee.productCode === "SUBMISSION_SEE" &&
    binding.submissionSee.priceAudCents === 74900 &&
    binding.submissionSee.workingEligible === true &&
    binding.finalSubmissionEligible === false &&
    binding.productionCheckoutEnabled === false &&
    binding.scopeDigest ===
      computePathwayProgressiveScopeDigest({
        scopeKey: binding.scopeKey,
        siteEvidenceDigest: binding.siteEvidenceDigest,
        pathwayDecision: binding.pathwayDecision,
        evidenceStatus: binding.evidenceStatus,
        confirmedControlKeys: binding.confirmedControlKeys,
        outstandingEvidence: binding.outstandingEvidence,
      })
  );
}

export function attachPersistedPathwayProgressiveCommercialBinding(
  result: unknown,
  binding: PathwayProgressiveCommercialBinding | null,
): unknown {
  if (!binding) return result;
  if (!verifyPathwayProgressiveCommercialBinding(binding)) {
    throw new Error("Progressive commercial binding is invalid");
  }
  if (!isRecord(result)) {
    throw new Error("Progressive commercial binding requires an object result");
  }
  return {
    ...result,
    [PERSISTED_PATHWAY_PROGRESSIVE_COMMERCIAL_BINDING_KEY]: binding,
  };
}

export function readPersistedPathwayProgressiveCommercialBinding(
  result: unknown,
): PathwayProgressiveCommercialBinding | null {
  if (!isRecord(result)) return null;
  const candidate =
    result[PERSISTED_PATHWAY_PROGRESSIVE_COMMERCIAL_BINDING_KEY];
  if (!isRecord(candidate)) return null;
  const binding = candidate as unknown as PathwayProgressiveCommercialBinding;
  return verifyPathwayProgressiveCommercialBinding(binding) ? binding : null;
}

export function progressiveBindingReplayMatches(
  result: unknown,
  expected: PathwayProgressiveCommercialBinding | null,
): boolean {
  if (!expected) {
    return (
      !isRecord(result) ||
      !(PERSISTED_PATHWAY_PROGRESSIVE_COMMERCIAL_BINDING_KEY in result)
    );
  }
  const persisted = readPersistedPathwayProgressiveCommercialBinding(result);
  return Boolean(
    persisted &&
      persisted.scopeDigest === expected.scopeDigest &&
      persisted.siteEvidenceDigest === expected.siteEvidenceDigest,
  );
}

export function evaluatePathwayProgressiveBindingPersistence(input: {
  result: unknown;
  binding: PathwayProgressiveCommercialBinding | null;
  scopeKey: string;
  evidenceDigest: string;
  decision: string;
}): {
  allowed: boolean;
  blockers: PathwayProgressiveBindingPersistenceBlocker[];
} {
  const blockers: PathwayProgressiveBindingPersistenceBlocker[] = [];
  if (!input.binding) {
    if (
      isRecord(input.result) &&
      PERSISTED_PATHWAY_PROGRESSIVE_COMMERCIAL_BINDING_KEY in input.result
    ) {
      blockers.push("INVALID_PROGRESSIVE_BINDING");
    }
    return { allowed: blockers.length === 0, blockers };
  }
  if (!isRecord(input.result)) blockers.push("RESULT_OBJECT_REQUIRED");
  if (!verifyPathwayProgressiveCommercialBinding(input.binding)) {
    blockers.push("INVALID_PROGRESSIVE_BINDING");
  }
  if (input.binding.scopeKey !== input.scopeKey) {
    blockers.push("SCOPE_KEY_MISMATCH");
  }
  if (input.binding.siteEvidenceDigest !== input.evidenceDigest) {
    blockers.push("EVIDENCE_DIGEST_MISMATCH");
  }
  const expectedDecision =
    input.binding.evidenceStatus === "MORE_EVIDENCE_REQUIRED"
      ? "MORE_EVIDENCE_REQUIRED"
      : input.binding.pathwayDecision;
  if (input.decision !== expectedDecision) blockers.push("DECISION_MISMATCH");
  return { allowed: blockers.length === 0, blockers };
}

const TRUST_RANK: Record<string, number> = {
  GENERAL_GUIDANCE: 0,
  SITE_CONFIRMED: 1,
  EVIDENCE_VERIFIED: 2,
  OPERATOR_APPROVED: 3,
  SUBMISSION_READY: 4,
};

export function evaluateWorkingPathwayArtefactPolicy(input: {
  commercialStage: PathwayProgressiveCommercialStage;
  scopeKey: string;
  evidenceDigest: string;
  progressiveBinding: PathwayProgressiveCommercialBinding | null;
  artefactPayload: unknown;
  assessment: {
    trustLevel: string;
    isCurrent: boolean;
    evidenceCurrent: boolean;
    controlsCurrent: boolean;
    fixtureEvidence: boolean;
  };
}): { allowed: boolean; blockers: PathwayWorkingArtefactPolicyBlocker[] } {
  const blockers: PathwayWorkingArtefactPolicyBlocker[] = [];
  const binding = input.progressiveBinding;
  const payload = isRecord(input.artefactPayload) ? input.artefactPayload : null;
  const expected =
    input.commercialStage === "PLANNING_CONTROLS_PACK_WORKING"
      ? {
          productCode: "PLANNING_CONTROLS_PACK",
          priceAudCents: 4900,
          readiness: "WORKING_CONTROLS_PACK",
        }
      : {
          productCode: "SUBMISSION_SEE",
          priceAudCents: 74900,
          readiness: "WORKING_SEE",
        };

  if (!binding) {
    blockers.push("PROGRESSIVE_BINDING_REQUIRED");
  } else {
    if (!verifyPathwayProgressiveCommercialBinding(binding)) {
      blockers.push("INVALID_PROGRESSIVE_BINDING");
    }
    if (binding.scopeKey !== input.scopeKey) blockers.push("SCOPE_KEY_MISMATCH");
    if (binding.siteEvidenceDigest !== input.evidenceDigest) {
      blockers.push("EVIDENCE_DIGEST_MISMATCH");
    }
    if (binding.productionCheckoutEnabled !== false) {
      blockers.push("PRODUCTION_CHECKOUT_ENABLED");
    }
  }

  if (!payload || payload.readiness !== expected.readiness) {
    blockers.push("WORKING_STAGE_DECLARATION_REQUIRED");
  }
  if (!payload || payload.productCode !== expected.productCode) {
    blockers.push("PRODUCT_MISMATCH");
  }
  if (!payload || payload.priceAudCents !== expected.priceAudCents) {
    blockers.push("PRICE_MISMATCH");
  }
  if (!binding || !payload || payload.scopeDigest !== binding.scopeDigest) {
    blockers.push("SCOPE_DIGEST_MISMATCH");
  }
  if (
    !binding ||
    !payload ||
    !sameStrings(payload.outstandingEvidence, binding.outstandingEvidence)
  ) {
    blockers.push("OUTSTANDING_EVIDENCE_MISMATCH");
  }
  if (
    !payload ||
    payload.submissionReady !== false ||
    payload.finalSubmissionEligible !== false
  ) {
    blockers.push("FINAL_READINESS_CLAIMED");
  }
  if ((TRUST_RANK[input.assessment.trustLevel] ?? -1) < TRUST_RANK.SITE_CONFIRMED) {
    blockers.push("INSUFFICIENT_STAGE_TRUST");
  }
  if (input.assessment.fixtureEvidence) blockers.push("FIXTURE_EVIDENCE");
  if (!input.assessment.isCurrent) blockers.push("ASSESSMENT_NOT_CURRENT");
  if (!input.assessment.evidenceCurrent) blockers.push("EVIDENCE_NOT_CURRENT");
  if (!input.assessment.controlsCurrent) blockers.push("CONTROLS_NOT_CURRENT");

  return { allowed: blockers.length === 0, blockers };
}
