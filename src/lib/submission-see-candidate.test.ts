import { describe, expect, it } from "vitest";

import type { SpatialProvenance } from "@/lib/spatial-provenance";
import type {
  DetailedPlanningPackContent,
  WorkspacePreSeePlanningMemoContent,
  WorkspaceSource,
} from "@/types/workspace";

import { REQUIRED_SUBMISSION_SEE_SECTIONS } from "./submission-see-acceptance";
import {
  assembleSubmissionSeeCandidate,
  type SubmissionSeeCandidateInput,
} from "./submission-see-candidate";

const hash = (character: string) => character.repeat(64);

const makePack = (
  lgaCode: "BYRON" | "KEMPSEY",
  zoneCode: "SP3" | "E2",
): DetailedPlanningPackContent => ({
  packType: "detailed_planning_pack",
  generatedAt: "2026-08-21T00:00:00.000Z",
  projectId: `project-${lgaCode.toLowerCase()}`,
  site: {
    address: null,
    lga: lgaCode === "BYRON" ? "Byron Shire" : "Kempsey Shire",
    lgaCode,
    zoneCode,
    zoneName: zoneCode === "SP3" ? "Tourist" : "Commercial Centre",
    zoneLabel: zoneCode === "SP3" ? "SP3 Tourist" : "E2 Commercial Centre",
  },
  proposalBrief:
    "A representative commercial proposal with defined operation, built form, access, servicing and site works for evidence-based assessment.",
  sourceQuickSiteCheck: {
    artefactId: `qsc-${lgaCode.toLowerCase()}`,
    title: "Current cited Quick Site Check",
    generatedAt: "2026-08-21T00:00:00.000Z",
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
      summary: "Current cited DCP control.",
      sourceRefs: ["DCP-1"],
    },
  ],
  unresolvedTopics: [],
  consultantReviewQuestions: [],
  nextAction: "Prepare submission SEE.",
  commercialReady: true,
});

const makeSpatial = (zoneCode: "SP3" | "E2"): SpatialProvenance =>
  ({
    status: "verified",
    authoritative: true,
    zoneCode,
    zoningSource: "NSW_EPI",
    resolutionMethod: "coordinate_intersection",
    serviceUrl:
      "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
    layerUrl:
      "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
    featureIdentifier:
      zoneCode === "SP3" ? "OBJECTID:824345" : "OBJECTID:875459",
    resolvedAt: "2026-08-21T00:00:00.000Z",
    query: { coordinates: { lat: -28, lng: 153 }, parcelId: null },
    limitations: [],
  }) as SpatialProvenance;

const makeSource = (): WorkspaceSource => ({
  id: "upload-plan",
  name: "proposal-plan.pdf",
  detail: "Current proposal plan",
  type: "pdf",
  uploadedAt: "2026-08-21T00:00:00.000Z",
  sizeLabel: "120 KB",
  evidenceStatus: "READY",
  indexingStatus: "READY",
  contentHash: hash("a"),
});

const makeInput = (
  lgaCode: "BYRON" | "KEMPSEY",
  zoneCode: "SP3" | "E2",
): SubmissionSeeCandidateInput => {
  const pack = makePack(lgaCode, zoneCode);
  return {
    commercialMode: "preview",
    projectId: pack.projectId,
    confirmedSiteId: `site-${lgaCode.toLowerCase()}`,
    addressFingerprint: hash("d"),
    detailedPlanningPackArtefactId: `dpp-${lgaCode.toLowerCase()}`,
    detailedPlanningPack: pack,
    documentDraft: {
      kind: "submission_see_draft",
      generatedAt: "2026-08-21T00:01:00.000Z",
      sourceDetailedPlanningPackArtefactId: `dpp-${lgaCode.toLowerCase()}`,
      proposalSummary: pack.proposalBrief,
      sections: REQUIRED_SUBMISSION_SEE_SECTIONS.map((id) => ({
        id,
        title: id.replaceAll("_", " "),
        narrative:
          "This section contains a substantive evidence-based assessment of the proposal, current controls, environmental impacts and mitigation for the confirmed site.",
        sourceIds: ["lep", "dcp", "spatial", "upload-plan"],
      })),
      limitations: [
        "Specialist conclusions are limited to the registered evidence and completed operator review.",
      ],
    },
    spatialProvenance: makeSpatial(zoneCode),
    officialSources: [
      {
        id: "lep",
        type: "LEP",
        title: "Current LEP",
        officialUrl:
          "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2014-0297",
        retrievedAt: "2026-08-21T00:00:00.000Z",
      },
      {
        id: "dcp",
        type: "DCP",
        title: "Current DCP",
        officialUrl: "https://www.byron.nsw.gov.au/current-dcp",
        retrievedAt: "2026-08-21T00:00:00.000Z",
      },
      {
        id: "spatial",
        type: "SPATIAL",
        title: "Official NSW zoning feature",
        officialUrl:
          "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
        retrievedAt: "2026-08-21T00:00:00.000Z",
      },
    ],
    workspaceSources: [makeSource()],
    uploadBindings: [
      {
        uploadId: "upload-plan",
        kind: "proposal_plan",
        usedInSections: ["proposed_development", "environmental_impacts"],
      },
    ],
    currentUploadIds: ["upload-plan"],
    outputs: [
      {
        format: "DOCX",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileName: "statement-of-environmental-effects.docx",
        contentHash: hash("b"),
        byteLength: 120_000,
        generatedAt: "2026-08-21T00:02:00.000Z",
      },
      {
        format: "PDF",
        mimeType: "application/pdf",
        fileName: "statement-of-environmental-effects.pdf",
        contentHash: hash("c"),
        byteLength: 160_000,
        generatedAt: "2026-08-21T00:02:00.000Z",
      },
    ],
    operatorReview: {
      status: "approved",
      reviewedAt: "2026-08-21T00:03:00.000Z",
      checklistVersion: "submission-see.v1",
      unresolvedIssues: [],
    },
  };
};

