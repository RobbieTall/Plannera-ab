import assert from "node:assert/strict";
import { test } from "node:test";
import type { SubmissionSeeCandidate } from "../src/lib/submission-see-acceptance";
import { REQUIRED_SUBMISSION_SEE_SECTIONS } from "../src/lib/submission-see-acceptance";
import type { WorkingSeeRenderContext } from "../src/lib/submission-see-renderer";
import {
  createWorkingSeeSnapshot, downloadWorkingSeeSnapshot, readWorkingSeeSnapshot,
  WorkingSeeDeliveryError, type WorkingSeeSnapshot,
} from "../src/lib/see-document-delivery";
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

function sample(council: "BYRON" | "KEMPSEY" = "BYRON") {
  const candidate = makeCandidate();
  candidate.projectId = "synthetic-" + council;
  candidate.site.confirmedSiteId = "synthetic-site-" + council;
  candidate.site.label = "Synthetic " + council + " document delivery fixture";
  candidate.site.lgaCode = council;
  candidate.sourceDetailedPlanningPack.projectId = candidate.projectId;
  candidate.sourceDetailedPlanningPack.lgaCode = council;
  candidate.sourceDetailedPlanningPack.artefactId = "synthetic-dpp-" + council;
  candidate.sourceDetailedPlanningPack.sourceQuickSiteCheckArtefactId = "synthetic-qsc-" + council;
  candidate.sourceDetailedPlanningPack.commercialReady = false;
  const context = makeWorkingContext(candidate.sourceDetailedPlanningPack.artefactId);
  candidate.sourceDetailedPlanningPack.unresolvedTopics = [context.outstandingEvidence[0].topic];
  candidate.limitations = [context.documentReadiness.customerMessage, "Synthetic evidence only; not submission-ready."];
  candidate.operatorReview = { status: "not_reviewed", reviewedAt: null, checklistVersion: null, unresolvedIssues: [] };
  candidate.sources[0].title = council + " synthetic LEP fixture";
  candidate.sources[0].officialUrl = "https://legislation.nsw.gov.au/";
  candidate.sources[1].title = council + " synthetic DCP fixture";
  candidate.sources[1].officialUrl = council === "BYRON" ? "https://www.byron.nsw.gov.au/" : "https://www.kempsey.nsw.gov.au/";
  return { candidate, workingContext: context, purchaseScopeKey: "synthetic-paid-scope-" + council };
}
function request(snapshot: WorkingSeeSnapshot) {
  return {
    deploymentEnvironment: "preview",
    actorId: "synthetic-owner",
    projectId: snapshot.projectId,
    versionId: snapshot.versionId,
    format: "DOCX",
    loadAuthorisedSnapshot: async () => ({
      snapshot,
      grant: { actorId: "synthetic-owner", projectId: snapshot.projectId,
        versionId: snapshot.versionId, purchaseScopeKey: snapshot.purchaseScopeKey,
        status: "ACTIVE" as const },
    }),
  };
}
const hasCode = (code: string) => (error: unknown) =>
  error instanceof WorkingSeeDeliveryError && error.code === code;

import { createWorkingSeeDownloadHandler } from "../src/lib/see-document-http";
import { createPrivateWorkingSeeReader, MAX_WORKING_SEE_SNAPSHOT_BYTES } from "../src/lib/see-document-private-reader";
import type { GetBlobResult } from "@vercel/blob";

