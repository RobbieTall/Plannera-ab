import { describe, expect, it } from "vitest";

import {
  computePathwayCommercialScopeDigest,
  type PathwayCommercialBindingEvaluation,
  type PathwayExactCommercialScope,
} from "./pathway-commercial-binding";
import {
  attachPersistedPathwayCommercialBinding,
  commercialBindingReplayMatches,
  evaluatePathwayCommercialBindingPersistence,
  readPersistedPathwayCommercialBinding,
} from "./pathway-persisted-commercial-binding";

const EVIDENCE = "a".repeat(64);

function exactScope(
  outcome: "PROCEED" | "MERIT_ASSESSED" = "PROCEED",
): PathwayExactCommercialScope {
  const unsigned = {
    bindingVersion: "byron-ru2-shed-commercial-binding.v1" as const,
    siteEvidenceDigest: EVIDENCE,
    controlId: "byron-dcp-2014-d2-rural-road-setbacks.v1",
    roadCategory: "CLASSIFIED_ROAD" as const,
    minimumRoadSetbackMetres: 55,
    proposedRoadSetbackMetres: outcome === "PROCEED" ? 55 : 50,
    outcome,
  };
  return {
    ...unsigned,
    scopeDigest: computePathwayCommercialScopeDigest(unsigned),
  };
}

function binding(
  outcome: "PROCEED" | "MERIT_ASSESSED" = "PROCEED",
): PathwayCommercialBindingEvaluation {
  return {
    bindingVersion: "byron-ru2-shed-commercial-binding.v1",
    productionCheckoutEnabled: false,
    freePathwayCheckEligible: true,
    planningControlsPackEligible: true,
    submissionSeeEligible: outcome === "MERIT_ASSESSED",
    blockers: [],
    exactScope: exactScope(outcome),
  };
}

describe("persisted Item 74H commercial binding", () => {
  it("attaches and reads a verified exact binding", () => {
    const commercialBinding = binding();
    const persisted = attachPersistedPathwayCommercialBinding(
      { decision: "PROCEED" },
      commercialBinding,
    );
    expect(readPersistedPathwayCommercialBinding(persisted)).toEqual(
      commercialBinding,
    );
    expect(
      commercialBindingReplayMatches(persisted, commercialBinding),
    ).toBe(true);
  });

  it("accepts matching PROCEED and MERIT bindings", () => {
    for (const outcome of ["PROCEED", "MERIT_ASSESSED"] as const) {
      const commercialBinding = binding(outcome);
      const decision =
        outcome === "MERIT_ASSESSED" ? "MERIT_ASSESSMENT" : "PROCEED";
      const result = evaluatePathwayCommercialBindingPersistence({
        result: { decision },
        binding: commercialBinding,
        scopeKey: commercialBinding.exactScope!.scopeDigest,
        evidenceDigest: EVIDENCE,
        decision,
      });
      expect(result.allowed).toBe(true);
    }
  });

  it("rejects a tampered scope digest", () => {
    const commercialBinding = binding();
    commercialBinding.exactScope!.scopeDigest = "f".repeat(64);
    const persisted = attachPersistedPathwayCommercialBinding(
      { decision: "PROCEED" },
      commercialBinding,
    );
    expect(readPersistedPathwayCommercialBinding(persisted)).toBeNull();
    const result = evaluatePathwayCommercialBindingPersistence({
      result: { decision: "PROCEED" },
      binding: commercialBinding,
      scopeKey: commercialBinding.exactScope!.scopeDigest,
      evidenceDigest: EVIDENCE,
      decision: "PROCEED",
    });
    expect(result.blockers).toContain("INVALID_SCOPE_DIGEST");
  });

  it("rejects scope, evidence and decision mismatches", () => {
    const commercialBinding = binding("MERIT_ASSESSED");
    const result = evaluatePathwayCommercialBindingPersistence({
      result: { decision: "PROCEED" },
      binding: commercialBinding,
      scopeKey: "wrong",
      evidenceDigest: "wrong",
      decision: "PROCEED",
    });
    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain("SCOPE_KEY_MISMATCH");
    expect(result.blockers).toContain("EVIDENCE_DIGEST_MISMATCH");
    expect(result.blockers).toContain("DECISION_MISMATCH");
  });

  it("allows an assessment without a paid binding but cannot read one", () => {
    const result = { decision: "MORE_EVIDENCE_REQUIRED" };
    const evaluation = evaluatePathwayCommercialBindingPersistence({
      result,
      binding: null,
      scopeKey: "free-scope",
      evidenceDigest: "free-evidence",
      decision: "MORE_EVIDENCE_REQUIRED",
    });
    expect(evaluation.allowed).toBe(true);
    expect(attachPersistedPathwayCommercialBinding(result, null)).toBe(
      result,
    );
    expect(readPersistedPathwayCommercialBinding(result)).toBeNull();
    expect(commercialBindingReplayMatches(result, null)).toBe(true);
  });
});
