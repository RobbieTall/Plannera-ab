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
      type: "detailed_planning_pack",
      id: "dpp-1",
      title: "Detailed Planning Pack — 45 Broken Head Road",
      generatedAt: "2026-07-13T10:10:00.000Z",
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
  detailedPlanningPack: {
    artefactId: "dpp-1",
    title: "Detailed Planning Pack — 45 Broken Head Road",
    generatedAt: "2026-07-13T10:10:00.000Z",
    proposalBrief: "Alterations and additions to tourist accommodation.",
    commercialReady: false,
    topicMatrix: [{ topicId: "parking", topicLabel: "Parking", status: "Unavailable", summary: "No cited parking clause.", sourceRefs: [] }],
    unresolvedTopics: ["Parking: no cited current DCP clause found."],
    sourceQuickSiteCheckArtefactId: "qsc-1",
    citedRequirements: [{
      topicId: "parking_access",
      topicLabel: "Parking and access",
      ref: "D4.12",
      title: "Parking controls",
      headingPath: ["Part D", "Parking"],
      excerpt: "Controls: Car parking must provide 2 spaces per dwelling.",
    }],
  },
  sourceSeeMemo: {
    artefactId: "see-1",
    title: "Pre-SEE planning memo — 45 Broken Head Road",
    generatedAt: "2026-07-13T10:20:00.000Z",
    sourceDetailedPlanningPackArtefactId: "dpp-1",
  },
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
    expect(text).toContain("Detailed Planning Pack provenance");
    expect(text).toContain("Commercial ready: No — unresolved referral only");
    expect(text).toContain("Proposal brief: Alterations and additions to tourist accommodation.");
    expect(text).toContain("Cited DCP requirements");
    expect(text).toContain("Topic: Parking and access");
    expect(text).toContain("Citation: D4.12 — Parking controls");
    expect(text).toContain("Hierarchy: Part D > Parking");
    expect(text).toContain("Exact requirement: Controls: Car parking must provide 2 spaces per dwelling.");
    expect(text).toContain("Parking: Unavailable");
    expect(text).toContain("Parking: no cited current DCP clause found.");
    expect(text).toContain("SEE provenance");
    expect(text).toContain("Source Detailed Planning Pack: dpp-1");
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
      detailedPlanningPack: undefined,
      sourceSeeMemo: undefined,
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

  it("exports the evidence-derived needs matrix and discipline brief", () => {
    const text = formatReviewRequestHandoff(baseContent({
      consultantNeedsVersion: "consultant-needs.v1",
      consultantNeeds: [{
        disciplineId: "traffic_transport",
        disciplineLabel: "Traffic and transport",
        status: "Conditional",
        reason: "Parking evidence is unresolved.",
        evidence: [{ type: "PACK_GAP", ref: "Parking and access: Unavailable", excerpt: "No qualifying control was retrieved." }],
        questions: ["Confirm whether a traffic assessment is required."],
      }],
      disciplinePackages: [{
        disciplineId: "traffic_transport",
        disciplineLabel: "Traffic and transport",
        needStatus: "Conditional",
        brief: "Review parking and access for the proposal.",
        requestedScope: ["Confirm parking and access requirements."],
        questions: ["Is a traffic assessment required?"],
        evidence: [{ type: "PACK_GAP", ref: "Parking and access: Unavailable" }],
        limitations: ["PACK_GAP is not a statutory citation."],
      }],
    }));

    expect(text).toContain("Consultant-needs matrix");
    expect(text).toContain("Traffic and transport: Conditional");
    expect(text).toContain("Evidence: Parking and access: Unavailable (PACK_GAP)");
    expect(text).toContain("Discipline referral packages");
    expect(text).toContain("Scope: Confirm parking and access requirements.");
  });

  it("uses the existing address-slug filename style", () => {
    expect(reviewRequestFilename(baseContent())).toBe("review-request-45-broken-head-road-byron-bay-nsw-2481.txt");
  });
});
