import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  REQUIRED_SUBMISSION_SEE_SECTIONS,
  assessSubmissionSee,
  type SubmissionSeeCandidate,
} from "./submission-see-acceptance";
import {
  renderSubmissionSeeOutputs,
  renderWorkingSeeOutputs,
  type WorkingSeeRenderContext,
} from "./submission-see-renderer";

const hash = (character: string) => character.repeat(64);

const makeCandidate = (): SubmissionSeeCandidate => ({
  documentType: "statement_of_environmental_effects",
  productCode: "submission_see",
  priceAud: 749,
  commercialMode: "preview",
  projectId: "project-render",
  generatedAt: "2026-08-21T02:00:00.000Z",
  site: {
    label: "Confirmed acceptance site",
    confirmedSiteId: "site-render",
    addressFingerprint: hash("d"),
    lgaCode: "BYRON",
    zoneCode: "SP3",
    spatialProvenance: {
      status: "verified",
      authoritative: true,
      serviceUrl:
        "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
      featureIdentifier: "OBJECTID:824345",
      resolvedAt: "2026-08-21T02:00:00.000Z",
      limitations: [],
    },
  },
  proposalSummary:
    "The proposal comprises a defined commercial development with documented built form, access, servicing, operating parameters and site works for environmental assessment.",
  sourceDetailedPlanningPack: {
    projectId: "project-render",
    artefactId: "dpp-render",
    commercialReady: true,
    unresolvedTopics: [],
    lgaCode: "BYRON",
    zoneCode: "SP3",
    sourceQuickSiteCheckArtefactId: "qsc-render",
  },
  sources: [
    {
      id: "lep",
      type: "LEP",
      title: "Byron Local Environmental Plan 2014",
      officialUrl:
        "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2014-0297",
      retrievedAt: "2026-08-21T02:00:00.000Z",
    },
    {
      id: "dcp",
      type: "DCP",
      title: "Byron Development Control Plan 2014",
      officialUrl: "https://www.byron.nsw.gov.au/current-dcp",
      retrievedAt: "2026-08-21T02:00:00.000Z",
    },
    {
      id: "spatial",
      type: "SPATIAL",
      title: "Official NSW zoning feature",
      officialUrl:
        "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
      retrievedAt: "2026-08-21T02:00:00.000Z",
    },
    {
      id: "upload-plan",
      type: "UPLOAD",
      title: "Current proposal plan",
      contentHash: hash("a"),
      retrievedAt: "2026-08-21T02:00:00.000Z",
    },
  ],
  sections: REQUIRED_SUBMISSION_SEE_SECTIONS.map((id) => ({
    id,
    title: id.replaceAll("_", " "),
    narrative:
      "This section contains a substantive evidence-based assessment of the proposal, current planning controls, environmental impacts and mitigation measures for the confirmed site.",
    sourceIds: ["lep", "dcp", "spatial", "upload-plan"],
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
  outputs: [],
  limitations: [
    "The assessment is limited to the registered evidence and approved operator checklist.",
  ],
  operatorReview: {
    status: "approved",
    reviewedAt: "2026-08-21T02:01:00.000Z",
    checklistVersion: "submission-see.v1",
    unresolvedIssues: [],
  },
});

const makeWorkingContext = (
  sourceDetailedPlanningPackArtefactId = "dpp-render",
): WorkingSeeRenderContext => ({
  documentReadiness: {
    state: "WORKING_SEE",
    evidenceStatus: "MORE_EVIDENCE_REQUIRED",
    submissionReady: false,
    customerMessage:
      "Start your SEE now. Strengthen it as new evidence arrives. This working SEE identifies unconfirmed matters and is not submission-ready.",
  },
  outstandingEvidence: [
    {
      id: "survey-gap",
      topic: "Legal side boundary setback remains unconfirmed",
      status: "MORE_EVIDENCE_REQUIRED",
      recommendedEvidence:
        "Provide a current detail survey reconciled to the registered plan.",
      effect:
        "The setback assessment remains qualified and cannot be represented as submission-ready.",
    },
  ],
  sourceDetailedPlanningPackArtefactId,
  predecessorDetailedPlanningPackArtefactId: null,
});

const storedZipEntries = (archive: Buffer) => {
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (
    offset + 30 <= archive.length &&
    archive.readUInt32LE(offset) === 0x04034b50
  ) {
    const method = archive.readUInt16LE(offset + 8);
    const size = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + size;
    expect(method).toBe(0);
    expect(dataEnd).toBeLessThanOrEqual(archive.length);
    const name = archive.subarray(nameStart, nameStart + nameLength).toString("utf8");
    entries.set(name, archive.subarray(dataStart, dataEnd));
    offset = dataEnd;
  }
  return entries;
};

describe("submission SEE rendering", () => {
  it("creates a structurally complete DOCX package", () => {
    const rendered = renderSubmissionSeeOutputs(makeCandidate());
    const entries = storedZipEntries(rendered.docx);

    expect(rendered.docx.subarray(0, 2).toString("ascii")).toBe("PK");
    expect([...entries.keys()]).toEqual(
      expect.arrayContaining([
        "[Content_Types].xml",
        "_rels/.rels",
        "word/document.xml",
        "word/styles.xml",
        "word/footer1.xml",
        "word/_rels/document.xml.rels",
        "docProps/core.xml",
        "docProps/app.xml",
      ]),
    );
    const document = entries.get("word/document.xml")!.toString("utf8");
    expect(document).toContain("Statement of Environmental Effects");
    expect(document).toContain("Source Register");
    expect(document).toContain("Environmental Impacts");
    expect(document).not.toContain("Update this field in Word");
    expect(document).not.toContain('<w:br w:type="page"/>');
    expect(document).not.toContain(' TOC \\o "1-2" ');
  });

  it("creates a paginated PDF with a valid cross-reference location", () => {
    const rendered = renderSubmissionSeeOutputs(makeCandidate());
    const pdf = rendered.pdf.toString("latin1");

    expect(pdf.startsWith("%PDF-1.7")).toBe(true);
    expect(pdf).toContain("STATEMENT OF");
    expect(pdf).toContain("ENVIRONMENTAL EFFECTS");
    expect(pdf).toContain("Executive Summary");
    expect(pdf).toContain("Source Register");
    const contentStreams = [
      ...pdf.matchAll(/stream\n([\s\S]*?)\nendstream/g),
    ].map((match) => match[1] ?? "");
    const impactsStream = contentStreams.find((stream) =>
      stream.includes("(Environmental Impacts)"),
    );
    expect(impactsStream).toBeDefined();
    const impactsOffset = impactsStream!.indexOf("(Environmental Impacts)");
    expect(impactsStream!.slice(impactsOffset)).toContain("(Sources:");
    expect(pdf.endsWith("%%EOF\n")).toBe(true);

    const startXref = /startxref\n(\d+)\n%%EOF/.exec(pdf);
    expect(startXref).not.toBeNull();
    const xrefOffset = Number(startXref![1]);
    expect(pdf.slice(xrefOffset, xrefOffset + 4)).toBe("xref");
  });

  it("returns exact hashes and output metadata that complete acceptance", () => {
    const candidate = makeCandidate();
    const rendered = renderSubmissionSeeOutputs(candidate);

    expect(rendered.outputs.map((output) => output.format)).toEqual([
      "DOCX",
      "PDF",
    ]);
    expect(rendered.outputs[0].contentHash).toBe(
      createHash("sha256").update(rendered.docx).digest("hex"),
    );
    expect(rendered.outputs[1].contentHash).toBe(
      createHash("sha256").update(rendered.pdf).digest("hex"),
    );
    expect(rendered.outputs[0].byteLength).toBe(rendered.docx.length);
    expect(rendered.outputs[1].byteLength).toBe(rendered.pdf.length);

    expect(
      assessSubmissionSee({ ...candidate, outputs: rendered.outputs }),
    ).toMatchObject({ status: "ready", ready: true, issues: [] });
  });

  it("is deterministic for the same accepted candidate", () => {
    const candidate = makeCandidate();
    const first = renderSubmissionSeeOutputs(candidate);
    const second = renderSubmissionSeeOutputs(candidate);

    expect(first.docx.equals(second.docx)).toBe(true);
    expect(first.pdf.equals(second.pdf)).toBe(true);
    expect(first.outputs).toEqual(second.outputs);
  });

  it("renders a visibly qualified working DOCX/PDF without weakening final acceptance", () => {
    const candidate = makeCandidate();
    const context = makeWorkingContext();
    candidate.sourceDetailedPlanningPack.commercialReady = false;
    candidate.sourceDetailedPlanningPack.unresolvedTopics = [
      context.outstandingEvidence[0]!.topic,
    ];
    candidate.limitations = [
      context.documentReadiness.customerMessage,
      "This is a working SEE and is not submission-ready.",
    ];
    candidate.operatorReview = {
      status: "not_reviewed",
      reviewedAt: null,
      checklistVersion: null,
      unresolvedIssues: ["Final evidence and operator review remain outstanding."],
    };

    expect(() => renderSubmissionSeeOutputs(candidate)).toThrow(/unready_dpp/);
    const rendered = renderWorkingSeeOutputs(candidate, context);
    expect(rendered.outputs[0].fileName).toBe(
      "working-statement-of-environmental-effects-site-render.docx",
    );
    expect(rendered.outputs[1].fileName).toBe(
      "working-statement-of-environmental-effects-site-render.pdf",
    );

    const entries = storedZipEntries(rendered.docx);
    expect(entries.get("word/document.xml")!.toString("utf8")).toContain(
      "WORKING SEE - NOT SUBMISSION READY",
    );
    expect(entries.get("word/footer1.xml")!.toString("utf8")).toContain(
      "WORKING SEE - NOT SUBMISSION READY",
    );
    expect(rendered.pdf.toString("latin1")).toContain(
      "WORKING SEE - NOT SUBMISSION READY",
    );

    const acceptance = assessSubmissionSee({
      ...candidate,
      outputs: rendered.outputs,
    });
    expect(acceptance.ready).toBe(false);
    expect(new Set(acceptance.issues.map((issue) => issue.code))).toEqual(
      new Set([
        "unready_dpp",
        "declared_non_final",
        "operator_review_incomplete",
      ]),
    );
  });

  it("refuses hard identity and commercial-mode faults in working output", () => {
    const candidate = makeCandidate();
    const context = makeWorkingContext();
    candidate.sourceDetailedPlanningPack.commercialReady = false;
    candidate.sourceDetailedPlanningPack.unresolvedTopics = [
      context.outstandingEvidence[0]!.topic,
    ];
    candidate.limitations = [
      context.documentReadiness.customerMessage,
      "This working SEE is not submission-ready.",
    ];
    candidate.operatorReview.status = "not_reviewed";
    candidate.operatorReview.reviewedAt = null;
    candidate.operatorReview.checklistVersion = null;

    candidate.sourceDetailedPlanningPack.projectId = "wrong-project";
    expect(() => renderWorkingSeeOutputs(candidate, context)).toThrow(
      /broken_dpp_chain/,
    );

    candidate.sourceDetailedPlanningPack.projectId = candidate.projectId;
    candidate.commercialMode = "production";
    expect(() => renderWorkingSeeOutputs(candidate, context)).toThrow(
      /unsafe_commercial_mode/,
    );
  });

  it("refuses Production mode, incomplete sections and unapproved review", () => {
    const production = makeCandidate();
    production.commercialMode = "production";
    expect(() => renderSubmissionSeeOutputs(production)).toThrow(
      /unsafe_commercial_mode/,
    );

    const incomplete = makeCandidate();
    incomplete.sections = incomplete.sections.slice(0, -1);
    expect(() => renderSubmissionSeeOutputs(incomplete)).toThrow(
      /missing_section/,
    );

    const unreviewed = makeCandidate();
    unreviewed.operatorReview.status = "not_reviewed";
    unreviewed.operatorReview.reviewedAt = null;
    unreviewed.operatorReview.checklistVersion = null;
    expect(() => renderSubmissionSeeOutputs(unreviewed)).toThrow(
      /operator_review_incomplete/,
    );
  });
});
