import assert from "node:assert/strict";
import test from "node:test";

import {
  hasCurrentSiteDetailedPlanningPackProposalMismatch,
  selectCurrentSiteDetailedPlanningPackArtefact,
} from "../src/lib/detailed-planning-pack-selector";
import type { DetailedPlanningPackContent, WorkspaceArtefact } from "../src/types/workspace";

const pack = (commercialReady: boolean, generatedAt = "2026-07-15T00:00:00Z"): DetailedPlanningPackContent => ({
  packType: "detailed_planning_pack",
  generatedAt,
  projectId: "project-1",
  site: { address: "45 Broken Head Road, Byron Bay NSW 2481", lga: "Byron Shire", lgaCode: "BYRON", zoneCode: "SP3", zoneName: "Tourist", zoneLabel: "SP3 – Tourist" },
  proposalBrief: "Tourist accommodation alterations",
  sourceQuickSiteCheck: { artefactId: "qsc-1", title: "Quick Site Check", generatedAt: "2026-07-15T00:00:00Z", lepEvidenceSummary: null },
  carriedLepEvidenceSummary: null,
  dcpEvidence: [],
  topicMatrix: [],
  unresolvedTopics: commercialReady ? [] : ["Setbacks"],
  consultantReviewQuestions: [],
  nextAction: "Review before SEE/referral.",
  commercialReady,
});

const artefact = (id: string, isCurrentSite: boolean | undefined, commercialReady: boolean, generatedAt?: string): WorkspaceArtefact => ({
  id,
  title: id,
  owner: "You",
  updatedAt: "Just now",
  type: "detailed_planning_pack",
  detailedPlanningPack: pack(commercialReady, generatedAt),
  isCurrentSite,
});

test("selectCurrentSiteDetailedPlanningPackArtefact ignores stale different-site packs", () => {
  const selected = selectCurrentSiteDetailedPlanningPackArtefact([
    artefact("stale-quality-pack", false, true),
    artefact("current-unresolved-pack", true, false),
  ]);

  assert.equal(selected?.id, "current-unresolved-pack");
  assert.equal(selected?.detailedPlanningPack?.commercialReady, false);
});

test("selectCurrentSiteDetailedPlanningPackArtefact returns undefined when only stale packs exist", () => {
  const selected = selectCurrentSiteDetailedPlanningPackArtefact([
    artefact("stale-quality-pack", false, true),
  ]);

  assert.equal(selected, undefined);
});


test("selectCurrentSiteDetailedPlanningPackArtefact picks the newest current-site pack by generatedAt", () => {
  const input = [
    artefact("server-older-pack", true, true, "2026-07-15T00:00:00Z"),
    artefact("local-regenerated-newer-pack", true, true, "2026-07-15T00:05:00Z"),
  ];

  const selected = selectCurrentSiteDetailedPlanningPackArtefact(input);

  assert.equal(selected?.id, "local-regenerated-newer-pack");
  assert.deepEqual(input.map((item) => item.id), ["server-older-pack", "local-regenerated-newer-pack"]);
});

test("selectCurrentSiteDetailedPlanningPackArtefact ignores packs generated for a different proposed-works brief", () => {
  const selected = selectCurrentSiteDetailedPlanningPackArtefact([
    { ...artefact("newer-different-proposal", true, true, "2026-07-15T00:10:00Z"), detailedPlanningPack: { ...pack(true, "2026-07-15T00:10:00Z"), proposalBrief: "Change of use to a neighbourhood shop" } },
    { ...artefact("older-current-proposal", true, true, "2026-07-15T00:00:00Z"), detailedPlanningPack: pack(true, "2026-07-15T00:00:00Z") },
  ], { proposalBrief: " Tourist   accommodation alterations " });

  assert.equal(selected?.id, "older-current-proposal");
  assert.equal(hasCurrentSiteDetailedPlanningPackProposalMismatch([
    { ...artefact("newer-different-proposal", true, true, "2026-07-15T00:10:00Z"), detailedPlanningPack: { ...pack(true, "2026-07-15T00:10:00Z"), proposalBrief: "Change of use to a neighbourhood shop" } },
    { ...artefact("older-current-proposal", true, true, "2026-07-15T00:00:00Z"), detailedPlanningPack: pack(true, "2026-07-15T00:00:00Z") },
  ], " Tourist   accommodation alterations "), false);
});

