import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const workspace = readFileSync("src/components/projects/project-workspace.tsx", "utf8");

describe("workspace planning path static contract", () => {
  it("renders the four literal stage labels in an accessible planning-path nav", () => {
    for (const label of ["Site", "Quick Site Check", "Detailed Planning Pack", "SEE / consultant handoff"]) {
      assert.ok(workspace.includes(label), `missing ${label}`);
    }
    assert.match(workspace, /aria-label="Planning path"/);
    assert.match(workspace, /aria-current=\{isCurrent \? "step" : undefined\}/);
  });

  it("keeps one primary next action and stage target focus anchors", () => {
    assert.match(workspace, /<CommercialFunnelNavigator/);
    assert.match(workspace, /primaryLabel=\{commercialDominantAction\.label\}/);
    for (const id of ["workspace-site-control", "workspace-qsc-section", "workspace-dpp-section", "workspace-see-section", "workspace-review-section", "proposal-brief"]) {
      assert.match(workspace, new RegExp(id));
    }
    assert.match(workspace, /focusWorkspaceTarget\("proposal-brief"\)/);
  });

  it("routes every commercial primary action to a concrete handler or target", () => {
    for (const action of ["set_site", "run_quick_site_check", "generate_detailed_pack", "generate_see", "export_or_review"]) {
      assert.match(workspace, new RegExp(`primaryAction === \"${action}\"`));
    }
    assert.match(workspace, /kind === "expert_review"/);
    assert.match(workspace, /handleRequestExpertReview\(\)/);
    assert.match(workspace, /focusWorkspaceTarget\("workspace-see-section"\)/);
    assert.doesNotMatch(workspace, /Use the SEE panel Copy or Download button/);
  });

  it("uses truthful signed-in chrome and keeps projects visible to guests", () => {
    assert.match(workspace, /isAuthenticated, isSignedIn/);
    assert.match(workspace, /\{isSignedIn \? \(/);
    assert.match(workspace, /href="\/projects"/);
  });

  it("removes unsupported shell controls and the old card wall styling", () => {
    assert.doesNotMatch(workspace, /Get help/);
    assert.doesNotMatch(workspace, /Share workspace/);
    assert.doesNotMatch(workspace, /radial-gradient/);
    assert.doesNotMatch(workspace, /rounded-\[1\.(?:4|5|75)rem\]/);
    assert.doesNotMatch(workspace, /Byron\/Kempsey commercial path/);
  });
});
