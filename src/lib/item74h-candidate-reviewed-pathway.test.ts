import { describe, expect, it } from "vitest";

import {
  attachPersistedPathwayProgressiveCommercialBinding,
  progressiveBindingReplayMatches,
} from "./pathway-progressive-commercial-binding";
import {
  buildItem74hCandidateReviewedPathwayProof,
  ITEM74H_CANDIDATE_REVIEWED_EVIDENCE,
  type Item74hCandidateReviewedPathwayProof,
  verifyItem74hCandidateReviewedPathwayProof,
} from "./item74h-candidate-reviewed-pathway";

describe("Item 74H candidate reviewed pathway", () => {
  it("binds the official Byron case and reviewed evidence without PII", () => {
    const proof = buildItem74hCandidateReviewedPathwayProof();

    expect(proof.manifest.site).toMatchObject({
      address: "33 Lorikeet Lane, Mullumbimby NSW 2482",
      lot: 138,
      depositedPlan: "DP1265934",
      planning: {
        lepPco: "2014-297",
        parcelZones: ["C2", "R2"],
      },
    });
    expect(proof.manifest.proposal).toMatchObject({
      councilApplication: "10.2026.223.1",
      councilStatus: "APPROVED",
      councilDeterminationDate: "2026-07-14",
      approvedPlanAreaSquareMetres: 24,
      approvedPlanSouthernBoundaryDimensionMetres: 1.625,
      proposalZone: null,
      heightMetres: null,
    });
    expect(proof.manifest.sourceDocuments.map((document) => document.record)).toEqual([
      "E2026/47502",
      "E2026/47506",
      "E2026/47509",
      "E2026/80895",
    ]);
    const serialized = JSON.stringify(ITEM74H_CANDIDATE_REVIEWED_EVIDENCE);
    expect(serialized).not.toContain("@");
    expect(serialized.toLowerCase()).not.toContain("applicant");
    expect(verifyItem74hCandidateReviewedPathwayProof(proof)).toBe(true);
  });

  it("contains deterministic STOP, PROCEED, MERIT and MORE_EVIDENCE branches", () => {
    const proof = buildItem74hCandidateReviewedPathwayProof();
    const decisions = new Set(
      proof.gates.flatMap((gate) => [
        gate.outcome,
        ...gate.branches.map((branch) => branch.decision),
      ]),
    );

    expect(decisions).toEqual(
      new Set(["STOP", "PROCEED", "MERIT", "MORE_EVIDENCE"]),
    );
    expect(proof.customerDecision).toBe("MORE_EVIDENCE_REQUIRED");
    expect(proof.gates.find((gate) => gate.gate === "03")?.outcome).toBe(
      "MORE_EVIDENCE",
    );
    expect(proof.gates.find((gate) => gate.gate === "04")?.outcome).toBe(
      "MORE_EVIDENCE",
    );
  });

  it("allows exact-scope working A$49 and A$749 products with checkout off", () => {
    const proof = buildItem74hCandidateReviewedPathwayProof();

    expect(proof.workingProducts.planningControlsPack.policy).toEqual({
      allowed: true,
      blockers: [],
    });
    expect(proof.workingProducts.submissionSee.policy).toEqual({
      allowed: true,
      blockers: [],
    });
    expect(proof.workingProducts.planningControlsPack.payload).toMatchObject({
      productCode: "PLANNING_CONTROLS_PACK",
      priceAudCents: 4900,
      readiness: "WORKING_CONTROLS_PACK",
      submissionReady: false,
      finalSubmissionEligible: false,
    });
    expect(proof.workingProducts.submissionSee.payload).toMatchObject({
      productCode: "SUBMISSION_SEE",
      priceAudCents: 74900,
      readiness: "WORKING_SEE",
      submissionReady: false,
      finalSubmissionEligible: false,
    });
    expect(proof.presentation.planningControlsPack.checkoutEnabled).toBe(false);
    expect(proof.presentation.submissionSee.checkoutEnabled).toBe(false);
    expect(proof.upgradeMessage).toContain("same purchased project");
    expect(proof.upgradeMessage).toContain("A$49");
    expect(proof.upgradeMessage).toContain("A$749");
  });

  it("persists and replays the exact evidence scope", () => {
    const first = buildItem74hCandidateReviewedPathwayProof();
    const replay = buildItem74hCandidateReviewedPathwayProof();
    const persisted = attachPersistedPathwayProgressiveCommercialBinding(
      { decision: first.customerDecision },
      first.binding,
    );

    expect(replay.evidenceDigest).toBe(first.evidenceDigest);
    expect(replay.binding.scopeDigest).toBe(first.binding.scopeDigest);
    expect(progressiveBindingReplayMatches(persisted, replay.binding)).toBe(true);
  });

  it("rejects false final readiness while material evidence remains unresolved", () => {
    const proof = buildItem74hCandidateReviewedPathwayProof();
    const falselyFinal = {
      ...proof,
      customerDecision: "PROCEED",
      finalSubmissionEligible: true,
      presentation: {
        ...proof.presentation,
        submissionReady: true,
      },
    } as unknown as Item74hCandidateReviewedPathwayProof;

    expect(verifyItem74hCandidateReviewedPathwayProof(falselyFinal)).toBe(false);
    expect(proof.binding.outstandingEvidence).toEqual(
      expect.arrayContaining([
        "PROPOSAL_FOOTPRINT_ZONE_OVERLAY",
        "REGISTERED_BOUNDARY_OR_SET_OUT_CONFIRMATION",
        "STAMPED_PLAN_PAGE_2_HEIGHT_AND_ELEVATIONS",
        "DETERMINATION_CONDITIONS_OPERATOR_REVIEW",
      ]),
    );
  });
});