test("proposal mismatch is false for a matching unresolved pack so expert review can use it", () => {
  const selected = selectCurrentSiteDetailedPlanningPackArtefact([
    { ...artefact("newer-different-ready-proposal", true, true, "2026-07-15T00:10:00Z"), detailedPlanningPack: { ...pack(true, "2026-07-15T00:10:00Z"), proposalBrief: "Change of use to a neighbourhood shop" } },
    { ...artefact("older-current-unresolved-proposal", true, false, "2026-07-15T00:00:00Z"), detailedPlanningPack: pack(false, "2026-07-15T00:00:00Z") },
  ], { proposalBrief: "Tourist accommodation alterations" });

  assert.equal(selected?.id, "older-current-unresolved-proposal");
  assert.equal(selected?.detailedPlanningPack?.commercialReady, false);
  assert.equal(hasCurrentSiteDetailedPlanningPackProposalMismatch([
    { ...artefact("newer-different-ready-proposal", true, true, "2026-07-15T00:10:00Z"), detailedPlanningPack: { ...pack(true, "2026-07-15T00:10:00Z"), proposalBrief: "Change of use to a neighbourhood shop" } },
    { ...artefact("older-current-unresolved-proposal", true, false, "2026-07-15T00:00:00Z"), detailedPlanningPack: pack(false, "2026-07-15T00:00:00Z") },
  ], "Tourist accommodation alterations"), false);
});

test("selectCurrentSiteDetailedPlanningPackArtefact returns undefined when only current-site packs are proposal-stale", () => {
  const selected = selectCurrentSiteDetailedPlanningPackArtefact([
    artefact("current-site-old-proposal", true, true),
  ], { proposalBrief: "Change of use to a neighbourhood shop" });

  assert.equal(selected, undefined);
  assert.equal(hasCurrentSiteDetailedPlanningPackProposalMismatch([
    artefact("current-site-old-proposal", true, true),
  ], "Change of use to a neighbourhood shop"), true);
});

test("selectCurrentSiteDetailedPlanningPackArtefact uses deterministic id fallback for equal or invalid timestamps", () => {
  const selected = selectCurrentSiteDetailedPlanningPackArtefact([
    artefact("pack-a", true, true, "not-a-date"),
    artefact("pack-b", true, true, "also-not-a-date"),
  ]);

  assert.equal(selected?.id, "pack-b");
});

const withProposal = (id: string, proposalBrief: string, generatedAt: string, qscId = "qsc-1") => ({
  ...artefact(id, true, true, generatedAt),
  detailedPlanningPack: { ...pack(true, generatedAt), proposalBrief, sourceQuickSiteCheck: { ...pack(true, generatedAt).sourceQuickSiteCheck, artefactId: qscId } },
});

const seeArtefact = (id: string, dppId: string | undefined, proposal: string, qscId: string, generatedAt: string): WorkspaceArtefact => ({
  id,
  title: id,
  owner: "You",
  updatedAt: "Just now",
  type: "report",
  preSeeMemo: {
    memoType: "pre_see_planning_memo",
    generatedAt,
    projectId: "project-1",
    siteDescription: { address: "45 Broken Head Road, Byron Bay NSW 2481", lga: "Byron Shire", zoneCode: "SP3", zoneName: "Tourist", zoneLabel: "SP3 – Tourist" },
    proposedWorksSummary: proposal,
    applicableControls: { lepInstrument: null, permissibility: null, quickSiteControls: {}, dcpClauses: [], sourceExcerpts: [] },
    consistencyAssessment: [],
    limitations: [],
    sourceDetailedPlanningPack: dppId ? { artefactId: dppId, title: "DPP", generatedAt, commercialReady: true, sourceQuickSiteCheckArtefactId: qscId } : undefined,
  },
});

