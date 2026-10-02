import assert from "node:assert/strict";
import test from "node:test";
import type { SubmissionSeeCandidate } from "../src/lib/submission-see-acceptance";
import { REQUIRED_SUBMISSION_SEE_SECTIONS } from "../src/lib/submission-see-acceptance";
import type { WorkingSeeRenderContext } from "../src/lib/submission-see-renderer";
import { createWorkingSeeGenerationHandler } from "../src/lib/see-document-generation";
import { WorkingSeeSourceError } from "../src/lib/see-document-generation-sources";
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

function setup(council: "BYRON" | "KEMPSEY" = "BYRON") {
  const prepared = { ...sample(council), purchaseId: "purchase-" + council, sourceSignature: "a".repeat(64) };
  const calls: string[] = [];
  const deps: Parameters<typeof createWorkingSeeGenerationHandler>[0] = {
    deploymentEnvironment: "preview", enabled: true,
    getActorId: async () => { calls.push("auth"); return "owner"; },
    prepare: async (scope) => {
      calls.push("prepare"); assert.equal(scope.actorId, "owner");
      return prepared;
    },
    save: async (scope, input, snapshot) => {
      calls.push("save"); assert.equal(scope.projectId, snapshot.projectId);
      assert.equal(input.sourceSignature, prepared.sourceSignature);
      return { ...snapshot, secretMustNotEscape: "private-value" };
    },
  };
  const body = { acknowledgeWorkingDocument: true,
    sourceDetailedPlanningPackArtefactId: prepared.candidate.sourceDetailedPlanningPack.artefactId,
    sourceMemoArtefactId: "memo-" + council };
  const request = (data: unknown = body, origin = "https://preview.example") =>
    new Request("https://preview.example/api/projects/" + prepared.candidate.projectId + "/working-see/generate", {
      method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(data),
    });
  return { deps, prepared, calls, body, request, projectId: prepared.candidate.projectId };
}

for (const council of ["BYRON", "KEMPSEY"] as const) {
  test(council + " generates real in-memory DOCX/PDF and returns metadata only", async () => {
    const f = setup(council);
    const response = await createWorkingSeeGenerationHandler(f.deps)(f.request(), f.projectId);
    assert.equal(response.status, 201);
    const text = await response.text();
    assert.equal(text.includes("base64"), false);
    assert.equal(text.includes("private-value"), false);
    assert.equal(text.includes("purchaseScopeKey"), false);
    const body = JSON.parse(text);
    assert.equal(body.version.projectId, f.projectId);
    assert.equal(body.version.council, council);
    assert.equal(body.version.submissionReady, false);
    assert.deepEqual(body.version.files.map((file: { format: string }) => file.format), ["DOCX", "PDF"]);
    assert.deepEqual(f.calls, ["auth", "prepare", "save"]);
  });
}

test("Production, absent environment and disabled generation stop before authentication", async () => {
  for (const patch of [{ deploymentEnvironment: "production" }, { deploymentEnvironment: undefined }, { enabled: false }]) {
    const f = setup(); Object.assign(f.deps, patch);
    assert.equal((await createWorkingSeeGenerationHandler(f.deps)(f.request(), f.projectId)).status, 404);
    assert.deepEqual(f.calls, []);
  }
});

test("cross-origin request stops before session or database access", async () => {
  const f = setup();
  assert.equal((await createWorkingSeeGenerationHandler(f.deps)(f.request(f.body, "https://attacker.example"), f.projectId)).status, 400);
  assert.deepEqual(f.calls, []);
});

test("browser cannot provide a candidate, grant, file bytes or source proof", async () => {
  for (const extra of ["candidate", "grant", "snapshot", "officialSources", "purchaseId"]) {
    const f = setup();
    const response = await createWorkingSeeGenerationHandler(f.deps)(f.request({ ...f.body, [extra]: "forged" }), f.projectId);
    assert.equal(response.status, 400); assert.deepEqual(f.calls, []);
  }
});

test("working-document acknowledgement and exact source identifiers are required", async () => {
  for (const patch of [{ acknowledgeWorkingDocument: false }, { sourceMemoArtefactId: "" },
    { sourceDetailedPlanningPackArtefactId: "../other" }]) {
    const f = setup();
    assert.equal((await createWorkingSeeGenerationHandler(f.deps)(f.request({ ...f.body, ...patch }), f.projectId)).status, 400);
    assert.deepEqual(f.calls, []);
  }
});

test("bounded request rejects oversized payload before authentication", async () => {
  const f = setup();
  const response = await createWorkingSeeGenerationHandler(f.deps)(
    f.request({ ...f.body, sourceMemoArtefactId: "x".repeat(2000) }), f.projectId);
  assert.equal(response.status, 400); assert.deepEqual(f.calls, []);
});

test("anonymous and development-bypass users never reach source preparation", async () => {
  for (const actor of [null, "dev-bypass-user"]) {
    const f = setup(); f.deps.getActorId = async () => actor;
    assert.equal((await createWorkingSeeGenerationHandler(f.deps)(f.request(), f.projectId)).status, 401);
    assert.deepEqual(f.calls, []);
  }
});

test("missing source proof returns a safe actionable code and creates no files", async () => {
  const f = setup();
  f.deps.prepare = async () => { throw new WorkingSeeSourceError("source_evidence_missing"); };
  const response = await createWorkingSeeGenerationHandler(f.deps)(f.request(), f.projectId);
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "source_evidence_missing" });
  assert.equal(f.calls.includes("save"), false);
});

test("source assembler cannot substitute another project or selected planning pack", async () => {
  for (const field of ["project", "pack"]) {
    const f = setup();
    if (field === "project") f.prepared.candidate.projectId = "another";
    else f.prepared.candidate.sourceDetailedPlanningPack.artefactId = "another";
    const response = await createWorkingSeeGenerationHandler(f.deps)(f.request(), f.projectId);
    assert.equal(response.status, 409); assert.equal(f.calls.includes("save"), false);
  }
});

test("source revalidation or private persistence failure is not a successful generation", async () => {
  const f = setup();
  f.deps.save = async () => { throw new Error("token-private-secret"); };
  const response = await createWorkingSeeGenerationHandler(f.deps)(f.request(), f.projectId);
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "generation_unavailable" });
  assert.match(response.headers.get("cache-control")!, /no-store/);
});

test("saving a different version is rejected", async () => {
  const f = setup();
  f.deps.save = async (_scope, _input, snapshot) => ({ ...snapshot, versionId: "b".repeat(64) });
  assert.equal((await createWorkingSeeGenerationHandler(f.deps)(f.request(), f.projectId)).status, 409);
});
