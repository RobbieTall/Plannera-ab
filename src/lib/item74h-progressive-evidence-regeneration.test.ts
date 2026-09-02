import { describe, expect, it } from "vitest";

import {
  buildItem74hProgressiveEvidenceRegenerationProof,
  discoverByronDaHistory,
  ITEM74H_BOUNDARY_EVIDENCE_GAP,
  ITEM74H_BYRON_DA_DISCOVERY_INPUT,
  ITEM74H_CONTROL_REPLAY_GAP,
  ITEM74H_PROGRESSIVE_EVIDENCE_EVENTS,
  regenerateItem74hPurchasedProject,
  type Item74hProjectEvidenceEvent,
  verifyItem74hProgressiveEvidenceRegenerationProof,
} from "./item74h-progressive-evidence-regeneration";

describe("Item 74H progressive evidence regeneration", () => {
  it("discovers public DA metadata without copying documents or claiming current law", () => {
    const discovery = discoverByronDaHistory(ITEM74H_BYRON_DA_DISCOVERY_INPUT);

    expect(discovery.applicationNumber).toBe("10.2026.223.1");
    expect(discovery.documents).toHaveLength(5);
    expect(discovery.documents.every((document) => document.automatedCopyPerformed === false)).toBe(true);
    expect(discovery.documents.every((document) => document.customerSelectionRequired)).toBe(true);
    expect(discovery.documents.find((document) => document.kind === "DETERMINATION")).toMatchObject({
      authority: "OFFICIAL_CASE_RECORD",
      currency: "DATED_CASE_EVIDENCE",
      maySupportCurrentLawWithoutReplay: false,
    });
    expect(discovery.documents.find((document) => document.kind === "SUBMITTED_SEE")).toMatchObject({
      authority: "SECONDARY_PUBLIC_RECORD",
      currency: "REQUIRES_REVALIDATION",
      maySupportCurrentLawWithoutReplay: false,
    });
    expect(discovery.automatedServerCopyAllowed).toBe(false);
    expect(discovery.completePropertyHistoryClaimed).toBe(false);
    expect(discovery.currentControlAuthorityClaimed).toBe(false);
  });

  it("regenerates both working products on the same project while pending evidence preserves gates", () => {
    const proof = buildItem74hProgressiveEvidenceRegenerationProof();

    expect(verifyItem74hProgressiveEvidenceRegenerationProof(proof)).toBe(true);
    expect(proof.evidenceDigest).not.toBe(proof.priorEvidenceDigest);
    expect(proof.binding.evidenceStatus).toBe("MORE_EVIDENCE_REQUIRED");
    expect(proof.binding.outstandingEvidence).toEqual(
      expect.arrayContaining([
        ITEM74H_BOUNDARY_EVIDENCE_GAP,
        ITEM74H_CONTROL_REPLAY_GAP,
      ]),
    );
    expect(proof.gates.find((gate) => gate.gate === "04")?.outcome).toBe("MORE_EVIDENCE");
    expect(proof.workingProducts.planningControlsPack.policy).toEqual({ allowed: true, blockers: [] });
    expect(proof.workingProducts.submissionSee.policy).toEqual({ allowed: true, blockers: [] });
    expect(proof.workingProducts.planningControlsPack.payload.generation).toBe(2);
    expect(proof.workingProducts.submissionSee.payload.generation).toBe(2);
    expect(proof.finalSubmissionEligible).toBe(false);
    expect(proof.productionCheckoutEnabled).toBe(false);
  });

  it("allows only accepted current authoritative evidence to resolve its permitted gate", () => {
    const events: Item74hProjectEvidenceEvent[] = ITEM74H_PROGRESSIVE_EVIDENCE_EVENTS.map((event) => {
      if (event.role === "CADASTRAL_SURVEY") {
        return {
          ...event,
          currency: "CURRENT",
          status: "ACCEPTED",
          reviewedAt: "2026-09-02T03:00:00.000Z",
          storage: { ...event.storage, operatorReviewComplete: true },
          confirmsControlKeys: ["LEGAL_SET_OUT_CONFIRMED_BY_ACCEPTED_CURRENT_SURVEY"],
          resolvesOutstandingEvidence: [ITEM74H_BOUNDARY_EVIDENCE_GAP],
        };
      }
      if (event.role === "CURRENT_CONTROL_REPLAY") {
        return {
          ...event,
          status: "ACCEPTED",
          reviewedAt: "2026-09-02T03:05:00.000Z",
          storage: { ...event.storage, operatorReviewComplete: true },
          confirmsControlKeys: ["FINAL_CURRENT_LEP_DCP_REPLAY_ACCEPTED"],
          resolvesOutstandingEvidence: [ITEM74H_CONTROL_REPLAY_GAP],
        };
      }
      return {
        ...event,
        affectedGates: [...event.affectedGates],
        confirmsControlKeys: [...event.confirmsControlKeys],
        resolvesOutstandingEvidence: [...event.resolvesOutstandingEvidence],
        rejectedClaims: [...event.rejectedClaims],
      };
    });

    const proof = regenerateItem74hPurchasedProject(events);

    expect(proof.binding.evidenceStatus).toBe("CONFIRMED");
    expect(proof.binding.outstandingEvidence).toEqual([]);
    expect(proof.gates.find((gate) => gate.gate === "04")?.outcome).toBe("PROCEED");
    expect(proof.workingProducts.planningControlsPack.policy.allowed).toBe(true);
    expect(proof.workingProducts.submissionSee.policy.allowed).toBe(true);
    expect(proof.workingProducts.submissionSee.payload.submissionReady).toBe(false);
    expect(proof.finalSubmissionEligible).toBe(false);
  });

  it("does not let a conflicting submitted SEE override authoritative controls", () => {
    const proof = buildItem74hProgressiveEvidenceRegenerationProof();
    const submittedSee = proof.evidenceEvents.find(
      (event) => event.role === "PUBLIC_DA_SUBMITTED_SEE",
    );

    expect(submittedSee).toMatchObject({
      authority: "SECONDARY_PUBLIC_RECORD",
      currency: "REQUIRES_REVALIDATION",
      status: "CONFLICT",
      confirmsControlKeys: [],
      resolvesOutstandingEvidence: [],
    });
    expect(submittedSee?.rejectedClaims[0]).toMatchObject({
      suppliedValue: "0.5:1",
      authoritativeValue: "0.4:1",
    });
    expect(proof.binding.confirmedControlKeys).not.toContain("0.5:1");
  });

  it("fails closed for another project or a non-Byron tracker", () => {
    const wrongScope = ITEM74H_PROGRESSIVE_EVIDENCE_EVENTS.map((event, index) =>
      index === 0 ? { ...event, projectScopeKey: "another-project" } : event,
    );
    expect(() => regenerateItem74hPurchasedProject(wrongScope)).toThrow(
      "Evidence event fails project",
    );
    expect(() =>
      discoverByronDaHistory({
        ...ITEM74H_BYRON_DA_DISCOVERY_INPUT,
        trackerUrl:
          "https://example.com/MasterViewUI-External/Application/ApplicationDetails/010.2026.00000223.001/",
      }),
    ).toThrow("allow-listed tracker URL");
  });
});
