import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test, vi } from "vitest";
import type { PrismaClient, SiteContext, SiteSpatialProvenance } from "@prisma/client";
import { loadSavedWorkingSeeGeneration, type WorkingSeeSourceDatabase } from "./see-document-generation-source-loader";
import { createWorkingSeeSnapshot, readWorkingSeeSnapshot } from "./see-document-delivery";
import { createResolvedSiteProvenanceStorage } from "./site-context-provenance-storage";
import { assessSpatialProvenance, NSW_EPI_ZONING_LAYER_URL } from "./spatial-provenance";

// Test doubles only. No connections, files, actual planning conclusions or cloud writes.
// All source parsers, memo compilation, join validation and rendering remain real.
vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy({}, { get() { throw new Error("Global database access forbidden in integration test"); } }),
}));
vi.mock("@/lib/auth", () => ({
  NEXT_AUTH_SESSION_COOKIE: { name: "test-session" }, authOptions: {},
}));
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const now = new Date("2026-09-29T02:00:00Z");
const earlier = new Date("2026-09-28T02:00:00Z");
const retrieved = new Date("2026-09-29T01:00:00Z");
const later = new Date("2026-10-01T02:00:00Z");
const bodyText = "In-memory source text for testing exact saved-record joins, not a statutory control or real property assessment.";

