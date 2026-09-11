import { describe, expect, it } from "vitest";

import type {
  DetailedPlanningPackContent,
  WorkspacePreSeePlanningMemoContent,
} from "@/types/workspace";

import {
  compileSubmissionSeeSections,
  type SubmissionSeeSectionCompilerInput,
} from "./submission-see-sections";

const makePack = (
  lgaCode: "BYRON" | "KEMPSEY",
  zoneCode: "SP3" | "E2",
): DetailedPlanningPackContent => ({
  packType: "detailed_planning_pack",
  generatedAt: "2026-08-21T01:00:00.000Z",
  projectId: `project-${lgaCode.toLowerCase()}`,
  site: {
    address: "Confirmed acceptance site",
    lga: lgaCode === "BYRON" ? "Byron Shire" : "Kempsey Shire",
    lgaCode,
    zoneCode,
    zoneName: zoneCode === "SP3" ? "Tourist" : "Commercial Centre",
    zoneLabel: zoneCode === "SP3" ? "SP3 Tourist" : "E2 Commercial Centre",
  },
  proposalBrief:
    "The proposal comprises a defined commercial development with documented built form, access, servicing, operating parameters and site works for environmental assessment.",
  sourceQuickSiteCheck: {
    artefactId: `qsc-${lgaCode.toLowerCase()}`,
    title: "Current cited Quick Site Check",
    generatedAt: "2026-08-21T01:00:00.000Z",
    lepEvidenceSummary: null,
  },
  carriedLepEvidenceSummary: null,
  dcpEvidence: [
    {
      topicId: "built_form",
      topicLabel: "Built form",
      status: "Cited",
      reason: "Current applicable DCP evidence.",
      citations: [
        {
          ref: "DCP-1",
          title: "Applicable development controls",
          headingPath: ["Development controls"],
          excerpt: "Current cited development control evidence.",
          score: 100,
        },
      ],
    },
  ],
  topicMatrix: [
    {
      topicId: "built_form",
      topicLabel: "Built form",
      status: "Cited",
      summary: "The proposed built form is assessed against current controls.",
      sourceRefs: ["DCP-1"],
    },
  ],
  unresolvedTopics: [],
  consultantReviewQuestions: [],
  nextAction: "Compile submission SEE.",
  commercialReady: true,
});

const makeMemo = (
  pack: DetailedPlanningPackContent,
  dppId: string,
): WorkspacePreSeePlanningMemoContent =>
  ({
    memoType: "pre_see_planning_memo",
    generatedAt: "2026-08-21T01:01:00.000Z",
    projectId: pack.projectId,
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
          "The representative land use is recorded as permitted with development consent, subject to current cited controls.",
      },
      quickSiteControls: {},
      dcpClauses: [],
      sourceExcerpts: [],
    },
    consistencyAssessment: [
      {
        topic: "Land use permissibility",
        assessment:
          "The proposal is assessed against the current zone objectives and land-use table and requires development consent.",
        citations: [{ type: "LEP", ref: "2.3" }],
      },
      {
        topic: "Built form",
        assessment:
          "The proposed built form is assessed against the applicable current development control requirements.",
        citations: [{ type: "DCP", ref: "DCP-1" }],
      },
    ],
    limitations: [
      "This evidence memo is not the final submission document.",
    ],
    sourceDetailedPlanningPack: {
      artefactId: dppId,
      title: "Current Detailed Planning Pack",
      generatedAt: pack.generatedAt,
      commercialReady: true,
      sourceQuickSiteCheckArtefactId: pack.sourceQuickSiteCheck.artefactId,
    },
  }) as WorkspacePreSeePlanningMemoContent;