const reviewArtefact = (id: string, dppId: string, proposal: string, qscId: string, commercialReady: boolean, generatedAt: string, seeDppId?: string | null): WorkspaceArtefact => ({
  id,
  title: id,
  owner: "You",
  updatedAt: "Just now",
  type: "review_request",
  reviewRequest: {
    requestType: "expert_review_request",
    generatedAt,
    projectId: "project-1",
    site: { address: "45 Broken Head Road, Byron Bay NSW 2481", lga: "Byron Shire", zoneLabel: "SP3 – Tourist" },
    packageSummary: "Review package",
    includedArtefacts: [],
    citedSources: [],
    confidenceGaps: [],
    missingInputs: [],
    assumptions: [],
    recommendedReviewScope: [],
    detailedPlanningPack: { artefactId: dppId, title: "DPP", generatedAt, proposalBrief: proposal, commercialReady, topicMatrix: [], unresolvedTopics: [], sourceQuickSiteCheckArtefactId: qscId },
    sourceSeeMemo: seeDppId === undefined ? null : { artefactId: "see", title: "SEE", generatedAt, sourceDetailedPlanningPackArtefactId: seeDppId },
  },
});

test("strict workspace DPP selection fails closed for an empty proposal brief", async () => {
  const { selectCurrentWorkspaceDetailedPlanningPackArtefact } = await import("../src/lib/detailed-planning-pack-selector");
  const selected = selectCurrentWorkspaceDetailedPlanningPackArtefact([withProposal("dpp-a", "Proposal A", "2026-07-15T00:00:00Z")], "   ");
  assert.equal(selected, undefined);
});

test("exact SEE selection ignores older proposal outputs on the same site and QSC", async () => {
  const { selectExactSeeArtefactForDetailedPlanningPack } = await import("../src/lib/detailed-planning-pack-selector");
  const dppA = withProposal("dpp-a", "Proposal A", "2026-07-15T00:00:00Z");
  const dppB = withProposal("dpp-b", "Proposal B", "2026-07-15T00:05:00Z");
  const selectedForB = selectExactSeeArtefactForDetailedPlanningPack([
    seeArtefact("newer-a-see", "dpp-a", "Proposal A", "qsc-1", "2026-07-15T00:30:00Z"),
    seeArtefact("legacy-forged-see", undefined, "Proposal B", "qsc-1", "2026-07-15T00:40:00Z"),
    seeArtefact("exact-b-see", "dpp-b", " Proposal   B ", "qsc-1", "2026-07-15T00:20:00Z"),
  ], dppB);
  const selectedForA = selectExactSeeArtefactForDetailedPlanningPack([
    seeArtefact("newer-a-see", "dpp-a", "Proposal A", "qsc-1", "2026-07-15T00:30:00Z"),
    seeArtefact("exact-b-see", "dpp-b", "Proposal B", "qsc-1", "2026-07-15T00:20:00Z"),
  ], dppA);

  assert.equal(selectedForB?.id, "exact-b-see");
  assert.equal(selectedForA?.id, "newer-a-see");
});

test("exact review selection accepts unresolved exact referrals and rejects stale SEE provenance", async () => {
  const { selectExactReviewRequestArtefactForDetailedPlanningPack } = await import("../src/lib/detailed-planning-pack-selector");
  const dppB = { ...withProposal("dpp-b", "Proposal B", "2026-07-15T00:05:00Z"), detailedPlanningPack: { ...pack(false, "2026-07-15T00:05:00Z"), proposalBrief: "Proposal B" } };
  const selected = selectExactReviewRequestArtefactForDetailedPlanningPack([
    reviewArtefact("stale-a-review", "dpp-a", "Proposal A", "qsc-1", false, "2026-07-15T00:40:00Z"),
    reviewArtefact("forged-see-review", "dpp-b", "Proposal B", "qsc-1", false, "2026-07-15T00:50:00Z", "dpp-a"),
    reviewArtefact("exact-unresolved-b-review", "dpp-b", " Proposal   B ", "qsc-1", false, "2026-07-15T00:30:00Z"),
  ], dppB);

  assert.equal(selected?.id, "exact-unresolved-b-review");
});

