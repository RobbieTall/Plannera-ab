import { describe, expect, it } from "vitest";

import { formatReviewRequestHandoff, reviewRequestFilename } from "./review-request-handoff";
import type { ReviewRequestContent } from "@/types/workspace";

const baseContent = (overrides: Partial<ReviewRequestContent> = {}): ReviewRequestContent => ({
  requestType: "expert_review_request",
  generatedAt: "2026-07-13T10:30:00.000Z",
  projectId: "project-1",
  site: {
    address: "45 Broken Head Road, Byron Bay NSW 2481",
    lga: "Byron Shire",
    zoneLabel: "RU2 Rural Landscape",
  },
  packageSummary: "Expert review package assembled for planner handoff.",
  includedArtefacts: [
    {
      type: "quick_site_check",
      id: "qsc-1",
      title: "Quick Site Check — 45 Broken Head Road",
      generatedAt: "2026-07-13T10:00:00.000Z",
    },
    {
      type: "pre_see_planning_memo",
      id: "see-1",
      title: "Pre-SEE planning memo — 45 Broken Head Road",
      generatedAt: "2026-07-13T10:20:00.000Z",
    },
  ],
  citedSources: [
    { ref: "Byron LEP 2014 cl. 4.3", type: "LEP" },
    { ref: "Byron DCP 2014 Chapter D1", type: "DCP" },
  ],
  lepEvidenceSummary: {
    label: "Cited",
    sourceRef: "Byron LEP 2014 Zone RU2",
    detail: "LEP evidence is grounded in DB-backed zone data.",
    objectiveCount: 2,
    landUseEntryCount: 1,
    citedControlCount: 2,
    totalControlCount: 3,
  },
  confidenceGaps: ["Confirm mapped hazard overlays."],
  missingInputs: ["Survey plan"],
  assumptions: ["No recent consent history was supplied."],
  recommendedReviewScope: ["Review SEE limitations before lodgement use."],
  ...overrides,
});

describe("review request handoff formatter", () => {
  it("includes populated planner handoff fields", () => {
    const text = formatReviewRequestHandoff(baseContent());

    expect(text).toContain("Project/site address: 45 Broken Head Road, Byron Bay NSW 2481");
    expect(text).toContain("LGA: Byron Shire");
    expect(text).toContain("Zone: RU2 Rural Landscape");
    expect(text).toContain("Quick Site Check — 45 Broken Head Road · quick_site_check");
    expect(text).toContain("Citation count: 2");
    expect(text).toContain("Byron LEP 2014 cl. 4.3 (LEP)");
    expect(text).toContain("LEP evidence quality");
    expect(text).toContain("Quality: Cited");
    expect(text).toContain("Source: Byron LEP 2014 Zone RU2");
    expect(text).toContain("Zone objectives: 2");
    expect(text).toContain("Cited numeric LEP controls: 2/3");
    expect(text).toContain("Confirm mapped hazard overlays.");
    expect(text).toContain("Survey plan");
    expect(text).toContain("No recent consent history was supplied.");
    expect(text).toContain("Review SEE limitations before lodgement use.");
  });

  it("omits missing optional fields cleanly", () => {
    const text = formatReviewRequestHandoff(baseContent({
      generatedAt: "",
      site: { address: null, lga: null, zoneLabel: null },
      packageSummary: "",
      includedArtefacts: [],
      citedSources: [],
      lepEvidenceSummary: undefined,
      confidenceGaps: [],
      missingInputs: [],
      assumptions: [],
      recommendedReviewScope: [],
    }));

    expect(text).toBe("EXPERT REVIEW REQUEST\n============================================================");
    expect(text).not.toMatch(/undefined|null/);
    expect(text).not.toContain("Confidence gaps");
    expect(text).not.toContain("Missing inputs");
  });

  it("exports legacy review requests without LEP evidence safely", () => {
    const text = formatReviewRequestHandoff(baseContent({ lepEvidenceSummary: undefined }));

    expect(text).not.toContain("LEP evidence quality");
    expect(text).not.toMatch(/undefined|null/);
  });

  it("uses the existing address-slug filename style", () => {
    expect(reviewRequestFilename(baseContent())).toBe("review-request-45-broken-head-road-byron-bay-nsw-2481.txt");
  });
});
