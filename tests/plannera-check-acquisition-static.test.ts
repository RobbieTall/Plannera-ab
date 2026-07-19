import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const workspace = readFileSync("src/components/projects/project-workspace.tsx", "utf8");
const page = readFileSync("src/app/projects/(public)/[id]/workspace/page.tsx", "utf8");
const modal = readFileSync("src/components/projects/quick-site-check-modal.tsx", "utf8");

test("focused Check entry is an explicit query contract on the same workspace", () => {
  assert.match(page, /focusedCheck=\{searchParams\?\.check === "1"\}/);
  assert.match(workspace, /focusedCheck\?: boolean/);
  assert.match(workspace, /Plannera Check/);
});

test("focused Check auto-run is gated on confirmed site context and enabled mutations", () => {
  assert.match(workspace, /getFocusedCheckEligibility/);
  assert.match(workspace, /api\/tools\/quick-site-check-lep/);
});

test("focused Check reveal preserves cited and unavailable evidence language", () => {
  assert.match(workspace, /Evidence quality:/);
  assert.match(workspace, /Unavailable/);
  assert.match(workspace, /Zone objectives, permissibility and highlighted clauses/);
  assert.match(modal, /export const buildQuickSiteCheckReportFromResult/);
});

test("focused Check promotion is a single same-project artefact save", () => {
  assert.match(workspace, /Create project in Plannera/);
  assert.match(workspace, /isPromotingCheck \|\| promotedCheck/);
  assert.match(workspace, /quickSiteCheckReportsEquivalent/);
  assert.match(workspace, /!hasLoadedServerArtefacts \|\| isPromotingCheck \|\| promotedCheck/);
  assert.match(workspace, /Loading saved evidence/);
  assert.doesNotMatch(workspace, /Creating project…|Project created/);
  assert.match(workspace, /projectId: projectKey, title, type: "quick_site_check", report/);
  assert.doesNotMatch(workspace, /api\/projects\/ensure[\s\S]*Create project in Plannera/);
});

test("focused Check captures durable proposal intent before promotion", () => {
  assert.match(workspace, /id="focused-development-intent"/);
  assert.match(workspace, /What are you considering\?/);
  assert.match(workspace, /assessQuickSiteCheckDevelopmentIntent/);
  assert.match(workspace, /!focusedDevelopmentIntent\.trim\(\)/);
  assert.match(workspace, /quickSiteCheckReportFromFocusedResult\(projectKey, focusedCheckResult, siteContext\?\.formattedAddress \?\? project\.name, intent\)/);
  assert.match(workspace, /quickSiteCheckIntentForProposal/);
  assert.match(workspace, /newestCurrentSiteSavedProposalBrief: latestAnyProposalDetailedPlanningPack\?\.proposalBrief \?\? savedQuickSiteCheckIntent/);
});

test("ordinary workspace remains available outside focused Check mode", () => {
  assert.match(workspace, /CommercialFunnelNavigator/);
  assert.match(workspace, /focusedCheck \? \(/);
});