describe("submission SEE candidate assembly", () => {
  it.each([
    ["BYRON", "SP3"],
    ["KEMPSEY", "E2"],
  ] as const)("assembles a complete %s %s evidence chain", (lgaCode, zoneCode) => {
    const result = assembleSubmissionSeeCandidate(makeInput(lgaCode, zoneCode));

    expect(result).toMatchObject({
      status: "ready",
      ready: true,
      assemblyIssues: [],
      acceptance: {
        status: "ready",
        ready: true,
      },
    });
    expect(result.candidate.sources.map((source) => source.type)).toEqual([
      "LEP",
      "DCP",
      "SPATIAL",
      "UPLOAD",
    ]);
  });

  it("does not promote the existing pre-SEE memo", () => {
    const input = makeInput("BYRON", "SP3");
    const memo = {
      memoType: "pre_see_planning_memo",
      generatedAt: "2026-08-21T00:00:00.000Z",
      projectId: input.projectId,
      siteDescription: {
        address: null,
        lga: "Byron Shire",
        zoneCode: "SP3",
        zoneName: "Tourist",
        zoneLabel: "SP3 Tourist",
      },
      proposedWorksSummary: input.detailedPlanningPack.proposalBrief,
      applicableControls: {
        lepInstrument: null,
        permissibility: null,
        quickSiteControls: {},
        dcpClauses: [],
        sourceExcerpts: [],
      },
      consistencyAssessment: [],
      limitations: [
        "This is an MVP pre-SEE planning memo, not a final legal Statement of Environmental Effects.",
      ],
      sourceDetailedPlanningPack: {
        artefactId: input.detailedPlanningPackArtefactId,
        title: "Current DPP",
        generatedAt: input.detailedPlanningPack.generatedAt,
        commercialReady: true,
        sourceQuickSiteCheckArtefactId:
          input.detailedPlanningPack.sourceQuickSiteCheck.artefactId,
      },
    } as WorkspacePreSeePlanningMemoContent;
    input.documentDraft = { kind: "pre_see_planning_memo", memo };

    const result = assembleSubmissionSeeCandidate(input);

    expect(result.status).toBe("blocked");
    expect(result.assemblyIssues).toContainEqual(
      expect.objectContaining({ code: "pre_see_source" }),
    );
    expect(result.acceptance.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "wrong_document_type",
        "wrong_product",
        "wrong_price",
        "declared_non_final",
      ]),
    );
  });

  it("blocks a draft bound to the wrong DPP", () => {
    const input = makeInput("KEMPSEY", "E2");
    if (input.documentDraft.kind !== "submission_see_draft") {
      throw new Error("Expected submission draft");
    }
    input.documentDraft.sourceDetailedPlanningPackArtefactId = "stale-dpp";

    expect(assembleSubmissionSeeCandidate(input)).toMatchObject({
      status: "blocked",
      ready: false,
      assemblyIssues: [
        expect.objectContaining({ code: "dpp_source_mismatch" }),
      ],
    });
  });

  it("blocks ready current uploads that are not section-bound", () => {
    const input = makeInput("BYRON", "SP3");
    input.uploadBindings = [];

    const result = assembleSubmissionSeeCandidate(input);

    expect(result.status).toBe("blocked");
    expect(result.assemblyIssues).toContainEqual(
      expect.objectContaining({ code: "missing_upload_binding" }),
    );
    expect(result.acceptance.issues.map((issue) => issue.code)).toContain(
      "unready_upload_evidence",
    );
  });

  it("blocks stale, unreadable, or unindexed upload evidence", () => {
    const input = makeInput("KEMPSEY", "E2");
    input.currentUploadIds = [];
    input.workspaceSources[0]!.evidenceStatus = "PARTIALLY_READABLE";
    input.workspaceSources[0]!.indexingStatus = "FAILED";

    expect(
      assembleSubmissionSeeCandidate(input).acceptance.issues.map(
        (issue) => issue.code,
      ),
    ).toContain("unready_upload_evidence");
  });
  it("carries privacy-safe exact-site binding into acceptance", () => {
    const input = makeInput("BYRON", "SP3");
    input.addressFingerprint = "invalid";

    const result = assembleSubmissionSeeCandidate(input);

    expect(result.status).toBe("blocked");
    expect(result.acceptance.issues).toContainEqual(
      expect.objectContaining({ code: "missing_site" }),
    );
  });

});