async function fixture(council: "BYRON" | "KEMPSEY", incompleteControls = false) {
  const name = council === "BYRON" ? "Byron" : "Kempsey";
  const id = (suffix: string) => "join-" + council + "-" + suffix;
  const scope = { actorId: id("owner"), projectId: id("project"),
    sourceDetailedPlanningPackArtefactId: id("dpp"), sourceMemoArtefactId: id("memo") };
  const site: SiteContext = {
    id: id("site"), projectId: scope.projectId, addressInput: id("address"),
    formattedAddress: id("address"), lgaName: name, lgaCode: council,
    parcelId: null, lot: null, planNumber: null, latitude: -30, longitude: 153,
    zone: "R2", createdAt: earlier, updatedAt: earlier,
  };
  const project = { id: scope.projectId, publicId: id("public"), userId: scope.actorId,
    createdById: scope.actorId, isDemo: false, title: id("project"),
    siteContext: site, zoningCode: "R2" };
  const instrumentName = name + " Local Environmental Plan 2014";
  const lepUrl = "https://legislation.nsw.gov.au/view/html/inforce/current/epi-test-" + council;
  const dcpUrl = "https://www." + council.toLowerCase() + ".nsw.gov.au/documents/join-test.pdf";
  const control = { label: "Height", value: "test value", present: true, lepSource: true,
    clauseRef: "4.3", interpretation: bodyText, confidence: "Cited" };
  const unavailable = { label: "Unconfirmed", value: null, present: false, interpretation: "Unconfirmed control." };
  const evidenceSummary = { label: "Cited", detail: "In-memory join exercise", citedControlCount: incompleteControls ? 1 : 3,
    totalControlCount: 3, landUseEntryCount: incompleteControls ? 0 : 1,
    objectiveCount: incompleteControls ? 0 : 1, sourceRef: "cl. 4.3" };
  const qscPayload = {
    projectId: project.id, generatedAt: retrieved.toISOString(),
    site: { address: site.formattedAddress, lga: name, zoneCode: "R2", zoneLabel: "R2" },
    lepInstrument: { name: instrumentName, code: id("lep"), lga: name, source: "ingestion" },
    controls: { heightOfBuilding: control,
      floorSpaceRatio: incompleteControls ? unavailable : { ...control, label: "FSR", clauseRef: "4.4" },
      minimumLotSize: incompleteControls ? unavailable : { ...control, label: "Lot size", clauseRef: "4.1" } },
    permissibility: incompleteControls ? null : { zoneLabel: "R2", permittedWithoutConsent: [],
      permittedWithConsent: ["Example use"], prohibited: [], interpretation: bodyText },
    notes: [], nextSteps: [], lepEvidenceSummary: evidenceSummary,
  };
  const packPayload = {
    packType: "detailed_planning_pack", generatedAt: retrieved.toISOString(), projectId: project.id,
    site: { address: site.formattedAddress, lga: name, lgaCode: council,
      zoneCode: "R2", zoneName: null, zoneLabel: "R2" },
    proposalBrief: "The proposal comprises defined alterations to an existing building with documented access, landscaping, servicing and external works for detailed environmental assessment.",
    sourceQuickSiteCheck: { artefactId: id("qsc"), title: "Saved check", generatedAt: retrieved.toISOString(),
      lepEvidenceSummary: evidenceSummary },
    carriedLepEvidenceSummary: evidenceSummary,
    dcpEvidence: [{ topicId: "landscaping", topicLabel: "Landscaping", status: "Cited",
      reason: bodyText, citations: [{ ref: "DCP A.1", title: "DCP A.1",
        headingPath: ["Local detail"], excerpt: bodyText, score: 1 }] }],
    topicMatrix: [{ topicId: "landscaping", topicLabel: "Landscaping", status: "Cited",
      summary: bodyText, sourceRefs: ["DCP A.1"] }],
    unresolvedTopics: ["Current survey"], consultantReviewQuestions: ["Confirm current survey."],
    nextAction: "Review qualified evidence.", commercialReady: false,
  };
  const qsc = { id: id("qsc"), projectId: project.id, type: "quick_site_check",
    title: "Saved check", payload: qscPayload, staleAt: null, createdAt: retrieved, capturedAt: retrieved };
  const dpp = { ...qsc, id: id("dpp"), type: "detailed_planning_pack", title: "Saved pack", payload: packPayload };
  let memo: Record<string, unknown> | null = null;
  let spatial: SiteSpatialProvenance | null = null;
  const sourceRow = (kind: "LEP" | "DCP", clauseKey = "4.3") => ({
    id: id(kind + "-" + clauseKey), evidenceKind: kind, sourceUrl: kind === "LEP" ? lepUrl : dcpUrl,
    sourceVersion: "version-1", retrievedAt: retrieved, effectiveFrom: null, effectiveTo: null,
    staleAt: later, isCurrentAtAssessment: true, contentHash: sha(bodyText),
    snapshot: { bodyText }, citation: {}, clauseId: kind === "LEP" ? id("clause-" + clauseKey) : null,
    dcpClauseId: kind === "DCP" ? id("dcp-clause") : null,
    clause: kind === "LEP" ? { id: id("clause-" + clauseKey), title: "Control " + clauseKey, clauseKey,
      bodyText, isCurrent: true, effectiveFrom: null, effectiveTo: null, updatedAt: earlier,
      instrument: { name: instrumentName, sourceUrl: lepUrl } } : null,
    dcpClause: kind === "DCP" ? { id: id("dcp-clause"), title: "DCP A.1", ref: "DCP A.1",
      bodyText, lgaCode: council, updatedAt: earlier } : null,
  });
  const binding = { artefactId: dpp.id, assessmentId: id("assessment"),
    evidenceDigest: sha(id("evidence")), scopeKey: id("assessment-scope"),
    assessment: { id: id("assessment"), projectId: project.id, siteContextId: site.id,
      environment: "PREVIEW", isCurrent: true, assessedAt: retrieved, staleAt: later,
      evidenceDigest: sha(id("evidence")), scopeKey: id("assessment-scope"), input: {}, result: {},
      spatialProvenance: { lgaCode: council, zoneCode: "R2", payload: {} },
      evidenceSnapshots: [sourceRow("LEP", "2.3"), sourceRow("LEP", "4.3"),
        sourceRow("LEP", "4.4"), sourceRow("LEP", "4.1"), sourceRow("DCP")],
    } };
  const proposalFingerprint = sha(packPayload.proposalBrief.replace(/\s+/g, " ").trim().toLowerCase());
  const scopeKey = [scope.actorId, project.id, qsc.id, proposalFingerprint, "submission_see", "v1"].join(":");
  const purchase = { id: id("purchase"), userId: scope.actorId, projectId: project.id,
    quickSiteCheckArtefactId: qsc.id, proposalFingerprint, productCode: "submission_see",
    productVersion: "v1", currency: "AUD", status: "PAID", paidAt: retrieved, scopeKey };
  const entitlement = { ...purchase, id: id("entitlement"), purchaseId: purchase.id,
    activeScopeKey: scopeKey, status: "ACTIVE" };
  const calls: string[] = [];
  const memory = {
    project: { findFirst: async () => project, findUnique: async () => project },
    artefact: {
      findMany: async () => [dpp, qsc],
      findUnique: async () => memo,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        memo = { ...data, id: scope.sourceMemoArtefactId, staleAt: null, createdAt: retrieved };
        return memo;
      },
    },
    purchase: { findFirst: async () => { calls.push("purchase"); return purchase; } },
    entitlement: { findFirst: async () => { calls.push("entitlement"); return entitlement; } },
    siteSpatialProvenance: { findFirst: async () => { calls.push("spatial"); return spatial; } },
    pathwayArtefactBinding: { findUnique: async (query: unknown) => {
      calls.push("binding");
      assert.deepEqual(query, { where: { artefactId: dpp.id }, include: { assessment: { include: {
        spatialProvenance: true, evidenceSnapshots: { orderBy: { id: "asc" },
          include: { clause: { include: { instrument: true } }, dcpClause: true } },
      } } } });
      return { ...binding, assessment: { ...binding.assessment, evidenceSnapshots:
        [...binding.assessment.evidenceSnapshots].sort((a, b) => a.id.localeCompare(b.id)) } };
    } },
  };
  const { createPreSeePlanningMemoArtefact } = await import("./artefact-service");
  const unexpected = () => { throw new Error("External evidence service forbidden in test"); };
  await createPreSeePlanningMemoArtefact({
    body: { projectId: project.id, sourceDetailedPlanningPackArtefactId: dpp.id,
      expectedProposalBrief: packPayload.proposalBrief },
    userId: scope.actorId,
    deps: { prisma: memory, buildQuickSiteCheckReport: unexpected, getDCPContext: unexpected,
      getWorkspaceSourceContext: unexpected } as unknown as
      NonNullable<Parameters<typeof createPreSeePlanningMemoArtefact>[0]["deps"]>,
  });
  const retentionDb = {
    async $transaction(fn: (tx: unknown) => Promise<unknown>) {
      return fn({
        siteContext: { findUnique: async () => site },
        siteSpatialProvenance: { upsert: async ({ create }: { create: Record<string, unknown> }) => {
          spatial = { ...create, id: id("spatial"), createdAt: retrieved, effectiveAt: null } as unknown as SiteSpatialProvenance;
          return spatial;
        } },
      });
    },
    siteSpatialProvenance: memory.siteSpatialProvenance,
  } as unknown as Pick<PrismaClient, "$transaction" | "siteSpatialProvenance">;
  const retention = createResolvedSiteProvenanceStorage({ prisma: retentionDb,
    deploymentEnvironment: "preview", enabled: true, now: () => now });
  assert.equal(await retention.retain(site, assessSpatialProvenance({
    zoneCode: "R2", zoningSource: "NSW_EPI_LZN", resolutionMethod: "coordinate_intersection",
    serviceUrl: NSW_EPI_ZONING_LAYER_URL, featureIdentifier: id("feature"),
    resolvedAt: retrieved, coordinates: { lat: -30, lng: 153 }, parcelId: null,
  })), true);
  return { scope, db: memory as unknown as WorkingSeeSourceDatabase, binding, purchase, entitlement,
    qsc, dpp, calls, memo: () => memo!, clearSpatial: () => { spatial = null; } };
}

