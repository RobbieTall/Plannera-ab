import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { createWorkingSeeVersionList, createWorkingSeeVersionListHandler } from "../src/lib/see-document-version-list";
import { readSavedSeeVersion, readSavedSeeVersionPage, WORKING_SEE_MIME } from "../src/lib/see-document-version-summary";
import { fetchSavedSeeFile, fetchSavedSeeVersions } from "../src/lib/see-document-download-client";
import { WORKING_SEE_POINTER_SOURCE } from "../src/lib/see-document-storage-loader";

type ProjectQuery = {
  where: {
    id: string;
    OR: Array<{ userId?: string; createdById?: string; collaborators?: { some: { userId: string } } }>;
  };
};
type ArtefactListQuery = {
  where: { projectId: string; type?: string; source?: string; OR?: unknown[] };
  take?: number;
  orderBy?: Array<{ createdAt?: "desc"; id?: "desc" }>;
};
type PointerQuery = { where: { payload: { equals: string } } };

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const bytes = { DOCX: "PKsynthetic-file-contract-only", PDF: "%PDF-synthetic-file-contract-only" };
function fixture(council: "BYRON" | "KEMPSEY" = "BYRON") {
  const projectId = "project-" + council.toLowerCase();
  const qsc = "qsc-" + council;
  const dpp = "dpp-" + council;
  const fingerprint = sha("synthetic proposal");
  const scopeKey = ["owner", projectId, qsc, fingerprint, "submission_see", "v1"].join(":");
  const metadata = {
    schema: "working-see-private-pointer.v1", versionId: sha(council), projectId,
    purchaseId: "purchase-" + council, siteId: "site-" + council, council,
    sourceQuickSiteCheckArtefactId: qsc, sourceDetailedPlanningPackArtefactId: dpp,
    generatedAt: "2026-09-29T00:00:00.000Z", rendererVersion: "see-presentation.v2",
    documentReference: "SEE-" + council, readiness: "WORKING_SEE", submissionReady: false,
    evidenceStatus: "MORE_EVIDENCE_REQUIRED",
    warnings: ["WORKING SEE - NOT SUBMISSION READY", "A current survey is still required."],
    files: (["DOCX", "PDF"] as const).map((format) => ({
      format, mimeType: WORKING_SEE_MIME[format],
      byteLength: Buffer.byteLength(bytes[format]), contentHash: sha(bytes[format]),
    })),
  };
  const purchase = {
    id: metadata.purchaseId, userId: "owner", projectId, quickSiteCheckArtefactId: qsc,
    proposalFingerprint: fingerprint, productCode: "submission_see", productVersion: "v1",
    currency: "AUD", status: "PAID", paidAt: new Date(metadata.generatedAt), scopeKey,
  };
  const entitlement = {
    ...purchase, purchaseId: purchase.id, status: "ACTIVE", activeScopeKey: scopeKey,
  };
  const state = {
    accessible: true, purchase, entitlement, originalSources: true,
    rows: [{ id: "see_01", projectId, createdAt: new Date(metadata.generatedAt), payload: metadata }],
  };
  const calls: string[] = [];
  const queries: ArtefactListQuery[] = [];
  const prisma = {
    project: { findFirst: async (query: ProjectQuery) => {
      calls.push("project");
      assert.equal(query.where.id, projectId);
      assert.ok(query.where.OR.some((entry) => entry.collaborators?.some?.userId === "owner"));
      return state.accessible ? { id: projectId, userId: "owner", createdById: "owner" } : null;
    } },
    artefact: {
      findMany: async (query: ArtefactListQuery) => {
        if (query.where.type === "working_see") {
          calls.push("list"); queries.push(query);
          assert.equal(query.where.projectId, projectId);
          assert.equal(query.where.source, WORKING_SEE_POINTER_SOURCE);
          assert.equal(query.take, 11);
          assert.deepEqual(query.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
          return state.rows.slice(0, 11);
        }
        calls.push("sources");
        return state.originalSources ? [
          { id: qsc, projectId, type: "quick_site_check" },
          { id: dpp, projectId, type: "detailed_planning_pack" },
        ] : [];
      },
      findFirst: async (query: PointerQuery) => {
        calls.push("pointer");
        const row = state.rows.find((entry) => entry.payload.versionId === query.where.payload.equals);
        return row ? { ...row, source: WORKING_SEE_POINTER_SOURCE } : null;
      },
    },
    purchase: { findUnique: async () => { calls.push("purchase"); return state.purchase; } },
    entitlement: { findFirst: async () => { calls.push("entitlement"); return state.entitlement; } },
  };
  return {
    projectId, metadata, calls, state, queries,
    deps: {
      deploymentEnvironment: "preview",
      prisma: prisma as unknown as Parameters<typeof createWorkingSeeVersionList>[0]["prisma"],
    },
  };
}
const request = (query = "") => new Request("https://preview.example/api/working-see" + query);
const signal = () => new AbortController().signal;

test("metadata projection never forwards storage locations, purchase keys or bytes", () => {
  const f = fixture();
  const result = readSavedSeeVersion({
    ...f.metadata, secret: "not-forwarded", storageUrl: "https://private.invalid", purchaseScopeKey: "private",
    files: f.metadata.files.map((file) => ({ ...file, base64: "not-forwarded" })),
  }, f.projectId);
  assert.ok(result);
  const json = JSON.stringify(result);
  for (const forbidden of ["not-forwarded", "private.invalid", "purchaseId", "purchaseScopeKey", "base64"]) {
    assert.equal(json.includes(forbidden), false);
  }
  assert.deepEqual(result.warnings, f.metadata.warnings);
});
test("metadata rejects swapped projects, duplicate formats and submission-ready claims", () => {
  const f = fixture();
  for (const changes of [
    { projectId: "other-project" }, { files: [f.metadata.files[0], f.metadata.files[0]] },
    { submissionReady: true }, { readiness: "SUBMISSION_READY" }, { warnings: [] },
    { generatedAt: "invalid" }, { evidenceStatus: "UNKNOWN" }, { versionId: "../key" },
    { files: [{ ...f.metadata.files[0], byteLength: 5 * 1024 * 1024 }, f.metadata.files[1]] },
  ]) assert.equal(readSavedSeeVersion({ ...f.metadata, ...changes }, f.projectId), null);
});
test("page parser rejects cross-project or duplicate versions and unbounded pages", () => {
  const f = fixture();
  assert.equal(readSavedSeeVersionPage({ versions: [f.metadata], nextCursor: null }, "other"), null);
  assert.equal(readSavedSeeVersionPage({ versions: [f.metadata, f.metadata], nextCursor: null }, f.projectId), null);
  assert.equal(readSavedSeeVersionPage({ versions: Array(11).fill(f.metadata), nextCursor: null }, f.projectId), null);
  assert.equal(readSavedSeeVersionPage({ versions: [], nextCursor: "https://untrusted.invalid" }, f.projectId), null);
});
test("Production, bypass and invalid cursor stop list before any database access", async () => {
  for (const [environment, actorId, cursor] of [
    ["production", "owner", null], ["preview", "dev-bypass-user", null],
    ["preview", "owner", "../other"], ["preview", "owner", "2026-09-29T00:00:00.000Z~../key"],
  ] as const) {
    const f = fixture();
    const result = await createWorkingSeeVersionList({ ...f.deps, deploymentEnvironment: environment })({
      actorId, projectId: f.projectId, cursor,
    });
    assert.equal(result, null); assert.deepEqual(f.calls, []);
  }
});
test("denied membership stops before metadata and purchase lookup", async () => {
  const f = fixture(); f.state.accessible = false;
  assert.equal(await createWorkingSeeVersionList(f.deps)({ actorId: "owner", projectId: f.projectId }), null);
  assert.deepEqual(f.calls, ["project"]);
});
test("independent Byron and Kempsey versions retain their own warnings and source bindings", async () => {
  for (const council of ["BYRON", "KEMPSEY"] as const) {
    const f = fixture(council);
    const result = await createWorkingSeeVersionList(f.deps)({ actorId: "owner", projectId: f.projectId });
    assert.equal(result?.versions.length, 1);
    assert.equal(result?.versions[0].council, council);
    assert.equal(result?.versions[0].sourceDetailedPlanningPackArtefactId, "dpp-" + council);
    assert.deepEqual(result?.versions[0].warnings, f.metadata.warnings);
    assert.deepEqual(f.calls, ["project", "list", "project", "pointer", "purchase", "entitlement", "sources"]);
  }
});
test("revoked or wrong-product versions do not appear as downloadable", async () => {
  for (const change of ["revoked", "unpaid", "wrong-product", "missing-source"]) {
    const f = fixture();
    if (change === "revoked") f.state.entitlement.status = "REVOKED";
    if (change === "unpaid") f.state.purchase.status = "PENDING";
    if (change === "wrong-product") f.state.purchase.productCode = "planning_controls_pack";
    if (change === "missing-source") f.state.originalSources = false;
    assert.deepEqual(await createWorkingSeeVersionList(f.deps)({ actorId: "owner", projectId: f.projectId }),
      { versions: [], nextCursor: null });
  }
});
test("pagination is bounded and retains project scope plus timestamp/id tie breaker", async () => {
  const f = fixture();
  f.state.rows = Array.from({ length: 11 }, (_, index) => ({
    ...f.state.rows[0], id: "see_" + index, payload: { ...f.metadata, versionId: sha(String(index)) },
  }));
  const result = await createWorkingSeeVersionList(f.deps)({ actorId: "owner", projectId: f.projectId });
  assert.equal(result?.versions.length, 10);
  assert.equal(result?.nextCursor, f.metadata.generatedAt + "~see_9");
  await createWorkingSeeVersionList(f.deps)({ actorId: "owner", projectId: f.projectId, cursor: result?.nextCursor });
  const query = f.queries[1];
  assert.deepEqual(query.where.OR, [
    { createdAt: { lt: new Date(f.metadata.generatedAt) } },
    { createdAt: new Date(f.metadata.generatedAt), id: { lt: "see_9" } },
  ]);
  assert.equal(query.where.projectId, f.projectId);
});
test("list rechecks membership and entitlement on refresh", async () => {
  const f = fixture(); const list = createWorkingSeeVersionList(f.deps);
  assert.equal((await list({ actorId: "owner", projectId: f.projectId }))?.versions.length, 1);
  f.state.entitlement.status = "REVOKED";
  assert.equal((await list({ actorId: "owner", projectId: f.projectId }))?.versions.length, 0);
  f.state.accessible = false;
  assert.equal(await list({ actorId: "owner", projectId: f.projectId }), null);
});
test("HTTP guard denies Production before session resolution and rejects duplicate cursor inputs", async () => {
  let calls = 0;
  const deps = {
    deploymentEnvironment: "production",
    getActorId: async () => { calls++; return "owner"; },
    loadVersions: async () => { calls++; return { versions: [], nextCursor: null }; },
  };
  assert.equal((await createWorkingSeeVersionListHandler(deps)(request(), "project")).status, 404);
  assert.equal(calls, 0);
  deps.deploymentEnvironment = "preview";
  assert.equal((await createWorkingSeeVersionListHandler(deps)(request("?cursor=a&cursor=b"), "project")).status, 400);
  assert.equal(calls, 0);
});
test("HTTP errors are private and cannot expose provider credentials", async () => {
  const response = await createWorkingSeeVersionListHandler({
    deploymentEnvironment: "preview", getActorId: async () => "owner",
    loadVersions: async () => { throw Error("synthetic-sensitive-value"); },
  })(request(), "project");
  assert.equal(response.status, 503);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("vary"), "Cookie, Authorization");
  assert.equal((await response.text()).includes("synthetic-sensitive-value"), false);
});
test("HTTP rejects anonymous and development-bypass sessions before list lookup", async () => {
  for (const actorId of [null, "dev-bypass-user"]) {
    let called = false;
    const response = await createWorkingSeeVersionListHandler({
      deploymentEnvironment: "preview", getActorId: async () => actorId,
      loadVersions: async () => { called = true; return null; },
    })(request(), "project");
    assert.equal(response.status, 401); assert.equal(called, false);
  }
});
test("browser list request is same-origin/no-store and validates project identity", async () => {
  const f = fixture();
  const fetcher: typeof fetch = async (url, options) => {
    assert.equal(url, "/api/projects/" + f.projectId + "/working-see");
    assert.equal(options?.credentials, "same-origin");
    assert.equal(options?.mode, "same-origin");
    assert.equal(options?.cache, "no-store");
    assert.equal(options?.redirect, "error");
    return Response.json({ versions: [f.metadata], nextCursor: null });
  };
  assert.equal((await fetchSavedSeeVersions(f.projectId, null, signal(), fetcher)).versions.length, 1);
  await assert.rejects(fetchSavedSeeVersions("other-project", null, signal(), async () =>
    Response.json({ versions: [f.metadata], nextCursor: null })));
});
test("both original formats pass byte-count/hash checks with exact-version URLs", async () => {
  for (const council of ["BYRON", "KEMPSEY"] as const) {
    const f = fixture(council);
    const version = readSavedSeeVersion(f.metadata, f.projectId)!;
    for (const format of ["DOCX", "PDF"] as const) {
      const result = await fetchSavedSeeFile(version, format, signal(), async (url, options) => {
        assert.equal(url, "/api/projects/" + f.projectId + "/working-see/" + version.versionId + "/download?format=" + format);
        assert.equal(options?.redirect, "error");
        return new Response(bytes[format], { headers: { "content-type": WORKING_SEE_MIME[format] } });
      });
      assert.equal(Buffer.from(result.bytes).toString(), bytes[format]);
      assert.ok(result.filename.includes(f.projectId + "-" + version.versionId));
    }
  }
});
test("browser download rejects substituted, truncated, oversized and wrong-type bodies", async () => {
  const f = fixture(); const version = readSavedSeeVersion(f.metadata, f.projectId)!;
  for (const response of [
    new Response(bytes.PDF.replace("synthetic", "different"), { headers: { "content-type": WORKING_SEE_MIME.PDF } }),
    new Response(bytes.PDF.slice(0, -1), { headers: { "content-type": WORKING_SEE_MIME.PDF } }),
    new Response(bytes.PDF + "x", { headers: { "content-type": WORKING_SEE_MIME.PDF } }),
    new Response("<html>Sign in</html>", { headers: { "content-type": "text/html" } }),
    new Response("denied", { status: 401 }),
  ]) await assert.rejects(fetchSavedSeeFile(version, "PDF", signal(), async () => response));
});
test("browser download does not mistake provider errors or redirects for files", async () => {
  const f = fixture(); const version = readSavedSeeVersion(f.metadata, f.projectId)!;
  const redirected = new Response(bytes.PDF, { headers: { "content-type": WORKING_SEE_MIME.PDF } });
  Object.defineProperty(redirected, "redirected", { value: true });
  await assert.rejects(fetchSavedSeeFile(version, "PDF", signal(), async () => redirected));
  await assert.rejects(fetchSavedSeeVersions(f.projectId, null, signal(), async () =>
    new Response("provider-secret", { status: 503 })), (error: Error) => !error.message.includes("provider-secret"));
});
