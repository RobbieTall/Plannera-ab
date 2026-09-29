import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildSubmissionSeePresentation } from "./submission-see-presentation";

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
        "word/header1.xml",
        "word/footer1.xml",
        "word/_rels/document.xml.rels",
        "docProps/core.xml",
        "docProps/app.xml",
      ]),
    );
    const document = entries.get("word/document.xml")!.toString("utf8");
    expect(document).toContain("Statement of Environmental Effects");
    expect(document).toContain("Document Control");
    expect(document).toContain("Proposal Summary");
    expect(document).toContain("1. Executive Summary");
    expect(document).toContain("Supporting Evidence Schedule");
    expect(document).toContain("Source Register");
    expect(document).toContain("Environmental Impacts");
    expect(document).toContain("<w:tbl>");
    expect(document).not.toContain("Project: synthetic-render-review");
    expect(entries.get("word/_rels/document.xml.rels")!.toString("utf8")).toContain(
      "relationships/styles",
    );
    expect(entries.get("word/header1.xml")!.toString("utf8")).toContain("PLANNERA");
    expect(entries.get("word/header1.xml")!.toString("utf8")).toContain("Confirmed acceptance site");
    expect(document).not.toContain("Update this field in Word");
    const hardPageBreaks = document.match(/<w:br w:type="page"\/>/g)?.length ?? 0;
    expect(hardPageBreaks).toBeGreaterThanOrEqual(5);
    expect(hardPageBreaks).toBeLessThan(REQUIRED_SUBMISSION_SEE_SECTIONS.length + 3);
    expect(document).not.toContain(' TOC \\o "1-2" ');
  });

  it("creates a paginated PDF with a valid cross-reference location", () => {
    const rendered = renderSubmissionSeeOutputs(makeCandidate());
    const pdf = rendered.pdf.toString("latin1");

    expect(pdf.startsWith("%PDF-1.7")).toBe(true);
    expect(pdf).toContain("Statement of Environmental Effects");
    expect(pdf).toContain("DOCUMENT CONTROL");
    expect(pdf).toContain("CONTENTS");
    expect(pdf).toContain("1. Executive Summary");
    expect(pdf).toContain("Supporting Evidence Schedule");
    expect(pdf).toContain("Source Register");
    expect(pdf).toContain("PLANNERA");
    expect(pdf).not.toContain("Project synthetic-render-review");
    const contentStreams = [
      ...pdf.matchAll(/stream\n([\s\S]*?)\nendstream/g),
    ].map((match) => match[1] ?? "");
    const impactsStream = contentStreams.find((stream) =>
      stream.includes("(6. Environmental Impacts)") && stream.includes("(Evidence used)"),
    );
    expect(impactsStream).toBeDefined();
    const impactsOffset = impactsStream!.indexOf("(6. Environmental Impacts)");
    expect(impactsStream!.slice(impactsOffset)).toContain("(Evidence used)");
    const impactsEvidence = impactsStream!.slice(impactsOffset);
    expect(impactsEvidence).toContain("lep - Byron Local Environmental Plan 2014");
    expect(impactsEvidence).toContain("dcp - Byron Development Control Plan 2014");
    expect(impactsEvidence).toContain("spatial - Official NSW zoning feature");
    expect(impactsEvidence).toContain("upload-plan - Current proposal plan");
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

  it("renders optional canonical sections without forcing unrelated boilerplate", () => {
    const candidate = makeCandidate();
    candidate.sections.splice(3, 0, {
      id: "variations_and_merit",
      title: "Variations, Departures And Merit Justification",
      narrative:
        "The cited DCP departure is quantified and assessed against the control objectives, site-specific circumstances, environmental effects and retained mitigation, without asserting that this SEE replaces any separate legal request.",
      sourceIds: ["lep", "dcp", "upload-plan"],
    });

    const rendered = renderSubmissionSeeOutputs(candidate);
    const entries = storedZipEntries(rendered.docx);

    expect(entries.get("word/document.xml")!.toString("utf8")).toContain(
      "Variations, Departures And Merit Justification",
    );
    expect(rendered.pdf.includes("Variations,")).toBe(true);
    expect(rendered.outputs).toHaveLength(2);
  });

});