for (const council of ["BYRON", "KEMPSEY"] as const) {
  test(council + " real parsing and compiler join in-memory records into original working DOCX/PDF", async () => {
    const f = await fixture(council);
    const first = await loadSavedWorkingSeeGeneration(f.db, f.scope, now);
    const second = await loadSavedWorkingSeeGeneration(f.db, f.scope, new Date(now.getTime() + 1000));
    assert.equal(first.sourceSignature, second.sourceSignature);
    assert.equal(first.candidate.projectId, f.scope.projectId);
    assert.equal(first.candidate.site.lgaCode, council);
    const snapshot = createWorkingSeeSnapshot(first);
    assert.equal(snapshot.submissionReady, false);
    assert.deepEqual(readWorkingSeeSnapshot(snapshot), snapshot);
    assert.deepEqual(snapshot.files.map(file => file.format), ["DOCX", "PDF"]);
    assert.ok(snapshot.files.every(file => file.byteLength > 100));
    assert.ok(snapshot.warnings.some(warning => warning.includes("not been independently incorporated")));
  });
}

test("unpaid or revoked scope stops before spatial and assessment records", async () => {
  for (const revoke of [false, true]) {
    const f = await fixture("BYRON");
    if (revoke) f.entitlement.status = "REVOKED"; else f.purchase.status = "PENDING";
    await assert.rejects(loadSavedWorkingSeeGeneration(f.db, f.scope, now), /source_scope_mismatch/);
    assert.equal(f.calls.includes("spatial"), false);
    assert.equal(f.calls.includes("binding"), false);
  }
});
test("missing retained site evidence stops before assessment records", async () => {
  const f = await fixture("KEMPSEY"); f.clearSpatial();
  await assert.rejects(loadSavedWorkingSeeGeneration(f.db, f.scope, now), /source_evidence_missing/);
  assert.equal(f.calls.includes("binding"), false);
});
test("another council assessment is not interchangeable", async () => {
  const f = await fixture("BYRON"); f.binding.assessment.spatialProvenance.lgaCode = "KEMPSEY";
  await assert.rejects(loadSavedWorkingSeeGeneration(f.db, f.scope, now), /source_scope_mismatch/);
});
test("memo from another selected source cannot borrow a paid entitlement", async () => {
  const f = await fixture("BYRON");
  f.memo().projectId = "another-project";
  await assert.rejects(loadSavedWorkingSeeGeneration(f.db, f.scope, now), /source_scope_mismatch/);
  assert.equal(f.calls.includes("purchase"), false);
});
test("changed current clause body and expired snapshots fail closed", async () => {
  for (const expire of [false, true]) {
    const f = await fixture("KEMPSEY");
    const row = f.binding.assessment.evidenceSnapshots.find(item => item.clause)!;
    if (expire) row.staleAt = earlier; else row.clause!.bodyText = "Different source text";
    await assert.rejects(loadSavedWorkingSeeGeneration(f.db, f.scope, now), /source_evidence_unverified/);
  }
});

test("uncited planning assessments remain rejected even when other evidence is present", async () => {
  const f = await fixture("BYRON", true);
  await assert.rejects(loadSavedWorkingSeeGeneration(f.db, f.scope, now), /source_evidence_unverified/);
  assert.equal(f.calls.includes("binding"), true);
});
