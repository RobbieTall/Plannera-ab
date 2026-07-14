import { describe, expect, it } from "vitest";

import { buildCommercialNextAction } from "@/lib/commercial-next-action";

describe("buildCommercialNextAction", () => {
  it("does not treat a pending initial address as confirmed commercial readiness", () => {
    const action = buildCommercialNextAction({
      hasSiteContext: true,
      isPendingInitialSiteConfirmation: true,
      lgaName: "Byron/Kempsey launch address confirming",
      lgaCode: "BYRON_KEMPSEY_CONFIRMING",
      zoneLabel: null,
      coverageMaturity: "SEARCHABLE_READY",
      hasQuickSiteCheck: true,
      hasSee: true,
      hasQualityQuickSiteCheck: true,
      hasQualitySee: true,
    });

    expect(action.heading).toBe("Confirming the launch site");
    expect(action.primaryAction).toBe("set_site");
    expect(action.primaryLabel).toBe("Confirm site before paid workflow");
    expect(action.items.find((item) => item.label === "Site and LGA")?.status).toBe("Needs Input");
    expect(action.heading).not.toBe("Ready for paid export or expert review");
  });
});
