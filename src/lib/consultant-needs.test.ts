import { describe, expect, it } from "vitest";

import { buildConsultantNeedsMatrix, buildDisciplineReferralPackages } from "@/lib/consultant-needs";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";
import type { DetailedPlanningPackContent } from "@/types/workspace";

const qsc = (overrides: Partial<QuickSiteCheckReport> = {}): QuickSiteCheckReport => ({
  projectId: "project-1",
  generatedAt: "2026-08-02T00:00:00.000Z",
  site: {
    address: "45 Broken Head Road, Byron Bay NSW 2481",
    lga: "Byron Shire",
    zoneCode: "SP3",
    zoneLabel: "SP3 Tourist",
  },
  controls: {
    heightOfBuilding: {
      label: "Height",
      value: "9m",
      present: true,
      source: "Byron LEP 2014",
      clauseRef: "cl. 4.3",
      interpretation: "Maximum height is 9m.",
      confidence: "Cited",
    },
    floorSpaceRatio: {
      label: "FSR",
      value: "0.3:1",
      present: true,
      source: "Byron LEP 2014",
      clauseRef: "cl. 4.4",
      interpretation: "Maximum FSR is 0.3:1.",
      confidence: "Cited",
    },
    minimumLotSize: {
      label: "Minimum lot size",
      value: "40ha",
      present: true,
      source: "Byron LEP 2014",
      clauseRef: "cl. 4.1",
      interpretation: "Minimum lot size is 40ha.",
      confidence: "Cited",
    },
  },
  notes: [],
  nextSteps: [],
  developmentIntent: {
    description: "Tourist accommodation alterations",
    status: "Cited",
    pathway: "permitted_with_consent",
    statutoryLandUse: "tourist and visitor accommodation",
    sourceRef: "Byron LEP 2014 Zone SP3 cl. 2.3",
    detail: "Tourist and visitor accommodation is permitted with consent.",
  },
  ...overrides,
});

const citation = (ref: string, excerpt: string) => ({
  ref,
  title: "Control",
  headingPath: ["Part D"],
  excerpt,
  score: 10,
});

const pack = (overrides: Partial<DetailedPlanningPackContent> = {}): DetailedPlanningPackContent => ({
  packType: "detailed_planning_pack",
  generatedAt: "2026-08-02T00:05:00.000Z",
  projectId: "project-1",
  site: {
    address: "45 Broken Head Road, Byron Bay NSW 2481",
    lga: "Byron Shire",
    lgaCode: "BYRON",
    zoneCode: "SP3",
    zoneName: "Tourist",
    zoneLabel: "SP3 Tourist",
  },
  proposalBrief: "Tourist accommodation alterations",
  sourceQuickSiteCheck: {
    artefactId: "qsc-1",
    title: "Quick Site Check",
    generatedAt: "2026-08-02T00:00:00.000Z",
  },
  carriedLepEvidenceSummary: null,
  dcpEvidence: [
    { topicId: "setbacks", topicLabel: "Setbacks", status: "Cited", reason: "Cited", citations: [citation("Byron DCP D1.2", "Buildings must be set back 6m.")] },
    { topicId: "parking_access", topicLabel: "Parking and access", status: "Cited", reason: "Cited", citations: [citation("Byron DCP B4.2", "Provide one parking space per room.")] },
    { topicId: "built_form_active_frontage", topicLabel: "Built form and active frontage", status: "Cited", reason: "Cited", citations: [citation("Byron DCP D1.4", "The frontage must address the street.")] },
    { topicId: "landscaping_open_space", topicLabel: "Landscaping and open space", status: "Cited", reason: "Cited", citations: [citation("Byron DCP D1.5", "Retain canopy trees.")] },
    { topicId: "local_controls", topicLabel: "Other local controls", status: "Cited", reason: "Cited", citations: [citation("Byron DCP D1.6", "Provide waste storage.")] },
  ],
  topicMatrix: [
    { topicId: "setbacks", topicLabel: "Setbacks", status: "Cited", summary: "Cited", sourceRefs: ["Byron DCP D1.2"] },
    { topicId: "parking_access", topicLabel: "Parking and access", status: "Cited", summary: "Cited", sourceRefs: ["Byron DCP B4.2"] },
    { topicId: "built_form_active_frontage", topicLabel: "Built form and active frontage", status: "Cited", summary: "Cited", sourceRefs: ["Byron DCP D1.4"] },
    { topicId: "landscaping_open_space", topicLabel: "Landscaping and open space", status: "Cited", summary: "Cited", sourceRefs: ["Byron DCP D1.5"] },
    { topicId: "local_controls", topicLabel: "Other local controls", status: "Cited", summary: "Cited", sourceRefs: ["Byron DCP D1.6"] },
  ],
  unresolvedTopics: [],
  consultantReviewQuestions: ["Confirm the waste response."],
  nextAction: "Prepare SEE or consultant referral.",
  commercialReady: true,
  ...overrides,
});