test("HTTP route serves original project-specific DOCX and PDF bytes", async () => {
  for (const council of ["BYRON", "KEMPSEY"] as const) {
    const snapshot = createWorkingSeeSnapshot(sample(council));
    for (const format of ["DOCX", "PDF"]) {
      const handler = createWorkingSeeDownloadHandler({
        deploymentEnvironment: "preview",
        getActorId: async () => "real-user",
        loadAuthorisedSnapshot: async () => ({
          snapshot,
          grant: { actorId: "real-user", projectId: snapshot.projectId,
            versionId: snapshot.versionId, purchaseScopeKey: snapshot.purchaseScopeKey, status: "ACTIVE" },
        }),
      });
      const response = await handler(new Request("https://preview.example/download?format=" + format),
        { projectId: snapshot.projectId, versionId: snapshot.versionId });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-plannera-document-version"), snapshot.versionId);
      assert.match(response.headers.get("cache-control")!, /no-store/);
      assert.match(response.headers.get("content-disposition")!, /attachment/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()),
        Buffer.from(snapshot.files[format === "DOCX" ? 0 : 1].base64, "base64"));
    }
  }
});
test("HTTP Production guard does not resolve a session or storage", async () => {
  let calls = 0;
  const response = await createWorkingSeeDownloadHandler({
    deploymentEnvironment: "production", getActorId: async () => { calls++; return "user"; },
    loadAuthorisedSnapshot: async () => { calls++; return null; },
  })(new Request("https://example.com/?format=PDF"), { projectId: "project", versionId: "a".repeat(64) });
  assert.equal(response.status, 404); assert.equal(calls, 0);
});
test("HTTP authentication failures and bypass identities deny before storage", async () => {
  for (const actorId of [null, "dev-bypass-user"]) {
    let reads = 0;
    const response = await createWorkingSeeDownloadHandler({
      deploymentEnvironment: "preview", getActorId: async () => actorId,
      loadAuthorisedSnapshot: async () => { reads++; return null; },
    })(new Request("https://example.com/?format=PDF"), { projectId: "project", versionId: "a".repeat(64) });
    assert.equal(response.status, 401); assert.equal(reads, 0);
  }
});
test("HTTP malformed and duplicated format values do not read storage", async () => {
  for (const query of ["", "?format=html", "?format=PDF&format=DOCX"]) {
    let reads = 0;
    const response = await createWorkingSeeDownloadHandler({
      deploymentEnvironment: "preview", getActorId: async () => "user",
      loadAuthorisedSnapshot: async () => { reads++; return null; },
    })(new Request("https://example.com/" + query), { projectId: "project", versionId: "a".repeat(64) });
    assert.equal(response.status, 400); assert.equal(reads, 0);
  }
});
test("HTTP storage errors cannot disclose sensitive error text", async () => {
  const response = await createWorkingSeeDownloadHandler({
    deploymentEnvironment: "preview", getActorId: async () => "user",
    loadAuthorisedSnapshot: async () => { throw new Error("synthetic-sensitive-provider-detail"); },
  })(new Request("https://example.com/?format=PDF"), { projectId: "project", versionId: "a".repeat(64) });
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("synthetic-sensitive"), false);
  assert.match(response.headers.get("cache-control")!, /no-store/);
});
test("HTTP denied scope is opaque and never offers a storage URL", async () => {
  const response = await createWorkingSeeDownloadHandler({
    deploymentEnvironment: "preview", getActorId: async () => "user",
    loadAuthorisedSnapshot: async () => null,
  })(new Request("https://example.com/?format=PDF"), { projectId: "project", versionId: "a".repeat(64) });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Document not found" });
});

const path = "working-see/v1/" + "a".repeat(64) + "/" + "b".repeat(64) + ".json";
function blob(value = '{"synthetic":true}'): GetBlobResult {
  const bytes = new TextEncoder().encode(value);
  return {
    statusCode: 200, headers: new Headers(),
    stream: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }),
    blob: {
      url: "https://synthetic.private.blob.vercel-storage.com/" + path,
      downloadUrl: "https://synthetic.private.blob.vercel-storage.com/" + path,
      pathname: path, size: bytes.length, contentType: "application/json",
      contentDisposition: "attachment", cacheControl: "no-store",
      uploadedAt: new Date("2026-09-29T00:00:00Z"), etag: "synthetic",
    },
  };
}
test("private reader uses private origin reads and returns parsed data", async () => {
  const read = createPrivateWorkingSeeReader({
    deploymentEnvironment: "preview",
    get: async (pathname, options) => {
      assert.equal(pathname, path); assert.equal(options.access, "private");
      assert.equal(options.useCache, false); assert.ok(options.abortSignal);
      return blob();
    },
  });
  assert.deepEqual(await read(path), { synthetic: true });
});
test("private reader rejects Production and caller-controlled URLs before SDK access", async () => {
  for (const [environment, pathname] of [["production", path], ["preview", "https://example.com/document"]]) {
    let calls = 0;
    const read = createPrivateWorkingSeeReader({
      deploymentEnvironment: environment, get: async () => { calls++; return blob(); },
    });
    await assert.rejects(read(pathname), /private_document_unavailable/); assert.equal(calls, 0);
  }
});
test("private reader rejects public storage, mismatched path and oversized metadata", async () => {
  for (const change of [
    { url: "https://synthetic.public.blob.vercel-storage.com/" + path },
    { pathname: "another-project.json" }, { size: MAX_WORKING_SEE_SNAPSHOT_BYTES + 1 },
    { contentType: "text/html" },
  ]) {
    const result = blob(); Object.assign(result.blob, change);
    await assert.rejects(createPrivateWorkingSeeReader({
      deploymentEnvironment: "preview", get: async () => result,
    })(path), /private_document_unavailable/);
  }
});
test("private reader detects a stream larger than its advertised size and invalid JSON", async () => {
  for (const result of [blob(), blob("not-json")]) {
    if (result.blob.contentType === "application/json" && result.blob.size === 18) result.blob.size = 1;
    await assert.rejects(createPrivateWorkingSeeReader({
      deploymentEnvironment: "preview", get: async () => result,
    })(path), /private_document_unavailable/);
  }
});
