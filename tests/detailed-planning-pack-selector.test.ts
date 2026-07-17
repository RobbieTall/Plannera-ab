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
