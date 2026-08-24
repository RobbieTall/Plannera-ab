import type { PathwayCommercialBindingEvaluation } from "./pathway-commercial-binding";
import { verifyPathwayExactCommercialScope } from "./pathway-commercial-binding";

export const PERSISTED_PATHWAY_COMMERCIAL_BINDING_KEY =
  "item74hCommercialBinding" as const;

export type PathwayCommercialBindingPersistenceBlocker =
  | "RESULT_OBJECT_REQUIRED"
  | "EXACT_SCOPE_REQUIRED"
  | "INVALID_SCOPE_DIGEST"
  | "PACK_ELIGIBILITY_REQUIRED"
  | "PRODUCTION_CHECKOUT_ENABLED"
  | "SCOPE_KEY_MISMATCH"
  | "EVIDENCE_DIGEST_MISMATCH"
  | "DECISION_MISMATCH";

export interface PathwayCommercialBindingPersistenceEvaluation {
  allowed: boolean;
  blockers: PathwayCommercialBindingPersistenceBlocker[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function evaluatePathwayCommercialBindingPersistence(input: {
  result: unknown;
  binding: PathwayCommercialBindingEvaluation | null;
  scopeKey: string;
  evidenceDigest: string;
  decision: string;
}): PathwayCommercialBindingPersistenceEvaluation {
  const blockers: PathwayCommercialBindingPersistenceBlocker[] = [];
  const binding = input.binding;
  if (!binding) return { allowed: true, blockers };

  if (!isRecord(input.result)) blockers.push("RESULT_OBJECT_REQUIRED");
  if (!binding.exactScope) {
    blockers.push("EXACT_SCOPE_REQUIRED");
  } else {
    if (!verifyPathwayExactCommercialScope(binding.exactScope)) {
      blockers.push("INVALID_SCOPE_DIGEST");
    }
    if (input.scopeKey !== binding.exactScope.scopeDigest) {
      blockers.push("SCOPE_KEY_MISMATCH");
    }
    if (input.evidenceDigest !== binding.exactScope.siteEvidenceDigest) {
      blockers.push("EVIDENCE_DIGEST_MISMATCH");
    }
    const expectedDecision =
      binding.exactScope.outcome === "MERIT_ASSESSED"
        ? "MERIT_ASSESSMENT"
        : binding.exactScope.outcome;
    if (input.decision !== expectedDecision) {
      blockers.push("DECISION_MISMATCH");
    }
  }
  if (!binding.planningControlsPackEligible) {
    blockers.push("PACK_ELIGIBILITY_REQUIRED");
  }
  if (binding.productionCheckoutEnabled !== false) {
    blockers.push("PRODUCTION_CHECKOUT_ENABLED");
  }
  return { allowed: blockers.length === 0, blockers };
}

export function attachPersistedPathwayCommercialBinding(
  result: unknown,
  binding: PathwayCommercialBindingEvaluation | null,
): unknown {
  if (!binding) return result;
  if (!isRecord(result)) {
    throw new Error("Commercial binding requires an object result");
  }
  return {
    ...result,
    [PERSISTED_PATHWAY_COMMERCIAL_BINDING_KEY]: binding,
  };
}

export function readPersistedPathwayCommercialBinding(
  result: unknown,
): PathwayCommercialBindingEvaluation | null {
  if (!isRecord(result)) return null;
  const candidate = result[PERSISTED_PATHWAY_COMMERCIAL_BINDING_KEY];
  if (!isRecord(candidate)) return null;
  if (
    candidate.bindingVersion !==
      "byron-ru2-shed-commercial-binding.v1" ||
    candidate.productionCheckoutEnabled !== false ||
    typeof candidate.planningControlsPackEligible !== "boolean" ||
    typeof candidate.submissionSeeEligible !== "boolean" ||
    !isRecord(candidate.exactScope)
  ) {
    return null;
  }
  const binding = candidate as unknown as PathwayCommercialBindingEvaluation;
  return binding.exactScope &&
    verifyPathwayExactCommercialScope(binding.exactScope)
    ? binding
    : null;
}

export function commercialBindingReplayMatches(
  persistedResult: unknown,
  expected: PathwayCommercialBindingEvaluation | null,
): boolean {
  if (!expected) {
    return (
      !isRecord(persistedResult) ||
      !(PERSISTED_PATHWAY_COMMERCIAL_BINDING_KEY in persistedResult)
    );
  }
  const persisted = readPersistedPathwayCommercialBinding(persistedResult);
  if (!persisted || !persisted.exactScope || !expected.exactScope) {
    return false;
  }
  return (
    persisted.exactScope.scopeDigest === expected.exactScope.scopeDigest &&
    persisted.planningControlsPackEligible ===
      expected.planningControlsPackEligible &&
    persisted.submissionSeeEligible === expected.submissionSeeEligible &&
    JSON.stringify(persisted.blockers) === JSON.stringify(expected.blockers)
  );
}
