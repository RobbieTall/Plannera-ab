import { describe, expect, it } from "vitest";

import {
  REQUIRED_SUBMISSION_SEE_SECTIONS,
  assessPreSeeMemoForSubmission,
  assessSubmissionSee,
  type SubmissionSeeCandidate,
} from "./submission-see-acceptance";
import type { WorkspacePreSeePlanningMemoContent } from "@/types/workspace";

const hash = (character: string) => character.repeat(64);

const makeReadyCandidate = (
  lgaCode: "BYRON" | "KEMPSEY",
  zoneCode: "SP3" | "E2",
): SubmissionSeeCandidate => {
  const sourceIds = ["lep", "dcp", "spatial", "upload-plan"];
  return {
    documentType: "statement_of_environmental_effects",
    productCode: "submission_see",
    priceAud: 749,
    commercialMode: "preview",
    projectId: `project-${lgaCode.toLowerCase()}`,
    generatedAt: "2026-08-21T00:00:00.000Z",
    site: {
      label: `${lgaCode} acceptance fixture`,
      confirmedSiteId: `site-${lgaCode.toLowerCase()}`,
      addressFingerprint: hash("d"),
      lgaCode,
      zoneCode,
      spatialProvenance: {
        status: "verified",
        authoritative: true,
        serviceUrl:
          "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
        featureIdentifier: lgaCode === "BYRON" ? "OBJECTID:824345" : "OBJECTID:875459",
        resolvedAt: "2026-08-21T00:00:00.000Z",
        limitations: [],
      },
    },
    proposalSummary:
      "A representative development proposal with sufficient scope, operation, built-form and site-work detail to support evidence-based environmental assessment.",
    sourceDetailedPlanningPack: {
      projectId: `project-${lgaCode.toLowerCase()}`,
      artefactId: `dpp-${lgaCode.toLowerCase()}`,
      commercialReady: true,
      unresolvedTopics: [],
      lgaCode,
      zoneCode,
      sourceQuickSiteCheckArtefactId: `qsc-${lgaCode.toLowerCase()}`,
    },
    sources: [
      {
        id: "lep",
        type: "LEP",
        title: `${lgaCode} current LEP`,
        officialUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/example",
        retrievedAt: "2026-08-21T00:00:00.000Z",
      },
      {
        id: "dcp",
        type: "DCP",
        title: `${lgaCode} current DCP`,
        officialUrl: "https://www.example.nsw.gov.au/current-dcp",
        retrievedAt: "2026-08-21T00:00:00.000Z",
      },
      {
        id: "spatial",
        type: "SPATIAL",
        title: "NSW official zoning feature",
        officialUrl:
          "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
        retrievedAt: "2026-08-21T00:00:00.000Z",
      },
      {
        id: "upload-plan",
        type: "UPLOAD",
        title: "Current proposal plan",
        contentHash: hash("a"),
        retrievedAt: "2026-08-21T00:00:00.000Z",
      },
    ],
    sections: REQUIRED_SUBMISSION_SEE_SECTIONS.map((id) => ({
      id,
      title: id.replaceAll("_", " "),
      narrative:
        "This section records a complete evidence-based assessment of the proposal, current planning controls, relevant impacts and mitigation measures for the confirmed site.",
      sourceIds,
    })),
    uploadEvidence: {
      reviewed: true,
      uploads: [
        {
          id: "upload-plan",
          name: "proposal-plan.pdf",
          kind: "proposal_plan",
          evidenceStatus: "READY",
          indexingStatus: "READY",
          contentHash: hash("a"),
          currentForSite: true,
          usedInSections: ["proposed_development", "environmental_impacts"],
        },
      ],
    },
    outputs: [
      {
        format: "DOCX",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileName: "statement-of-environmental-effects.docx",
        contentHash: hash("b"),
        byteLength: 120_000,
        generatedAt: "2026-08-21T00:01:00.000Z",
      },
      {
        format: "PDF",
        mimeType: "application/pdf",
        fileName: "statement-of-environmental-effects.pdf",
        contentHash: hash("c"),
        byteLength: 160_000,
        generatedAt: "2026-08-21T00:01:00.000Z",
      },
    ],
    limitations: [
      "Planning controls and specialist conclusions remain subject to the recorded operator review.",
    ],
    operatorReview: {
      status: "approved",
      reviewedAt: "2026-08-21T00:02:00.000Z",
      checklistVersion: "submission-see.v1",
      unresolvedIssues: [],
    },
  };
};

