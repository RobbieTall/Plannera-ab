import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCommercialNextAction } from "../src/lib/commercial-next-action";

describe("buildCommercialNextAction", () => {
  it("asks for a Byron or Kempsey site before outputs", () => {
    const result = buildCommercialNextAction({
      hasSiteContext: false,
      hasQuickSiteCheck: false,
      hasSee: false,
    });

    assert.equal(result.primaryAction, "set_site");
    assert.equal(result.items[0]?.status, "Needs Input");
  });

  it("prioritises a saved Quick Site Check after a target LGA site is set", () => {
    const result = buildCommercialNextAction({
      hasSiteContext: true,
      lgaName: "Byron Shire",
      zoneLabel: "R2 – Low Density Residential",
      coverageMaturity: "SEARCHABLE_READY",
      hasQuickSiteCheck: false,
      hasSee: false,
    });

    assert.equal(result.primaryAction, "run_quick_site_check");
    assert.ok(result.items.map((item) => item.status).includes("Confirmed"));
  });

  it("moves to Detailed Planning Pack generation after quality Quick Site Check exists", () => {
    const result = buildCommercialNextAction({
      hasSiteContext: true,
      lgaCode: "KEMPSEY",
      zoneLabel: "R1 – General Residential",
      coverageMaturity: "STRUCTURED_PARTIAL",
      hasQuickSiteCheck: true,
      hasSee: false,
      hasQualityQuickSiteCheck: true,
    });

    assert.equal(result.primaryAction, "generate_detailed_pack");
  });

  it("rejects artefact-existence-only readiness when evidence quality is weak", () => {
    const result = buildCommercialNextAction({
      hasSiteContext: true,
      lgaCode: "BYRON",
      zoneLabel: "SP3 – Tourist",
      coverageMaturity: "SEARCHABLE_READY",
      hasQuickSiteCheck: true,
      hasSee: true,
      hasQualityQuickSiteCheck: false,
      hasQualitySee: false,
    });

    assert.equal(result.primaryAction, "run_quick_site_check");
    assert.equal(result.items.find((item) => item.label === "Saved Quick Site Check")?.status, "Needs Expert Review");
  });

  it("keeps an unresolved current-site Detailed Planning Pack at Needs Expert Review", () => {
    const result = buildCommercialNextAction({
      hasSiteContext: true,
      lgaCode: "KEMPSEY",
      zoneLabel: "E2 – Commercial Centre",
      coverageMaturity: "SEARCHABLE_READY",
      hasQuickSiteCheck: true,
      hasDetailedPlanningPack: true,
      hasQualityDetailedPlanningPack: false,
      hasSee: false,
      hasQualityQuickSiteCheck: true,
      hasQualitySee: false,
    });

    assert.equal(result.primaryAction, "generate_detailed_pack");
    assert.equal(result.primaryLabel, "Regenerate detailed planning pack");
    assert.equal(result.secondaryLabel, "Request expert review");
    assert.equal(result.items.find((item) => item.label === "Detailed Planning Pack")?.status, "Needs Expert Review");
    assert.equal(result.items.find((item) => item.label === "SEE / referral")?.status, "Unavailable");
  });

  it("advances to SEE only after a quality current-site Detailed Planning Pack", () => {
    const result = buildCommercialNextAction({
      hasSiteContext: true,
      lgaCode: "KEMPSEY",
      zoneLabel: "E2 – Commercial Centre",
      coverageMaturity: "SEARCHABLE_READY",
      hasQuickSiteCheck: true,
      hasDetailedPlanningPack: true,
      hasQualityDetailedPlanningPack: true,
      hasSee: false,
      hasQualityQuickSiteCheck: true,
      hasQualitySee: false,
    });

    assert.equal(result.primaryAction, "generate_see");
    assert.equal(result.items.find((item) => item.label === "Detailed Planning Pack")?.status, "Confirmed");
    assert.equal(result.items.find((item) => item.label === "SEE / referral")?.status, "Needs Input");
  });

  it("does not let a quality SEE bypass an absent or weak quality Detailed Planning Pack", () => {
    const result = buildCommercialNextAction({
      hasSiteContext: true,
      lgaCode: "BYRON",
      zoneLabel: "SP3 – Tourist",
      coverageMaturity: "SEARCHABLE_READY",
      hasQuickSiteCheck: true,
      hasDetailedPlanningPack: false,
      hasQualityDetailedPlanningPack: false,
      hasSee: true,
      hasQualityQuickSiteCheck: true,
      hasQualitySee: true,
    });

    assert.equal(result.primaryAction, "generate_detailed_pack");
    assert.equal(result.items.find((item) => item.label === "SEE / referral")?.status, "Needs Expert Review");
  });

  it("recommends export or review once quality-valid pack and SEE exist", () => {
    const result = buildCommercialNextAction({
      hasSiteContext: true,
      lgaCode: "BYRON",
      zoneLabel: "RU2 – Rural Landscape",
      coverageMaturity: "VERIFIED",
      hasQuickSiteCheck: true,
      hasSee: true,
      hasDetailedPlanningPack: true,
      hasQualityDetailedPlanningPack: true,
      hasQualityQuickSiteCheck: true,
      hasQualitySee: true,
    });

    assert.equal(result.primaryAction, "export_or_review");
    assert.equal(result.primaryLabel, "Download SEE");
  });
});
