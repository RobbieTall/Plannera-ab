import { describe, expect, it } from "vitest";

import type {
  DetailedPlanningPackContent,
  WorkspacePreSeePlanningMemoContent,
} from "@/types/workspace";

import { compileCanonicalSeeFromPreSee } from "./submission-see-application-adapter";

const makePack = (
  lgaCode: "BYRON" | "KEMPSEY",
  zoneCode: "SP3" | "E2",
): DetailedPlanningPackContent => ({
  packType: "detailed_planning_pack",
  generatedAt: "2026-09-11T00:00:00.000Z",
  projectId: `project-${lgaCode.toLowerCase()}`,
  site: {
    address: "Confirmed canonical SEE site",
    lga: lgaCode === "BYRON" ? "Byron Shire" : "Kempsey Shire",
    lgaCode,
    zoneCode,
    zoneName: zoneCode === "SP3" ? "Tourist" : "Commercial Centre",
    zoneLabel: zoneCode === "SP3" ? "SP3 Tourist" : "E2 Commercial Centre",
  },
  proposalBrief:
    "The proposal comprises a documented commercial development with defined built form, access, servicing, operating parameters and site works.",
  sourceQuickSiteCheck: {
    artefactId: `qsc-${lgaCode.toLowerCase()}`,
    title: "Current Quick Site Check",
    generatedAt: "2026-09-11T00:00:00.000Z",
  },
  carriedLepEvidenceSummary: null,
  dcpEvidence: [
    {
      topicId: "built_form",
      topicLabel: "Built form and amenity",
      status: "Cited",
      reason: "Current cited DCP evidence.",
      citations: [
        {
          ref: "DCP-1",
          title: "Built form controls",
          headingPath: ["Development controls", "Built form"],
          excerpt: "Current controls applying to the confirmed proposal and site.",
          score: 100,
        },
      ],
    },
  ],
  topicMatrix: [
    {
      topicId: "built_form",
      topicLabel: "Built form and amenity",
      status: "Cited",
      summary:
        "The proposal is assessed against the cited built-form, streetscape and amenity controls for the confirmed site.",
      sourceRefs: ["DCP-1"],
    },
  ],
  unresolvedTopics: [],
  consultantReviewQuestions: [],
  nextAction: "Compile the canonical working SEE.",
  commercialReady: true,
});

const makeMemo = (
  pack: DetailedPlanningPackContent,
  dppId: string,
): WorkspacePreSeePlanningMemoContent => ({
  memoType: "pre_see_planning_memo",
  generatedAt: "2026-09-11T00:01:00.000Z",
  projectId: pack.projectId,
  documentReadiness: {
    state: "WORKING_SEE",
    evidenceStatus: "CONFIRMED",
    submissionReady: false,
    customerMessage:
      "This working SEE has confirmed pack evidence but still requires final outputs and operator review.",
  },
  outstandingEvidence: [],
  siteDescription: {
    address: pack.site.address,
    lga: pack.site.lga,
    zoneCode: pack.site.zoneCode,
    zoneName: pack.site.zoneName,
    zoneLabel: pack.site.zoneLabel,
  },
  proposedWorksSummary: pack.proposalBrief,
  applicableControls: {
    lepInstrument: {
      name:
        pack.site.lgaCode === "BYRON"
          ? "Byron Local Environmental Plan 2014"
          : "Kempsey Local Environmental Plan 2013",
    },
    permissibility: {
      landUse: "Representative commercial use",
      status: "Permitted with consent",
      interpretation:
        "The recorded use is permitted with consent subject to current controls.",
    },
    quickSiteControls: {},
    dcpClauses: [],
    sourceExcerpts: [],
  },
  consistencyAssessment: [
    {
      topic: "Land use permissibility",
      assessment:
        "The proposal is assessed as permitted with consent against the current land-use table and zone objectives.",
      citations: [{ type: "LEP", ref: "2.3" }],
    },
    {
      topic: "Built form and amenity",
      assessment:
        "The proposal responds to the current built-form, streetscape and amenity controls identified for the site.",
      citations: [{ type: "DCP", ref: "DCP-1" }],
    },
  ],
  limitations: [
    "This canonical compilation remains a working SEE until final outputs and operator review are complete.",
  ],
  sourceDetailedPlanningPack: {
    artefactId: dppId,
    title: "Current Detailed Planning Pack",
    generatedAt: pack.generatedAt,
    commercialReady: true,
    sourceQuickSiteCheckArtefactId: pack.sourceQuickSiteCheck.artefactId,
    unresolvedTopics: [],
  },
});

describe("canonical SEE application adapter", () => {
  it.each([
    ["BYRON", "SP3"],
    ["KEMPSEY", "E2"],
  ] as const)(
    "compiles the persisted %s %s DPP path into the canonical section contract",
    (lgaCode, zoneCode) => {
      const pack = makePack(lgaCode, zoneCode);
      const dppId = `dpp-${lgaCode.toLowerCase()}`;
      const result = compileCanonicalSeeFromPreSee({
        detailedPlanningPackArtefactId: dppId,
        detailedPlanningPack: pack,
        preSeeMemo: makeMemo(pack, dppId),
      });

      expect(result).toMatchObject({
        standardVersion: "see-builder-standard.v1",
        status: "ready",
        sourceDetailedPlanningPackArtefactId: dppId,
        issues: [],
      });
      expect(result.sections.map((section) => section.id)).toEqual(
        expect.arrayContaining([
          "executive_summary",
          "statutory_planning_framework",
          "environmental_impacts",
          "section_4_15_evaluation",
          "conclusion",
        ]),
      );
      expect(result.sections.map((section) => section.id)).not.toContain(
        "mitigation_measures",
      );
    },
  );

  it("fails closed when the memo points to another DPP", () => {
    const pack = makePack("BYRON", "SP3");
    const memo = makeMemo(pack, "stale-dpp");

    const result = compileCanonicalSeeFromPreSee({
      detailedPlanningPackArtefactId: "current-dpp",
      detailedPlanningPack: pack,
      preSeeMemo: memo,
    });

    expect(result.status).toBe("blocked");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "dpp_mismatch" }),
      ]),
    );
  });
});
