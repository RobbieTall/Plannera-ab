import { describe, expect, it } from "vitest";

import type { PathwayCommercialBindingEvaluation } from "./pathway-commercial-binding";
import { evaluatePaidArtefactBindingPolicy } from "./pathway-paid-artefact-policy";

const DIGEST = "a".repeat(64);
const SCOPE = "b".repeat(64);

function binding(
  outcome: "PROCEED" | "MERIT_ASSESSED" = "PROCEED",
): PathwayCommercialBindingEvaluation {
  return {
    bindingVersion: "byron-ru2-shed-commercial-binding.v1",
    productionCheckoutEnabled: false,
    freePathwayCheckEligible: true,
    planningControlsPackEligible: true,
    submissionSeeEligible: true,
    blockers: [],
    exactScope: {
      bindingVersion: "byron-ru2-shed-commercial-binding.v1",
      scopeDigest: SCOPE,
      siteEvidenceDigest: DIGEST,
      controlId: "byron-dcp-2014-d2-rural-road-setbacks.v1",
      roadCategory: "CLASSIFIED_ROAD",
      minimumRoadSetbackMetres: 55,
      proposedRoadSetbackMetres:
        outcome === "PROCEED" ? 55 : 50,
      outcome,
    },
  };
}

function input(
  overrides: Record<string, unknown> = {},
) {
  return {
    commercialStage: "PLANNING_CONTROLS_PACK" as const,
    scopeKey: SCOPE,
    evidenceDigest: DIGEST,
    commercialBinding: binding(),
    assessment: {
      decision: "PROCEED",
      trustLevel: "EVIDENCE_VERIFIED",
      isCurrent: true,
      evidenceCurrent: true,
      controlsCurrent: true,
      fixtureEvidence: false,
    },
    ...overrides,
  };
}

describe("evaluatePaidArtefactBindingPolicy", () => {
  it("allows a current evidence-verified exact PROCEED pack binding", () => {
    const result = evaluatePaidArtefactBindingPolicy(input());

    expect(result.allowed).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("allows operator-approved MERIT_ASSESSED submission binding", () => {
    const result = evaluatePaidArtefactBindingPolicy(
      input({
        commercialStage: "SUBMISSION_SEE",
        commercialBinding: binding("MERIT_ASSESSED"),
        assessment: {
          decision: "MERIT_ASSESSMENT",
          trustLevel: "OPERATOR_APPROVED",
          isCurrent: true,
          evidenceCurrent: true,
          controlsCurrent: true,
          fixtureEvidence: false,
        },
      }),
    );

    expect(result.allowed).toBe(true);
  });

  it("requires operator trust for a submission SEE", () => {
    const result = evaluatePaidArtefactBindingPolicy(
      input({ commercialStage: "SUBMISSION_SEE" }),
    );

    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain("INSUFFICIENT_STAGE_TRUST");
  });

  it("blocks a missing exact commercial binding", () => {
    const result = evaluatePaidArtefactBindingPolicy(
      input({ commercialBinding: null }),
    );

    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain("COMMERCIAL_BINDING_REQUIRED");
    expect(result.blockers).toContain("EXACT_SCOPE_REQUIRED");
  });

  it("blocks scope and evidence digest mismatches", () => {
    const result = evaluatePaidArtefactBindingPolicy(
      input({ scopeKey: "wrong", evidenceDigest: "wrong" }),
    );

    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain("EXACT_SCOPE_KEY_MISMATCH");
    expect(result.blockers).toContain("EVIDENCE_DIGEST_MISMATCH");
  });

  it("blocks an assessment outcome that differs from the exact scope", () => {
    const result = evaluatePaidArtefactBindingPolicy(
      input({
        commercialBinding: binding("MERIT_ASSESSED"),
      }),
    );

    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain("ASSESSMENT_OUTCOME_MISMATCH");
  });

  it("blocks stale evidence or controls", () => {
    const result = evaluatePaidArtefactBindingPolicy(
      input({
        assessment: {
          decision: "PROCEED",
          trustLevel: "EVIDENCE_VERIFIED",
          isCurrent: true,
          evidenceCurrent: false,
          controlsCurrent: false,
          fixtureEvidence: false,
        },
      }),
    );

    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain("EVIDENCE_NOT_CURRENT");
    expect(result.blockers).toContain("CONTROLS_NOT_CURRENT");
  });

  it("blocks fixture evidence even when trust and exact scope otherwise pass", () => {
    const result = evaluatePaidArtefactBindingPolicy(
      input({
        assessment: {
          decision: "PROCEED",
          trustLevel: "OPERATOR_APPROVED",
          isCurrent: true,
          evidenceCurrent: true,
          controlsCurrent: true,
          fixtureEvidence: true,
        },
      }),
    );

    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain("FIXTURE_EVIDENCE");
  });

  it("blocks replay when the commercial stage is no longer eligible", () => {
    const noLongerEligible = binding();
    noLongerEligible.planningControlsPackEligible = false;

    const result = evaluatePaidArtefactBindingPolicy(
      input({ commercialBinding: noLongerEligible }),
    );

    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain("COMMERCIAL_STAGE_INELIGIBLE");
  });
});