test("review with present source SEE but missing DPP provenance cannot shadow older exact review", async () => {
  const { selectExactReviewRequestArtefactForDetailedPlanningPack } = await import("../src/lib/detailed-planning-pack-selector");
  const dppB = withProposal("dpp-b", "Proposal B", "2026-07-15T00:05:00Z");
  const missingSeeDpp = reviewArtefact("newer-missing-see-dpp", "dpp-b", "Proposal B", "qsc-1", true, "2026-07-15T00:50:00Z", null);
  missingSeeDpp.reviewRequest = {
    ...missingSeeDpp.reviewRequest!,
    sourceSeeMemo: { artefactId: "see-b", title: "SEE", generatedAt: "2026-07-15T00:45:00Z", sourceDetailedPlanningPackArtefactId: null },
  };

  const selected = selectExactReviewRequestArtefactForDetailedPlanningPack([
    reviewArtefact("older-valid-review", "dpp-b", "Proposal B", "qsc-1", true, "2026-07-15T00:20:00Z", "dpp-b"),
    missingSeeDpp,
  ], dppB);

  assert.equal(selected?.id, "older-valid-review");
});

test("unresolved exact review with null source SEE remains valid", async () => {
  const { selectExactReviewRequestArtefactForDetailedPlanningPack } = await import("../src/lib/detailed-planning-pack-selector");
  const dppB = { ...withProposal("dpp-b", "Proposal B", "2026-07-15T00:05:00Z"), detailedPlanningPack: { ...pack(false, "2026-07-15T00:05:00Z"), proposalBrief: "Proposal B" } };
  const selected = selectExactReviewRequestArtefactForDetailedPlanningPack([
    reviewArtefact("unresolved-no-see", "dpp-b", "Proposal B", "qsc-1", false, "2026-07-15T00:20:00Z"),
  ], dppB);

  assert.equal(selected?.id, "unresolved-no-see");
});

test("newer malformed exact-looking SEE and review payloads cannot shadow older valid outputs", async () => {
  const {
    selectExactReviewRequestArtefactForDetailedPlanningPack,
    selectExactSeeArtefactForDetailedPlanningPack,
  } = await import("../src/lib/detailed-planning-pack-selector");
  const dppB = withProposal("dpp-b", "Proposal B", "2026-07-15T00:05:00Z");
  const validSee = seeArtefact("older-valid-see", "dpp-b", "Proposal B", "qsc-1", "2026-07-15T00:20:00Z");
  const malformedSee = seeArtefact("newer-malformed-see", "dpp-b", "Proposal B", "qsc-1", "2026-07-15T00:50:00Z");
  malformedSee.preSeeMemo = { ...malformedSee.preSeeMemo!, memoType: "not_pre_see" as "pre_see_planning_memo" };
  const wrongTypeSee = { ...seeArtefact("newer-wrong-type-see", "dpp-b", "Proposal B", "qsc-1", "2026-07-15T00:55:00Z"), type: "note" as WorkspaceArtefact["type"] };

  const validReview = reviewArtefact("older-valid-review", "dpp-b", "Proposal B", "qsc-1", true, "2026-07-15T00:20:00Z", "dpp-b");
  const malformedReview = reviewArtefact("newer-malformed-review", "dpp-b", "Proposal B", "qsc-1", true, "2026-07-15T00:50:00Z", "dpp-b");
  malformedReview.reviewRequest = { ...malformedReview.reviewRequest!, requestType: "not_review" as "expert_review_request" };
  const wrongTypeReview = { ...reviewArtefact("newer-wrong-type-review", "dpp-b", "Proposal B", "qsc-1", true, "2026-07-15T00:55:00Z", "dpp-b"), type: "note" as WorkspaceArtefact["type"] };

  const seeInput = [validSee, malformedSee, wrongTypeSee];
  const reviewInput = [validReview, malformedReview, wrongTypeReview];
  const selectedSee = selectExactSeeArtefactForDetailedPlanningPack(seeInput, dppB);
  const selectedReview = selectExactReviewRequestArtefactForDetailedPlanningPack(reviewInput, dppB);

  assert.equal(selectedSee?.id, "older-valid-see");
  assert.equal(selectedReview?.id, "older-valid-review");
  assert.deepEqual(seeInput.map((item) => item.id), ["older-valid-see", "newer-malformed-see", "newer-wrong-type-see"]);
  assert.deepEqual(reviewInput.map((item) => item.id), ["older-valid-review", "newer-malformed-review", "newer-wrong-type-review"]);
});

