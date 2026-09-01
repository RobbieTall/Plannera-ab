import { describe, expect, it } from "vitest";

import {
  attachPersistedPathwayProgressiveCommercialBinding,
  createPathwayProgressiveCommercialBinding,
  evaluatePathwayProgressiveBindingPersistence,
  evaluateWorkingPathwayArtefactPolicy,
  progressiveBindingReplayMatches,
  readPersistedPathwayProgressiveCommercialBinding,
  type PathwayProgressiveCommercialStage,
} from "./pathway-progressive-commercial-binding";

const evidenceDigest = "a".repeat(64);
const binding = () =>
  createPathwayProgressiveCommercialBinding({
    scopeKey: "byron-public-case",
    siteEvidenceDigest: evidenceDigest,
    pathwayDecision: "MERIT_ASSESSMENT",
    evidenceStatus: "MORE_EVIDENCE_REQUIRED",
    confirmedControlKeys: ["dcp-other-road-setback", "lep-farm-building-permission"],
    outstandingEvidence: [
      "LEGAL_ROAD_SETBACK_M",
      "LOT_AREA_RECONCILIATION",
      "REGISTERED_CADASTRAL_PLAN",
    ],
  });

function payload(stage: PathwayProgressiveCommercialStage) {
  const current = binding();
  return {
    productCode:
      stage === "PLANNING_CONTROLS_PACK_WORKING"
        ? "PLANNING_CONTROLS_PACK"
        : "SUBMISSION_SEE",
    priceAudCents:
      stage === "PLANNING_CONTROLS_PACK_WORKING" ? 4900 : 74900,
    readiness:
      stage === "PLANNING_CONTROLS_PACK_WORKING"
        ? "WORKING_CONTROLS_PACK"
        : "WORKING_SEE",
    submissionReady: false,
    finalSubmissionEligible: false,
    scopeDigest: current.scopeDigest,
    outstandingEvidence: current.outstandingEvidence,
  };
}

const assessment = {
  trustLevel: "SITE_CONFIRMED",
  isCurrent: true,
  evidenceCurrent: true,
  controlsCurrent: true,
  fixtureEvidence: false,
};

describe("Item 74H progressive commercial binding", () => {
  it("persists and replays a deterministic working-product scope", () => {
    const current = binding();
    const result = attachPersistedPathwayProgressiveCommercialBinding(
      { decision: "MORE_EVIDENCE_REQUIRED" },
      current,
    );
    expect(readPersistedPathwayProgressiveCommercialBinding(result)).toEqual(
      current,
    );
    expect(progressiveBindingReplayMatches(result, current)).toBe(true);
    expect(
      evaluatePathwayProgressiveBindingPersistence({
        result: { decision: "MORE_EVIDENCE_REQUIRED" },
        binding: current,
        scopeKey: current.scopeKey,
        evidenceDigest,
        decision: "MORE_EVIDENCE_REQUIRED",
      }),
    ).toEqual({ allowed: true, blockers: [] });
  });

  it.each([
    "PLANNING_CONTROLS_PACK_WORKING",
    "SUBMISSION_SEE_WORKING",
  ] as const)("allows a truthful %s artefact", (commercialStage) => {
    const current = binding();
    expect(
      evaluateWorkingPathwayArtefactPolicy({
        commercialStage,
        scopeKey: current.scopeKey,
        evidenceDigest,
        progressiveBinding: current,
        artefactPayload: payload(commercialStage),
        assessment,
      }),
    ).toEqual({ allowed: true, blockers: [] });
  });

  it("blocks scope tampering, weak trust, fixtures and false final readiness", () => {
    const current = binding();
    const unsafePayload = {
      ...payload("SUBMISSION_SEE_WORKING"),
      submissionReady: true,
      finalSubmissionEligible: true,
    };
    const result = evaluateWorkingPathwayArtefactPolicy({
      commercialStage: "SUBMISSION_SEE_WORKING",
      scopeKey: "wrong-scope",
      evidenceDigest,
      progressiveBinding: current,
      artefactPayload: unsafePayload,
      assessment: {
        ...assessment,
        trustLevel: "GENERAL_GUIDANCE",
        fixtureEvidence: true,
      },
    });
    expect(result.allowed).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "SCOPE_KEY_MISMATCH",
        "FINAL_READINESS_CLAIMED",
        "INSUFFICIENT_STAGE_TRUST",
        "FIXTURE_EVIDENCE",
      ]),
    );
  });

  it("rejects a confirmed state that still carries unresolved evidence", () => {
    expect(() =>
      createPathwayProgressiveCommercialBinding({
        scopeKey: "byron-public-case",
        siteEvidenceDigest: evidenceDigest,
        pathwayDecision: "PROCEED",
        evidenceStatus: "CONFIRMED",
        confirmedControlKeys: ["lep"],
        outstandingEvidence: ["SURVEY"],
      }),
    ).toThrow("Confirmed evidence cannot retain outstanding items");
  });
});