describe("reconciled SEE presentation", () => {
  it("preserves revision disclosure, native Word contents, styles and exact statutory labels", () => {
    const output = renderSubmissionSeeOutputs(makeCandidate());
    const entries = storedZipEntries(output.docx);
    const xml = entries.get("word/document.xml")!.toString("utf8");
    expect(xml).toContain("Revision History");
    expect(xml).toContain("Only the current generated issue is shown. Prior versions are not inferred");
    expect(xml).toContain(' TOC \\o "1-1" \\h \\z ');
    expect(xml).toContain('<w:fldChar w:fldCharType="separate"/>');
    expect(xml).toContain('<w:pStyle w:val="ContentsHeading"/>');
    expect(xml).toContain("<w:cantSplit/>");
    expect(xml).toContain("<w:tblHeader/>");
    expect(xml).toContain("Section 4.15 Evaluation");
    expect(xml).not.toContain("Section 4 15");
    expect(entries.get("word/settings.xml")!.toString()).toContain('<w:updateFields w:val="true"/>');
    const relationships = entries.get("word/_rels/document.xml.rels")!.toString();
    expect(relationships).toContain('Target="styles.xml"');
    expect(relationships).toContain('Target="settings.xml"');
    expect(output.pdf.toString("latin1")).toContain("Revision History");
    expect(output.pdf.toString("latin1")).toContain("Section 4.15 Evaluation");
  });

  it("numbers PDF contents from the actual layout rather than fixed page estimates", () => {
    const candidate = makeCandidate();
    candidate.sections[0]!.narrative = "A longer cited planning assessment is retained without inventing evidence. ".repeat(85);
    const pdf = renderSubmissionSeeOutputs(candidate).pdf.toString("latin1");
    const streams = [...pdf.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((match) => match[1]!);
    const toc = streams.find((stream) => stream.includes("(CONTENTS)"))!;
    for (const [number, title] of [["1", "Executive Summary"], ["6", "Environmental Impacts"], ["7", "Section 4.15 Evaluation"], ["C", "Source Register"]]) {
      const label = number + ". " + title;
      const target = streams.findIndex((stream) => stream.includes("(SECTION " + number + ")") && stream.includes("(" + label + ")"));
      const titleLine = toc.split("\n").find((line) => line.includes("(" + label + ")"))!;
      const baseline = /54\.00 ([\d.]+) Tm/.exec(titleLine)![1];
      const pageLine = toc.split("\n").find((line) => line.includes("517.00 " + baseline + " Tm"))!;
      expect(Number(/\((\d+)\) Tj/.exec(pageLine)![1])).toBe(target + 1);
      expect(target).toBeGreaterThan(0);
    }
  });

  it("keeps warnings and uses a neutral predecessor label without inventing document history", () => {
    const candidate = makeCandidate();
    const context = makeWorkingContext();
    context.predecessorDetailedPlanningPackArtefactId = "earlier-evidence-reference";
    candidate.sourceDetailedPlanningPack.commercialReady = false;
    candidate.sourceDetailedPlanningPack.unresolvedTopics = [context.outstandingEvidence[0]!.topic];
    candidate.limitations = [context.documentReadiness.customerMessage, "This working SEE is not submission-ready."];
    candidate.operatorReview = { status: "not_reviewed", reviewedAt: null, checklistVersion: null, unresolvedIssues: [] };
    const output = renderWorkingSeeOutputs(candidate, context);
    const xml = storedZipEntries(output.docx).get("word/document.xml")!.toString();
    for (const text of [xml, output.pdf.toString("latin1")]) {
      expect(text).toContain("Earlier evidence reference");
      expect(text).not.toContain("Strengthens DPP");
      expect(text).toContain("WORKING SEE - NOT SUBMISSION READY");
      expect(text).toContain("Outstanding Evidence");
    }
    expect(assessSubmissionSee({ ...candidate, outputs: output.outputs }).ready).toBe(false);
  });

  it("binds the document reference to project, evidence and renderer, not mutable output metadata", () => {
    const candidate = makeCandidate();
    const model = buildSubmissionSeePresentation({ candidate });
    expect(model.documentReference).toMatch(/^SEE-[A-F0-9]{16}$/);
    expect(model.revisionHistory[0]!.value).toBe("Current generated issue");
    const reordered = Object.fromEntries(Object.entries(candidate).reverse()) as SubmissionSeeCandidate;
    expect(buildSubmissionSeePresentation({ candidate: reordered }).documentReference).toBe(model.documentReference);
    const output = renderSubmissionSeeOutputs(candidate);
    expect(buildSubmissionSeePresentation({ candidate: { ...candidate, outputs: output.outputs } }).documentReference).toBe(model.documentReference);
    expect(buildSubmissionSeePresentation({ candidate: { ...candidate, projectId: "different-project" } }).documentReference).not.toBe(model.documentReference);
    const updated = structuredClone(candidate);
    updated.sections[0]!.narrative += " Additional supported assessment is now recorded.";
    expect(buildSubmissionSeePresentation({ candidate: updated }).documentReference).not.toBe(model.documentReference);
    expect(storedZipEntries(output.docx).get("docProps/core.xml")!.toString()).toContain(model.documentReference);
    expect(output.pdf.toString("latin1")).toContain(model.documentReference);
  });

  it.each(["BYRON", "KEMPSEY"])("renders an independent %s fixture with its own identity", (lga) => {
    const candidate = makeCandidate();
    candidate.projectId = "synthetic-" + lga;
    candidate.site.label = "Synthetic " + lga + " review site";
    candidate.site.lgaCode = lga;
    candidate.site.confirmedSiteId = "synthetic-site-" + lga;
    candidate.sourceDetailedPlanningPack.projectId = candidate.projectId;
    candidate.sourceDetailedPlanningPack.lgaCode = lga;
    candidate.sources[0]!.title = lga + " synthetic LEP fixture";
    candidate.sources[0]!.officialUrl = "https://legislation.nsw.gov.au/";
    candidate.sources[1]!.title = lga + " synthetic DCP fixture";
    candidate.sources[1]!.officialUrl = lga === "BYRON" ? "https://www.byron.nsw.gov.au/" : "https://www.kempsey.nsw.gov.au/";
    const output = renderSubmissionSeeOutputs(candidate);
    const xml = storedZipEntries(output.docx).get("word/document.xml")!.toString();
    expect(xml).toContain(candidate.site.label);
    expect(output.pdf.toString("latin1")).toContain(candidate.site.label);
    expect(output.outputs.every((file) => file.fileName.includes(candidate.site.confirmedSiteId.toLowerCase()))).toBe(true);
  });

  it("retains oversized source and limitation text within PDF page bounds", () => {
    const candidate = makeCandidate();
    candidate.limitations = ["A recorded evidence qualification remains visible. ".repeat(400) + " LIMITATION-END"];
    candidate.sources[1]!.title = "Long source reference text ".repeat(300) + " SOURCE-END";
    const pdf = renderSubmissionSeeOutputs(candidate).pdf.toString("latin1");
    expect(pdf).toContain("LIMITATION-END");
    expect(pdf).toContain("SOURCE-END");
    const textPositions = [...pdf.matchAll(/1 0 0 1 ([\d.]+) (-?[\d.]+) Tm/g)];
    for (const match of textPositions) {
      expect(Number(match[2])).toBeGreaterThanOrEqual(20);
      expect(Number(match[2])).toBeLessThanOrEqual(820);
    }
  });
});