describe("consultant-needs matrix", () => {
  it("derives cited Byron discipline needs without inventing hazard triggers", () => {
    const matrix = buildConsultantNeedsMatrix({ quickSiteCheck: qsc(), detailedPlanningPack: pack() });

    expect(matrix).toHaveLength(10);
    expect(matrix.find((need) => need.disciplineId === "town_planning")).toMatchObject({
      status: "Conditional",
      evidence: [expect.objectContaining({ type: "LEP", ref: "Byron LEP 2014 Zone SP3 cl. 2.3" })],
    });
    expect(matrix.find((need) => need.disciplineId === "traffic_transport")).toMatchObject({
      status: "Conditional",
      evidence: [expect.objectContaining({ type: "DCP", ref: "Byron DCP B4.2" })],
    });
    expect(matrix.find((need) => need.disciplineId === "registered_surveying")?.evidence).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "LEP", ref: "Byron LEP 2014 cl. 4.3" })]),
    );
    expect(matrix.filter((need) => ["bushfire", "flood_hydraulic", "ecology", "heritage", "contamination_geotechnical"].includes(need.disciplineId)))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ status: "Not identified from current evidence", evidence: [] }),
      ]));
  });

  it("makes unresolved Kempsey evidence a required planning review and a cited pack gap", () => {
    const kempseyPack = pack({
      site: {
        address: "52 Belgrave Street, Kempsey NSW 2440",
        lga: "Kempsey Shire",
        lgaCode: "KEMPSEY",
        zoneCode: "E2",
        zoneName: "Commercial Centre",
        zoneLabel: "E2 Commercial Centre",
      },
      proposalBrief: "Shopfront alterations and change of use",
      commercialReady: false,
      unresolvedTopics: ["Parking and access: no qualifying current-zone requirement was found."],
      dcpEvidence: pack().dcpEvidence.map((topic) => topic.topicId === "parking_access"
        ? { ...topic, status: "Unavailable", reason: "No qualifying current-zone requirement was found.", citations: [] }
        : topic),
      topicMatrix: pack().topicMatrix.map((topic) => topic.topicId === "parking_access"
        ? { ...topic, status: "Unavailable", summary: "No qualifying current-zone requirement was found.", sourceRefs: [] }
        : topic),
    });
    const matrix = buildConsultantNeedsMatrix({
      quickSiteCheck: qsc({
        site: { address: "52 Belgrave Street, Kempsey NSW 2440", lga: "Kempsey Shire", zoneCode: "E2", zoneLabel: "E2 Commercial Centre" },
      }),
      detailedPlanningPack: kempseyPack,
    });

    expect(matrix.find((need) => need.disciplineId === "town_planning")?.status).toBe("Required");
    expect(matrix.find((need) => need.disciplineId === "traffic_transport")).toMatchObject({
      status: "Conditional",
      evidence: [expect.objectContaining({ type: "PACK_GAP", ref: "Parking and access: Unavailable" })],
    });
  });

  it("creates a deterministic discipline package only for identified needs", () => {
    const matrix = buildConsultantNeedsMatrix({ quickSiteCheck: qsc(), detailedPlanningPack: pack() });
    const packages = buildDisciplineReferralPackages({ proposalBrief: pack().proposalBrief, consultantNeeds: matrix });

    expect(packages.map((item) => item.disciplineId)).toEqual([
      "town_planning",
      "traffic_transport",
      "architecture_urban_design",
      "landscape_architecture",
      "registered_surveying",
    ]);
    expect(packages.every((item) => item.requestedScope.length > 0 && item.limitations.length > 0)).toBe(true);
    expect(buildDisciplineReferralPackages({ proposalBrief: pack().proposalBrief, consultantNeeds: matrix })).toEqual(packages);
  });
});