const makeInput = (
  lgaCode: "BYRON" | "KEMPSEY",
  zoneCode: "SP3" | "E2",
): SubmissionSeeSectionCompilerInput => {
  const pack = makePack(lgaCode, zoneCode);
  const dppId = `dpp-${lgaCode.toLowerCase()}`;
  return {
    projectId: pack.projectId,
    detailedPlanningPackArtefactId: dppId,
    detailedPlanningPack: pack,
    preSeeMemo: makeMemo(pack, dppId),
    knownSourceIds: [
      "LEP:2.3",
      "DCP:DCP-1",
      "spatial",
      "upload-plan",
      "upload-environment",
    ],
    proposalSourceIds: ["upload-plan", "DCP:DCP-1"],
    statutorySourceIds: ["LEP:2.3", "DCP:DCP-1"],
    siteAndSurrounds: {
      narrative:
        "The confirmed site and surrounding development context have been reviewed against current spatial evidence, site observations and the registered proposal plans.",
      sourceIds: ["spatial", "upload-plan"],
    },
    impactAssessments: [
      {
        topic: "Access, traffic and servicing",
        assessment:
          "The proposal's access, traffic generation and servicing arrangements have been assessed against the current plans and applicable controls, with no unsupported conclusion adopted.",
        mitigation:
          "Detailed access design, servicing coordination and any required specialist confirmation must be completed in accordance with the cited evidence before construction.",
        sourceIds: ["DCP:DCP-1", "upload-plan", "upload-environment"],
      },
      {
        topic: "Built form and amenity",
        assessment:
          "The proposed built form and potential amenity effects have been assessed using the current proposal plan and applicable planning controls for the confirmed zone.",
        mitigation:
          "Final plans must retain the assessed setbacks, design responses and operational measures recorded in the cited evidence and approved submission package.",
        sourceIds: ["LEP:2.3", "DCP:DCP-1", "upload-plan"],
      },
    ],
    conclusion: {
      narrative:
        "Subject to the documented mitigation measures, completion of identified specialist inputs and operator confirmation of every cited control, the evidence supports progression of the proposal for submission review.",
      sourceIds: ["LEP:2.3", "DCP:DCP-1", "upload-plan", "upload-environment"],
    },
    limitations: [
      "The compiled draft is limited to the registered evidence and remains subject to rendered-output and operator acceptance.",
    ],
    generatedAt: "2026-08-21T01:02:00.000Z",
  };
};