test("exact output selectors use stable id fallback without mutating inputs", async () => {
  const {
    selectExactReviewRequestArtefactForDetailedPlanningPack,
    selectExactSeeArtefactForDetailedPlanningPack,
  } = await import("../src/lib/detailed-planning-pack-selector");
  const dppB = withProposal("dpp-b", "Proposal B", "2026-07-15T00:05:00Z");
  const seeInput = [
    seeArtefact("see-a", "dpp-b", "Proposal B", "qsc-1", "not-a-date"),
    seeArtefact("see-b", "dpp-b", "Proposal B", "qsc-1", "also-not-a-date"),
  ];
  const reviewInput = [
    reviewArtefact("review-a", "dpp-b", "Proposal B", "qsc-1", true, "not-a-date", "dpp-b"),
    reviewArtefact("review-b", "dpp-b", "Proposal B", "qsc-1", true, "also-not-a-date", "dpp-b"),
  ];

  assert.equal(selectExactSeeArtefactForDetailedPlanningPack(seeInput, dppB)?.id, "see-b");
  assert.equal(selectExactReviewRequestArtefactForDetailedPlanningPack(reviewInput, dppB)?.id, "review-b");
  assert.deepEqual(seeInput.map((item) => item.id), ["see-a", "see-b"]);
  assert.deepEqual(reviewInput.map((item) => item.id), ["review-a", "review-b"]);
});

test("workspace proposal hydration decision fails closed unless untouched empty field can hydrate from saved DPP", async () => {
  const { getWorkspaceProposalBriefHydration } = await import("../src/lib/detailed-planning-pack-selector");

  assert.equal(getWorkspaceProposalBriefHydration({
    hasLoadedServerArtefacts: false,
    hasUserEditedProposalBrief: false,
    currentProposalBrief: "",
    newestCurrentSiteSavedProposalBrief: "Saved brief",
  }), null);
  assert.equal(getWorkspaceProposalBriefHydration({
    hasLoadedServerArtefacts: true,
    hasUserEditedProposalBrief: true,
    currentProposalBrief: "",
    newestCurrentSiteSavedProposalBrief: "Saved brief",
  }), null);
  assert.equal(getWorkspaceProposalBriefHydration({
    hasLoadedServerArtefacts: true,
    hasUserEditedProposalBrief: false,
    currentProposalBrief: "Typed brief",
    newestCurrentSiteSavedProposalBrief: "Saved brief",
  }), null);
  assert.equal(getWorkspaceProposalBriefHydration({
    hasLoadedServerArtefacts: true,
    hasUserEditedProposalBrief: false,
    currentProposalBrief: "",
    newestCurrentSiteSavedProposalBrief: "  Saved   brief  ",
  }), "  Saved   brief  ");
});

test("exact workspace DPP binding guard requires both non-empty source DPP ID and expected proposal", async () => {
  const { getExactWorkspaceDppBinding } = await import("../src/lib/detailed-planning-pack-selector");

  assert.equal(getExactWorkspaceDppBinding({ sourceDetailedPlanningPackArtefactId: undefined, expectedProposalBrief: "Proposal" }), null);
  assert.equal(getExactWorkspaceDppBinding({ sourceDetailedPlanningPackArtefactId: "dpp-b", expectedProposalBrief: undefined }), null);
  assert.equal(getExactWorkspaceDppBinding({ sourceDetailedPlanningPackArtefactId: "   ", expectedProposalBrief: "Proposal" }), null);
  assert.equal(getExactWorkspaceDppBinding({ sourceDetailedPlanningPackArtefactId: "dpp-b", expectedProposalBrief: "   " }), null);
  assert.deepEqual(getExactWorkspaceDppBinding({ sourceDetailedPlanningPackArtefactId: " dpp-b ", expectedProposalBrief: " Proposal B " }), {
    sourceDetailedPlanningPackArtefactId: "dpp-b",
    expectedProposalBrief: "Proposal B",
  });
});
