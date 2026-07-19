import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCommercialNextAction } from "../src/lib/commercial-next-action";
import { buildCommercialFunnelStages, selectCommercialFunnelActiveStage } from "../src/lib/commercial-funnel-stages";

const next = (overrides = {}) => buildCommercialNextAction({
  hasSiteContext: true,
  lgaName: "Byron Shire",
  lgaCode: "BYRON",
  zoneLabel: "SP3 Tourist",
  coverageMaturity: "SEARCHABLE_READY",
  hasQuickSiteCheck: false,
  hasSee: false,
  hasDetailedPlanningPack: false,
  hasQualityQuickSiteCheck: false,
  hasQualityDetailedPlanningPack: false,
  hasQualitySee: false,
  ...overrides,
});

const states = (overrides: any) => buildCommercialFunnelStages({
  nextAction: next(overrides),
  hasConfirmedSite: overrides.hasSiteContext ?? true,
  hasQualityQuickSiteCheck: overrides.hasQualityQuickSiteCheck ?? false,
  hasDetailedPlanningPack: overrides.hasDetailedPlanningPack ?? false,
  hasQualityDetailedPlanningPack: overrides.hasQualityDetailedPlanningPack ?? false,
  hasQualitySee: overrides.hasQualitySee ?? false,
}).map((stage) => [stage.label, stage.state]);

describe("buildCommercialFunnelStages", () => {
  it("maps set_site to current site and upcoming downstream stages", () => {
    assert.deepEqual(states({ hasSiteContext: false }), [
      ["Site", "current"], ["Quick Site Check", "upcoming"], ["Detailed Planning Pack", "upcoming"], ["SEE / consultant handoff", "upcoming"],
    ]);
  });

  it("maps run_quick_site_check without marking QSC complete when quality is false", () => {
    assert.equal(next({ hasQuickSiteCheck: true, hasQualityQuickSiteCheck: false }).primaryAction, "run_quick_site_check");
    assert.deepEqual(states({ hasQuickSiteCheck: true, hasQualityQuickSiteCheck: false })[1], ["Quick Site Check", "current"]);
  });

  it("maps absent detailed pack to current DPP after quality QSC", () => {
    assert.deepEqual(states({ hasQuickSiteCheck: true, hasQualityQuickSiteCheck: true })[2], ["Detailed Planning Pack", "current"]);
  });

  it("maps unresolved detailed pack to review needed and does not mark SEE ready", () => {
    const mapped = states({ hasQuickSiteCheck: true, hasQualityQuickSiteCheck: true, hasDetailedPlanningPack: true, hasQualityDetailedPlanningPack: false });
    assert.deepEqual(mapped[2], ["Detailed Planning Pack", "needs_review"]);
    assert.deepEqual(mapped[3], ["SEE / consultant handoff", "upcoming"]);
  });

  it("maps generate_see and export_or_review from fail-closed quality flags", () => {
    assert.deepEqual(states({ hasQuickSiteCheck: true, hasQualityQuickSiteCheck: true, hasDetailedPlanningPack: true, hasQualityDetailedPlanningPack: true })[3], ["SEE / consultant handoff", "current"]);
    assert.deepEqual(states({ hasQuickSiteCheck: true, hasQualityQuickSiteCheck: true, hasDetailedPlanningPack: true, hasQualityDetailedPlanningPack: true, hasSee: true, hasQualitySee: true })[3], ["SEE / consultant handoff", "complete"]);
  });

  it("selects the last honest active stage after export_or_review instead of falling back to Site", () => {
    const nextAction = next({
      hasQuickSiteCheck: true,
      hasQualityQuickSiteCheck: true,
      hasDetailedPlanningPack: true,
      hasQualityDetailedPlanningPack: true,
      hasSee: true,
      hasQualitySee: true,
    });
    assert.equal(nextAction.primaryAction, "export_or_review");
    const stages = buildCommercialFunnelStages({
      nextAction,
      hasConfirmedSite: true,
      hasQualityQuickSiteCheck: true,
      hasDetailedPlanningPack: true,
      hasQualityDetailedPlanningPack: true,
      hasQualitySee: true,
    });
    assert.equal(selectCommercialFunnelActiveStage(stages)?.id, "see_referral");
  });
});
