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

test("snapshots deterministically bind both binary files, scope, sources, warnings and project", () => {
  const input = sample(), a = createWorkingSeeSnapshot(input), b = createWorkingSeeSnapshot(input);
  assert.deepEqual(a, b);
  assert.equal(a.submissionReady, false);
  assert.equal(a.evidenceStatus, "MORE_EVIDENCE_REQUIRED");
  assert.ok(a.warnings.some((w) => w.includes("survey")));
  assert.equal(a.sourceDetailedPlanningPackArtefactId, input.candidate.sourceDetailedPlanningPack.artefactId);
  assert.equal(a.sourceQuickSiteCheckArtefactId, input.candidate.sourceDetailedPlanningPack.sourceQuickSiteCheckArtefactId);
  assert.notEqual(createWorkingSeeSnapshot({ ...input, purchaseScopeKey: "different-paid-scope" }).versionId, a.versionId);
  const changed = sample(); changed.candidate.sections[0].narrative += " A new supported assessment.";
  assert.notEqual(createWorkingSeeSnapshot(changed).versionId, a.versionId);
});
for (const council of ["BYRON", "KEMPSEY"] as const) {
  test(council + " reopens the saved DOCX and PDF byte-for-byte without rendering", async () => {
    const snapshot = createWorkingSeeSnapshot(sample(council));
    for (const format of ["DOCX", "PDF"]) {
      let reads = 0;
      const input = request(snapshot), loader = input.loadAuthorisedSnapshot;
      const result = await downloadWorkingSeeSnapshot({
        ...input, format, loadAuthorisedSnapshot: async (scope) => {
          reads++;
          assert.deepEqual(scope, { actorId: input.actorId, projectId: snapshot.projectId, versionId: snapshot.versionId });
          return loader();
        },
      });
      assert.equal(reads, 1);
      const stored = snapshot.files[format === "DOCX" ? 0 : 1];
      assert.deepEqual(result.bytes, Buffer.from(stored.base64, "base64"));
      assert.match(result.headers["Content-Disposition"], new RegExp(snapshot.versionId.slice(0, 16)));
      assert.equal(result.headers["Content-Type"], stored.mimeType);
      assert.equal(result.headers["Cache-Control"], "private, no-store, max-age=0");
      assert.equal(result.headers["X-Content-Type-Options"], "nosniff");
      assert.equal(result.headers["X-Plannera-Document-Status"], "WORKING_SEE");
      assert.deepEqual(result.warnings, snapshot.warnings);
    }
  });
}
test("Production, unset environment, missing login and development bypass fail before storage access", async () => {
  const snapshot = createWorkingSeeSnapshot(sample());
  let reads = 0;
  const loader = async (): Promise<null> => { reads++; return null; };
  for (const deploymentEnvironment of [undefined, "production", "development", "test"]) {
    await assert.rejects(downloadWorkingSeeSnapshot({ ...request(snapshot), deploymentEnvironment, loadAuthorisedSnapshot: loader }), hasCode("preview_only"));
  }
  for (const actorId of [null, undefined, "", " ", "dev-bypass-user"]) {
    await assert.rejects(downloadWorkingSeeSnapshot({ ...request(snapshot), actorId, loadAuthorisedSnapshot: loader }), hasCode("unauthenticated"));
  }
  assert.equal(reads, 0);
});
test("invalid version IDs and formats fail before storage access", async () => {
  const snapshot = createWorkingSeeSnapshot(sample());
  let reads = 0;
  const loader = async (): Promise<null> => { reads++; return null; };
  for (const versionId of ["latest", "../other-project", "a".repeat(63), "A".repeat(64)]) {
    await assert.rejects(downloadWorkingSeeSnapshot({ ...request(snapshot), versionId, loadAuthorisedSnapshot: loader }), hasCode("invalid_request"));
  }
  for (const format of ["pdf", "HTML", "PDF\r\nLocation: https://example.invalid"]) {
    await assert.rejects(downloadWorkingSeeSnapshot({ ...request(snapshot), format, loadAuthorisedSnapshot: loader }), hasCode("invalid_request"));
  }
  assert.equal(reads, 0);
});
test("wrong actor, project, version and paid scope are opaque denials", async () => {
  const snapshot = createWorkingSeeSnapshot(sample()), input = request(snapshot);
  for (const replacement of [
    { actorId: "another-owner" }, { projectId: "another-project" },
    { versionId: "b".repeat(64) }, { purchaseScopeKey: "another-purchase-scope" },
  ]) {
    const authorised = await input.loadAuthorisedSnapshot();
    await assert.rejects(downloadWorkingSeeSnapshot({ ...input,
      loadAuthorisedSnapshot: async () => ({ ...authorised, grant: { ...authorised.grant, ...replacement } }),
    }), hasCode("not_found"));
  }
  await assert.rejects(downloadWorkingSeeSnapshot({ ...input, loadAuthorisedSnapshot: async () => null }), hasCode("not_found"));
});
test("access is rechecked for every reopen and revoked access cannot reuse earlier approval", async () => {
  const snapshot = createWorkingSeeSnapshot(sample()), input = request(snapshot);
  let reads = 0;
  const loader = async () => ++reads === 1 ? input.loadAuthorisedSnapshot() : null;
  await downloadWorkingSeeSnapshot({ ...input, loadAuthorisedSnapshot: loader });
  await assert.rejects(downloadWorkingSeeSnapshot({ ...input, loadAuthorisedSnapshot: loader }), hasCode("not_found"));
  assert.equal(reads, 2);
});
test("a council's snapshot cannot be substituted for the other council's version", async () => {
  const byron = createWorkingSeeSnapshot(sample("BYRON")), kempsey = createWorkingSeeSnapshot(sample("KEMPSEY"));
  assert.notEqual(byron.versionId, kempsey.versionId);
  assert.notEqual(byron.documentReference, kempsey.documentReference);
  const input = request(byron), authorised = await input.loadAuthorisedSnapshot();
  await assert.rejects(downloadWorkingSeeSnapshot({ ...input,
    loadAuthorisedSnapshot: async () => ({ ...authorised, snapshot: kempsey }),
  }), hasCode("not_found"));
});
test("changing bytes, manifest, finality, warning schedule or source identity invalidates snapshot", () => {
  const original = createWorkingSeeSnapshot(sample());
  const mutations: Array<(value: WorkingSeeSnapshot) => void> = [
    (v) => { v.files[0].base64 = Buffer.from("not a document").toString("base64"); },
    (v) => { v.files[1].contentHash = "0".repeat(64); },
    (v) => { v.files[1].byteLength++; },
    (v) => { v.files[0].base64 += "\n"; },
    (v) => { v.projectId = "substituted-project"; },
    (v) => { v.council = "KEMPSEY"; },
    (v) => { v.warnings = []; },
    (v) => { v.warnings = ["WORKING SEE - NOT SUBMISSION READY"]; },
    (v) => { v.sourceDetailedPlanningPackArtefactId = "substituted-dpp"; },
    (v) => { v.sourceQuickSiteCheckArtefactId = "substituted-qsc"; },
    (v) => { v.rendererVersion = "another-renderer"; },
    (v) => { v.generatedAt = "not-a-date"; },
    (v) => { (v as unknown as { submissionReady: boolean }).submissionReady = true; },
  ];
  for (const mutate of mutations) {
    const altered = structuredClone(original); mutate(altered);
    assert.throws(() => readWorkingSeeSnapshot(altered), hasCode("invalid_snapshot"));
  }
});
test("missing paid scope, unsupported council, production candidate and unverifiable source evidence cannot create snapshots", () => {
  const input = sample();
  assert.throws(() => createWorkingSeeSnapshot({ ...input, purchaseScopeKey: "" }), hasCode("invalid_snapshot"));
  const other = sample(); other.candidate.site.lgaCode = "OTHER";
  assert.throws(() => createWorkingSeeSnapshot(other), hasCode("invalid_snapshot"));
  const production = sample(); production.candidate.commercialMode = "production";
  assert.throws(() => createWorkingSeeSnapshot(production), /unsafe_commercial_mode/);
  const unverified = sample(); unverified.candidate.site.spatialProvenance.authoritative = false;
  assert.throws(() => createWorkingSeeSnapshot(unverified), /hard acceptance blockers/);
});
test("download filename cannot inject headers and each generation keeps its own original bytes", async () => {
  const input = sample();
  input.candidate.projectId = 'project"\r\nX-Injected: yes';
  input.candidate.sourceDetailedPlanningPack.projectId = input.candidate.projectId;
  const original = createWorkingSeeSnapshot(input);
  input.candidate.sections[0].narrative += " Later evidence adds a qualification.";
  const later = createWorkingSeeSnapshot(input);
  assert.notEqual(original.versionId, later.versionId);
  const result = await downloadWorkingSeeSnapshot(request(original));
  assert.ok(!/[\r\n]/.test(result.headers["Content-Disposition"]));
  assert.deepEqual(result.bytes, Buffer.from(original.files[0].base64, "base64"));
  assert.notDeepEqual(result.bytes, Buffer.from(later.files[0].base64, "base64"));
});
