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

  it("moves to SEE generation after Quick Site Check exists", () => {
    const result = buildCommercialNextAction({
      hasSiteContext: true,
      lgaCode: "KEMPSEY",
      zoneLabel: "R1 – General Residential",
      coverageMaturity: "STRUCTURED_PARTIAL",
      hasQuickSiteCheck: true,
      hasSee: false,
    });

    assert.equal(result.primaryAction, "generate_see");
  });

  it("recommends export or review once SEE exists", () => {
    const result = buildCommercialNextAction({
      hasSiteContext: true,
      lgaCode: "BYRON",
      zoneLabel: "RU2 – Rural Landscape",
      coverageMaturity: "VERIFIED",
      hasQuickSiteCheck: true,
      hasSee: true,
    });

    assert.equal(result.primaryAction, "export_or_review");
    assert.equal(result.primaryLabel, "Download SEE");
  });
});
