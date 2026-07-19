import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPlanningFeasibilitySummary } from "../src/lib/planning-feasibility-summary";
import type { QuickSiteCheckReport } from "../src/types/quick-site-check";
import type { DetailedPlanningPackContent } from "../src/types/workspace";

const generatedAt = "2026-07-19T00:00:00.000Z";

const quickSiteCheck = (pathway: "permitted_with_consent" | "prohibited" = "permitted_with_consent"): QuickSiteCheckReport => ({
  projectId: "project-1",
  generatedAt,
  site: { address: "41 Julian Rocks Dr", lga: "Byron", zoneCode: "R2", zoneName: "Low Density Residential", zoneLabel: "R2 - Low Density Residential" },
  lepInstrument: { name: "Byron Local Environmental Plan 2014", code: "BYRON_LEP_2014", lga: "Byron", source: "ingestion" },
  permissibility: null,
  controls: {
    heightOfBuilding: { label: "Height", value: "9m", present: true, source: "Byron LEP 2014 Height of Buildings Map", lepSource: true, clauseRef: "Clause 4.3", detail: null, interpretation: "Maximum mapped height" },
    floorSpaceRatio: { label: "FSR", value: "0.5:1", present: true, source: "Byron LEP 2014 Floor Space Ratio Map", lepSource: true, clauseRef: "Clause 4.4", detail: null, interpretation: "Maximum mapped FSR" },
    minimumLotSize: { label: "Minimum lot size", value: "600 m2", present: true, source: "Byron LEP 2014 Lot Size Map", lepSource: true, clauseRef: "Clause 4.1", detail: null, interpretation: "Mapped minimum lot size" },
  },
  notes: [],
  nextSteps: [],
  lepEvidenceSummary: { label: "Cited", detail: "Cited LEP evidence", citedControlCount: 3, totalControlCount: 3, landUseEntryCount: 1, objectiveCount: 2, sourceRef: "Byron Local Environmental Plan 2014 Zone R2" },
  developmentIntent: {
    description: "Dwelling houses",
    status: "Cited",
    pathway,
    statutoryLandUse: "Dwelling houses",
    sourceRef: "Byron Local Environmental Plan 2014 Zone R2 Land Use Table",
    detail: pathway === "prohibited" ? "Dwelling houses are prohibited in Zone R2." : "Dwelling houses are permitted with consent in Zone R2.",
  },
});

const detailedPack = (status: "Cited" | "Unavailable" = "Cited"): DetailedPlanningPackContent => ({
  packType: "detailed_planning_pack",
  generatedAt,
  projectId: "project-1",
  site: { address: "41 Julian Rocks Dr", lga: "Byron", lgaCode: "BYRON", zoneCode: "R2", zoneName: "Low Density Residential", zoneLabel: "R2 - Low Density Residential" },
  proposalBrief: "Dwelling houses",
  sourceQuickSiteCheck: { artefactId: "qsc-1", title: "Quick Site Check", generatedAt, lepEvidenceSummary: quickSiteCheck().lepEvidenceSummary },
  carriedLepEvidenceSummary: quickSiteCheck().lepEvidenceSummary ?? null,
  dcpEvidence: [],
  topicMatrix: [{ topicId: "setbacks", topicLabel: "Setbacks", status, summary: status === "Cited" ? "Apply the cited setback control." : "Setback requirement remains unresolved.", sourceRefs: status === "Cited" ? ["Byron DCP 2014 Part A"] : [] }],
  unresolvedTopics: status === "Cited" ? [] : ["Setbacks"],
  consultantReviewQuestions: [],
  nextAction: "Review controls.",
  commercialReady: status === "Cited",
});

const build = (report: QuickSiteCheckReport, pack: DetailedPlanningPackContent) => buildPlanningFeasibilitySummary({
  projectId: "project-1",
  packArtefact: { id: "dpp-1", capturedAt: new Date(generatedAt) },
  pack,
  quickSiteCheckArtefact: { id: "qsc-1", capturedAt: new Date(generatedAt) },
  quickSiteCheck: report,
  generatedAt,
});

describe("buildPlanningFeasibilitySummary", () => {
  it("blocks only an exact cited prohibited land-use term", () => {
    const content = build(quickSiteCheck("prohibited"), detailedPack());

    assert.equal(content.overallVerdict, "blocked");
    assert.equal(content.summaryType, "planning_feasibility_summary");
    assert.equal(content.sourceDetailedPlanningPack?.artefactId, "dpp-1");
    assert.equal(content.items[0]?.confidence, "cited");
  });

  it("keeps unresolved DCP evidence as a hold point instead of returning proceed", () => {
    const content = build(quickSiteCheck(), detailedPack("Unavailable"));

    assert.equal(content.overallVerdict, "unresolved");
    assert.equal(content.items.find((item) => item.label === "DCP: Setbacks")?.confidence, "unavailable");
  });

  it("does not reuse an exact intent classification after the active proposal changes", () => {
    const pack = { ...detailedPack(), proposalBrief: "Alterations and additions to a dwelling house" };
    const content = build(quickSiteCheck(), pack);

    assert.equal(content.overallVerdict, "unresolved");
    assert.equal(content.items[0]?.confidence, "unavailable");
    assert.match(content.items[0]?.detail ?? "", /not the same exact statutory land-use term/i);
  });
});
