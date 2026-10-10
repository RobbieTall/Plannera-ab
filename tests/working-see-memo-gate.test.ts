import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getWorkingSeeMemoGate } from "../src/lib/working-see-memo-gate";
import { selectCurrentWorkspaceDetailedPlanningPackArtefact } from "../src/lib/detailed-planning-pack-selector";
import type { WorkspaceArtefact } from "../src/types/workspace";

const input = {
  hasConfirmedSite: true,
  workingSeeGenerationEnabled: true,
  hasProposalBriefMismatch: false,
  hasQualityDetailedPlanningPack: false,
  sourceDetailedPlanningPackArtefactId: "current-pack",
  expectedProposalBrief: "Proposed alterations",
};

for (const council of ["BYRON", "KEMPSEY"]) {
  test(`${council}: current unresolved pack can start a working memo without changing readiness`, () => {
    const pack = {
      id: "current-pack", title: "Saved pack", owner: "You", updatedAt: "Just now",
      type: "detailed_planning_pack", isCurrentSite: true,
      detailedPlanningPack: {
        packType: "detailed_planning_pack", generatedAt: "2026-10-04T00:00:00Z",
        projectId: `synthetic-${council}`, site: { lgaCode: council },
        proposalBrief: input.expectedProposalBrief,
        sourceQuickSiteCheck: { artefactId: "exact-qsc" },
        commercialReady: false, unresolvedTopics: ["Survey and setbacks require review"],
      },
    } as WorkspaceArtefact;
    const original = JSON.stringify(pack);
    const older = {
      ...pack, id: "older-ready-pack",
      detailedPlanningPack: { ...pack.detailedPlanningPack!, generatedAt: "2026-10-03T00:00:00Z", commercialReady: true, unresolvedTopics: [] },
    };
    const selected = selectCurrentWorkspaceDetailedPlanningPackArtefact([older, pack], input.expectedProposalBrief);
    assert.equal(selected?.id, pack.id);
    assert.equal(getWorkingSeeMemoGate({
      ...input, sourceDetailedPlanningPackArtefactId: selected?.id,
      expectedProposalBrief: selected?.detailedPlanningPack?.proposalBrief,
      hasQualityDetailedPlanningPack: selected?.detailedPlanningPack?.commercialReady === true,
    }).allowed, true);
    assert.equal(JSON.stringify(pack), original);
    assert.equal(selected?.detailedPlanningPack?.commercialReady, false);
  });
}

test("unresolved packs stay unavailable when the working-generation feature is disabled", () => {
  assert.equal(getWorkingSeeMemoGate({ ...input, workingSeeGenerationEnabled: false }).allowed, false);
});

test("existing resolved-pack memo path remains available without enabling the working feature", () => {
  assert.equal(getWorkingSeeMemoGate({ ...input, workingSeeGenerationEnabled: false, hasQualityDetailedPlanningPack: true }).allowed, true);
});

test("an unconfirmed site never enables a working memo", () => {
  assert.equal(getWorkingSeeMemoGate({ ...input, hasConfirmedSite: false }).allowed, false);
});

test("a mismatched proposal blocks both resolved and unresolved packs", () => {
  for (const hasQualityDetailedPlanningPack of [true, false]) {
    assert.equal(getWorkingSeeMemoGate({ ...input, hasQualityDetailedPlanningPack, hasProposalBriefMismatch: true }).allowed, false);
  }
});

test("missing or blank exact source pack and proposal fail closed", () => {
  for (const missing of [undefined, "", "   "]) {
    assert.equal(getWorkingSeeMemoGate({ ...input, sourceDetailedPlanningPackArtefactId: missing }).allowed, false);
    assert.equal(getWorkingSeeMemoGate({ ...input, expectedProposalBrief: missing }).allowed, false);
  }
});

test("stale-site and wrong-proposal packs cannot supply the working memo binding", () => {
  for (const values of [
    { isCurrentSite: false, proposalBrief: input.expectedProposalBrief },
    { isCurrentSite: true, proposalBrief: "Different proposal" },
  ]) {
    const selected = selectCurrentWorkspaceDetailedPlanningPackArtefact([{
      id: "unrelated-pack", type: "detailed_planning_pack", isCurrentSite: values.isCurrentSite,
      detailedPlanningPack: { packType: "detailed_planning_pack", proposalBrief: values.proposalBrief },
    } as WorkspaceArtefact], input.expectedProposalBrief);
    const gate = getWorkingSeeMemoGate({ ...input, sourceDetailedPlanningPackArtefactId: selected?.id });
    assert.equal(selected, undefined);
    assert.equal(gate.allowed, false);
  }
});

test("workspace button and authenticated click handler both use the working memo gate", () => {
  // Wiring contract, not a claim of hosted browser acceptance.
  const source = readFileSync(new URL("../src/components/projects/project-workspace.tsx", import.meta.url), "utf8");
  const handler = source.split("const handleGeneratePreSeeMemo = useCallback(")[1]?.split("  useEffect(")[0];
  assert.ok(handler);
  assert.match(handler, /if \(!isAuthenticated\)/);
  assert.match(handler, /getExactWorkspaceDppBinding\(commercialPackGateRef.current\)/);
  assert.match(handler, /getWorkingSeeMemoGate\(\{/);
  assert.match(handler, /hasConfirmedSite: Boolean\(siteContext\)/);
  assert.match(handler, /if \(!gate.allowed\)/);
  assert.doesNotMatch(handler, /if \(!commercialPackGateRef.current.hasQualityDetailedPlanningPack\)/);
  assert.match(source, /disabled=\{isGeneratingSee \|\| !workingSeeMemoGate.allowed\}/);
  assert.match(source, /const workingSeeMemoGate = getWorkingSeeMemoGate\(\{/);
  assert.match(source, /sourceMemoArtefactId=\{latestSeeArtefact\?\.id\}/);
  assert.match(source, /This is not submission-ready\./);
  assert.match(source, /const hasQualityDetailedPlanningPack = latestDetailedPlanningPack\?\.commercialReady === true/);
});
