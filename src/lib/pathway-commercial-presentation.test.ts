import { describe, expect, it } from "vitest";

import {
  buildPathwayCommercialPresentation,
  PATHWAY_COMMERCIAL_PRESENTATION_VERSION,
} from "./pathway-commercial-presentation";

describe("Item 74H customer commercial presentation", () => {
  it("presents both working products without claiming submission readiness", () => {
    const result = buildPathwayCommercialPresentation({
      planningControlsPackReadiness: "WORKING",
      submissionSeeReadiness: "WORKING",
      submissionReady: false,
      productionCheckoutEnabled: false,
    });

    expect(result).toMatchObject({
      version: PATHWAY_COMMERCIAL_PRESENTATION_VERSION,
      submissionReady: false,
      productionCheckoutEnabled: false,
      planningControlsPack: {
        priceLabel: "A$49",
        statusLabel: "Working pack available",
        canProgress: true,
        checkoutEnabled: false,
      },
      submissionSee: {
        priceLabel: "A$749",
        statusLabel: "Working SEE available",
        canProgress: true,
        checkoutEnabled: false,
      },
    });
    expect(result.planningControlsPack.description).toContain(
      "same purchased project",
    );
    expect(result.submissionSee.description).toContain(
      "same purchased project",
    );
    expect(result.submissionSee.qualification).toContain(
      "not submission ready",
    );
  });

  it("keeps hard-blocked products unavailable", () => {
    const result = buildPathwayCommercialPresentation({
      planningControlsPackReadiness: "BLOCKED",
      submissionSeeReadiness: "BLOCKED",
      submissionReady: false,
      productionCheckoutEnabled: true,
    });

    expect(result.planningControlsPack).toMatchObject({
      canProgress: false,
      checkoutEnabled: false,
    });
    expect(result.submissionSee).toMatchObject({
      canProgress: false,
      checkoutEnabled: false,
    });
  });

  it("does not infer checkout activation from final readiness", () => {
    const result = buildPathwayCommercialPresentation({
      planningControlsPackReadiness: "FINAL",
      submissionSeeReadiness: "FINAL",
      submissionReady: true,
      productionCheckoutEnabled: false,
    });

    expect(result.planningControlsPack.checkoutEnabled).toBe(false);
    expect(result.submissionSee.checkoutEnabled).toBe(false);
    expect(result.submissionReady).toBe(true);
  });

  it("rejects an impossible submission-ready working presentation", () => {
    expect(() =>
      buildPathwayCommercialPresentation({
        planningControlsPackReadiness: "WORKING",
        submissionSeeReadiness: "WORKING",
        submissionReady: true,
        productionCheckoutEnabled: false,
      }),
    ).toThrow("Submission-ready presentation requires FINAL SEE readiness");
  });
});
