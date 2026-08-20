import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  REQUIRED_SUBMISSION_SEE_SECTIONS,
  assessSubmissionSee,
  type SubmissionSeeCandidate,
} from "../src/lib/submission-see-acceptance";
import { renderSubmissionSeeOutputs } from "../src/lib/submission-see-renderer";

const hash = (character: string) => character.repeat(64);

const candidate: SubmissionSeeCandidate = {
  documentType: "statement_of_environmental_effects",
  productCode: "submission_see",
  priceAud: 749,
  commercialMode: "preview",
  projectId: "synthetic-render-review",
  generatedAt: "2026-08-21T03:00:00.000Z",
  site: {
    label: "Synthetic Byron acceptance site",
    confirmedSiteId: "synthetic-byron-site",
    addressFingerprint: hash("d"),
    lgaCode: "BYRON",
    zoneCode: "SP3",
    spatialProvenance: {
      status: "verified",
      authoritative: true,
      serviceUrl:
        "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
      featureIdentifier: "OBJECTID:824345",
      resolvedAt: "2026-08-21T03:00:00.000Z",
      limitations: [],
    },
  },
  proposalSummary:
    "The synthetic proposal comprises a commercial development with documented built form, access, servicing, operating parameters and site works for controlled output review.",
  sourceDetailedPlanningPack: {
    projectId: "synthetic-render-review",
    artefactId: "synthetic-dpp",
    commercialReady: true,
    unresolvedTopics: [],
    lgaCode: "BYRON",
    zoneCode: "SP3",
    sourceQuickSiteCheckArtefactId: "synthetic-qsc",
  },
  sources: [
    {
      id: "lep",
      type: "LEP",
      title: "Byron Local Environmental Plan 2014",
      officialUrl:
        "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2014-0297",
      retrievedAt: "2026-08-21T03:00:00.000Z",
    },
    {
      id: "dcp",
      type: "DCP",
      title: "Byron Development Control Plan 2014",
      officialUrl:
        "https://www.byron.nsw.gov.au/Council/Plans-Strategies/Planning-Development-Strategies/Byron-Shire-Development-Control-Plan-2014",
      retrievedAt: "2026-08-21T03:00:00.000Z",
    },
    {
      id: "spatial",
      type: "SPATIAL",
      title: "Official NSW zoning feature",
      officialUrl:
        "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
      retrievedAt: "2026-08-21T03:00:00.000Z",
    },
    {
      id: "proposal-plan",
      type: "UPLOAD",
      title: "Synthetic current proposal plan",
      contentHash: hash("a"),
      retrievedAt: "2026-08-21T03:00:00.000Z",
    },
  ],
  sections: REQUIRED_SUBMISSION_SEE_SECTIONS.map((id, index) => ({
    id,
    title: id.replaceAll("_", " "),
    narrative:
      `Section ${index + 1} records a substantive synthetic evidence-based assessment of the proposal, current planning controls, environmental impacts and mitigation measures for controlled rendering review.`,
    sourceIds: ["lep", "dcp", "spatial", "proposal-plan"],
  })),
  uploadEvidence: {
    reviewed: true,
    uploads: [
      {
        id: "proposal-plan",
        name: "synthetic-proposal-plan.pdf",
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
    "Synthetic review artefact only; it contains no customer, address, parcel or credential data.",
  ],
  operatorReview: {
    status: "approved",
    reviewedAt: "2026-08-21T03:01:00.000Z",
    checklistVersion: "submission-see.synthetic.v1",
    unresolvedIssues: [],
  },
};

const outputDirectory = process.env.SUBMISSION_SEE_RENDER_OUTPUT_DIR;
if (!outputDirectory) {
  throw new Error("SUBMISSION_SEE_RENDER_OUTPUT_DIR is required");
}

const rendered = renderSubmissionSeeOutputs(candidate);
const finalAcceptance = assessSubmissionSee({
  ...candidate,
  outputs: rendered.outputs,
});
if (!finalAcceptance.ready) {
  throw new Error(
    `Rendered candidate failed acceptance: ${finalAcceptance.issues
      .map((issue) => issue.code)
      .join(", ")}`,
  );
}

const directory = resolve(outputDirectory);
await mkdir(directory, { recursive: true });
const docxPath = resolve(directory, rendered.outputs[0].fileName);
const pdfPath = resolve(directory, rendered.outputs[1].fileName);
await writeFile(docxPath, rendered.docx);
await writeFile(pdfPath, rendered.pdf);
await writeFile(
  resolve(directory, "manifest.json"),
  JSON.stringify(
    {
      synthetic: true,
      containsCustomerData: false,
      candidateStatus: finalAcceptance.status,
      outputs: rendered.outputs,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(
  "[submission-see-render-smoke]",
  JSON.stringify({
    ready: finalAcceptance.ready,
    synthetic: true,
    outputs: rendered.outputs.map((output) => ({
      format: output.format,
      fileName: output.fileName,
      contentHash: output.contentHash,
      byteLength: output.byteLength,
    })),
  }),
);
