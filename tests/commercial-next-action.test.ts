import { describe, expect, it } from "vitest";

import { buildCommercialNextAction } from "@/lib/commercial-next-action";

describe("buildCommercialNextAction", () => {
  it("asks for a Byron or Kempsey site before outputs", () => {
    const result = buildCommercialNextAction({
      hasSiteContext: false,
      hasQuickSiteCheck: false,
      hasSee: false,
    });

    expect(result.primaryAction).toBe("set_site");
    expect(result.items[0]).toMatchObject({ status: "Needs Input" });
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

    expect(result.primaryAction).toBe("run_quick_site_check");
    expect(result.items.map((item) => item.status)).toContain("Confirmed");
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

    expect(result.primaryAction).toBe("generate_see");
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

    expect(result.primaryAction).toBe("export_or_review");
    expect(result.primaryLabel).toBe("Download SEE");
  });
});