const issueCodes = (candidate: SubmissionSeeCandidate) =>
  assessSubmissionSee(candidate).issues.map((issue) => issue.code);

describe("submission-grade SEE acceptance", () => {
  it.each([
    ["BYRON", "SP3"],
    ["KEMPSEY", "E2"],
  ] as const)("accepts a complete %s %s evidence chain", (lgaCode, zoneCode) => {
    const result = assessSubmissionSee(makeReadyCandidate(lgaCode, zoneCode));

    expect(result).toMatchObject({
      status: "ready",
      ready: true,
      evidence: {
        requiredSections: 8,
        acceptedSections: 8,
        citedSources: 4,
        readyUploads: 1,
        outputFormats: ["DOCX", "PDF"],
      },
    });
    expect(result.issues).toEqual([]);
  });

  it("keeps the existing MVP pre-SEE memo blocked", () => {
    const memo = {
      memoType: "pre_see_planning_memo",
      limitations: [
        "This is an MVP pre-SEE planning memo, not a final legal Statement of Environmental Effects.",
      ],
    } as WorkspacePreSeePlanningMemoContent;

    expect(assessPreSeeMemoForSubmission(memo)).toMatchObject({
      status: "blocked",
      ready: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "wrong_document_type" }),
        expect.objectContaining({ code: "declared_non_final" }),
        expect.objectContaining({ code: "missing_output" }),
        expect.objectContaining({ code: "operator_review_incomplete" }),
      ]),
    });
  });

  it("rejects unverified spatial evidence and a broken DPP chain", () => {
    const candidate = makeReadyCandidate("BYRON", "SP3");
    candidate.site.spatialProvenance.status = "partial";
    candidate.site.spatialProvenance.authoritative = false;
    candidate.sourceDetailedPlanningPack.projectId = "another-project";

    expect(issueCodes(candidate)).toEqual(
      expect.arrayContaining(["unverified_spatial_provenance", "broken_dpp_chain"]),
    );
  });

  it("rejects missing controls, incomplete sections, and invented citations", () => {
    const candidate = makeReadyCandidate("KEMPSEY", "E2");
    candidate.sources = candidate.sources.filter((source) => source.type !== "DCP");
    candidate.sections = candidate.sections
      .filter((section) => section.id !== "environmental_impacts")
      .map((section, index) =>
        index === 0 ? { ...section, sourceIds: ["invented-source"] } : section,
      );

    expect(issueCodes(candidate)).toEqual(
      expect.arrayContaining([
        "missing_source_type",
        "missing_section",
        "unknown_citation",
      ]),
    );
  });

  it("rejects unreadable uploads and incomplete output formats", () => {
    const candidate = makeReadyCandidate("BYRON", "SP3");
    candidate.uploadEvidence.uploads[0]!.evidenceStatus = "IMAGE_ONLY";
    candidate.outputs = candidate.outputs.filter((output) => output.format === "PDF");

    expect(issueCodes(candidate)).toEqual(
      expect.arrayContaining(["unready_upload_evidence", "missing_output"]),
    );
  });

  it("rejects production execution, the wrong price, non-final limitations, and incomplete review", () => {
    const candidate = makeReadyCandidate("KEMPSEY", "E2");
    candidate.commercialMode = "production";
    candidate.priceAud = 49;
    candidate.limitations = ["Draft only; not a final submission document."];
    candidate.operatorReview.status = "changes_required";
    candidate.operatorReview.unresolvedIssues = ["Confirm flood assessment."];

    expect(issueCodes(candidate)).toEqual(
      expect.arrayContaining([
        "unsafe_commercial_mode",
        "wrong_price",
        "declared_non_final",
        "operator_review_incomplete",
      ]),
    );
  });
  it("rejects a candidate without exact confirmed-site binding", () => {
    const candidate = makeReadyCandidate("BYRON", "SP3");
    candidate.site.confirmedSiteId = "";
    candidate.site.addressFingerprint = "not-a-sha256";

    expect(issueCodes(candidate)).toContain("missing_site");
  });

});