describe("submission SEE section compilation", () => {
  it.each([
    ["BYRON", "SP3"],
    ["KEMPSEY", "E2"],
  ] as const)("compiles eight canonical core sections for %s %s", (lgaCode, zoneCode) => {
    const result = compileSubmissionSeeSections(makeInput(lgaCode, zoneCode));

    expect(result).toMatchObject({
      status: "ready",
      ready: true,
      issues: [],
      draft: {
        kind: "submission_see_draft",
        sections: expect.arrayContaining([
          expect.objectContaining({ id: "executive_summary" }),
          expect.objectContaining({ id: "environmental_impacts" }),
          expect.objectContaining({ id: "section_4_15_evaluation" }),
          expect.objectContaining({ id: "conclusion" }),
        ]),
      },
    });
    expect(result.draft.sections).toHaveLength(8);
    expect(
      result.draft.sections.every(
        (section) =>
          section.narrative.length >= 80 && section.sourceIds.length > 0,
      ),
    ).toBe(true);
  });

  it("blocks a stale DPP and Quick Site Check chain", () => {
    const input = makeInput("BYRON", "SP3");
    input.preSeeMemo.sourceDetailedPlanningPack!.artefactId = "stale-dpp";

    expect(compileSubmissionSeeSections(input)).toMatchObject({
      status: "blocked",
      ready: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "dpp_mismatch" }),
      ]),
    });
  });

  it("omits environmental effects without complete impact evidence", () => {
    const input = makeInput("KEMPSEY", "E2");
    input.impactAssessments = [];

    const result = compileSubmissionSeeSections(input);

    expect(result.status).toBe("blocked");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing_impact_assessment" }),
        expect.objectContaining({ code: "incomplete_section_set" }),
      ]),
    );
    expect(result.draft.sections.map((section) => section.id)).not.toContain(
      "environmental_impacts",
    );
  });

  it("blocks invented source identifiers", () => {
    const input = makeInput("BYRON", "SP3");
    input.siteAndSurrounds.sourceIds = ["invented-source"];

    const result = compileSubmissionSeeSections(input);

    expect(result.status).toBe("blocked");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unknown_source" }),
        expect.objectContaining({ code: "weak_site_assessment" }),
      ]),
    );
  });

  it("blocks planning controls whose citations are not registered", () => {
    const input = makeInput("KEMPSEY", "E2");
    input.knownSourceIds = input.knownSourceIds.filter(
      (sourceId) => sourceId !== "LEP:2.3",
    );

    const result = compileSubmissionSeeSections(input);

    expect(result.status).toBe("blocked");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unknown_source" }),
        expect.objectContaining({ code: "uncited_planning_control" }),
      ]),
    );
  });

  it("keeps a simple proposal proportional by omitting unsupported optional sections", () => {
    const result = compileSubmissionSeeSections(makeInput("BYRON", "SP3"));
    const ids = result.draft.sections.map((section) => section.id);

    expect(ids).not.toContain("application_history");
    expect(ids).not.toContain("assessment_pathway_referrals");
    expect(ids).not.toContain("variations_and_merit");
    expect(ids).not.toContain("appendices_supporting_evidence");
    expect(result.draft.standardVersion).toBe("see-builder-standard.v1");
  });

  it("adds pathway, history, variation and appendix sections only when cited", () => {
    const input = makeInput("KEMPSEY", "E2");
    input.applicationHistory = {
      narrative:
        "The registered evidence records an earlier consent and modification affecting the current access arrangement, and the present assessment carries that history forward without treating it as proof of current controls.",
      sourceIds: ["upload-plan"],
    };
    input.assessmentPathway = {
      narrative:
        "The proposal requires development consent from the recorded consent authority, with the cited evidence identifying the assessment pathway and any referral questions that must be resolved before lodgement.",
      sourceIds: ["LEP:2.3", "DCP:DCP-1"],
    };
    input.variations = [
      {
        controlRef: "DCP-1",
        kind: "dcp_departure",
        requirement:
          "The cited control establishes a numerical built-form outcome for this development type.",
        proposedOutcome:
          "The current plans record a site-responsive alternative built-form outcome.",
        quantifiedDeparture: "A 0.5 metre numerical departure is recorded.",
        objectives:
          "The control objectives seek an appropriate relationship to the street, adjoining development and the established locality character.",
        siteSpecificMerit:
          "The constrained site geometry and retained landscape response allow the objective to be achieved without transferring unreasonable effects to adjoining land.",
        environmentalEffects:
          "The cited assessment identifies no material additional privacy, overshadowing, visual or access effect arising solely from the numerical departure.",
        mitigation:
          "Retain the cited setbacks, landscape screening and final design dimensions.",
        separateRequestRequired: false,
        sourceIds: ["DCP:DCP-1", "upload-plan"],
      },
    ];
    input.appendices = [
      {
        title: "Current proposal plans",
        description:
          "The registered current-site proposal plans relied upon by the assessment.",
        sourceIds: ["upload-plan"],
      },
    ];

    const result = compileSubmissionSeeSections(input);
    const ids = result.draft.sections.map((section) => section.id);

    expect(result.ready).toBe(true);
    expect(ids).toEqual(
      expect.arrayContaining([
        "application_history",
        "assessment_pathway_referrals",
        "variations_and_merit",
        "appendices_supporting_evidence",
      ]),
    );
    expect(
      result.draft.sections.find(
        (section) => section.id === "variations_and_merit",
      )?.narrative,
    ).toMatch(/site-specific merit/i);
  });

  it("integrates an exact specialist report and blocks unresolved conflicts", () => {
    const input = makeInput("BYRON", "SP3");
    input.specialistReports = [
      {
        title: "Traffic and parking assessment",
        sourceId: "upload-environment",
        siteMatched: true,
        proposalRevisionMatched: true,
        pageReferences: ["Section 4", "Page 18"],
        findings:
          "The report assesses the current access, parking demand and servicing layout against the proposal plans for the confirmed site.",
        recommendations:
          "Retain the documented access geometry and servicing management measures.",
        limitations: ["Final detailed design remains subject to consent conditions."],
        conflicts: [],
      },
    ];

    const accepted = compileSubmissionSeeSections(input);
    expect(accepted.ready).toBe(true);
    expect(
      accepted.draft.sections.find(
        (section) => section.id === "environmental_impacts",
      )?.narrative,
    ).toMatch(/Traffic and parking assessment.*Section 4.*Recommendations:/);

    input.specialistReports[0]!.conflicts = [
      "The architectural plan revision does not match the traffic report.",
    ];
    const blocked = compileSubmissionSeeSections(input);
    expect(blocked.ready).toBe(false);
    expect(blocked.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "specialist_conflict" }),
      ]),
    );
  });

  it("requires a dedicated merit assessment when source evidence signals a departure", () => {
    const input = makeInput("KEMPSEY", "E2");
    input.preSeeMemo.consistencyAssessment[1]!.assessment =
      "The proposal records a numerical DCP departure that requires a site-specific merit assessment.";

    const result = compileSubmissionSeeSections(input);

    expect(result.ready).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing_variation_assessment" }),
      ]),
    );
  });

});
