import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createWorkingSeeSnapshotLoader, workingSeePrivatePath, WORKING_SEE_POINTER_SOURCE,
} from "../src/lib/see-document-storage-loader";

const versionId = "a".repeat(64);
const fingerprint = "b".repeat(64);
const scope = { actorId: "owner", projectId: "project-byron", versionId };
const scopeKey = ["owner", scope.projectId, "qsc-byron", fingerprint, "submission_see", "v1"].join(":");
function fixture() {
  const calls: string[] = [];
  const project = { id: scope.projectId, userId: "owner", createdById: "owner" };
  const metadata = {
    schema: "working-see-private-pointer.v1", versionId, projectId: scope.projectId,
    purchaseId: "purchase-byron", siteId: "site-byron", council: "BYRON",
    sourceQuickSiteCheckArtefactId: "qsc-byron", sourceDetailedPlanningPackArtefactId: "dpp-byron",
  };
  const purchase = {
    id: "purchase-byron", userId: "owner", projectId: scope.projectId,
    quickSiteCheckArtefactId: "qsc-byron", proposalFingerprint: fingerprint,
    productCode: "submission_see", productVersion: "v1", currency: "AUD",
    status: "PAID", paidAt: new Date("2026-09-29T00:00:00Z"), scopeKey,
  };
  const entitlement = {
    ...purchase, purchaseId: purchase.id, status: "ACTIVE", activeScopeKey: scopeKey,
  };
  const state = { accessible: true, project, metadata, purchase, entitlement, sources: true };
  const prisma = {
    project: { findFirst: async (query: any) => {
      calls.push("project");
      assert.deepEqual(query.where.OR, [
        { userId: scope.actorId }, { createdById: scope.actorId },
        { collaborators: { some: { userId: scope.actorId } } },
      ]);
      return state.accessible ? state.project : null;
    } },
    artefact: {
      findFirst: async () => {
        calls.push("pointer");
        return { projectId: project.id, source: WORKING_SEE_POINTER_SOURCE, payload: metadata };
      },
      findMany: async () => {
        calls.push("sources");
        return state.sources ? [
          { id: "qsc-byron", projectId: project.id, type: "quick_site_check" },
          { id: "dpp-byron", projectId: project.id, type: "detailed_planning_pack" },
        ] : [];
      },
    },
    purchase: { findUnique: async () => { calls.push("purchase"); return purchase; } },
    entitlement: { findFirst: async () => { calls.push("entitlement"); return entitlement; } },
  };
  const deps = {
    prisma: prisma as unknown as Parameters<typeof createWorkingSeeSnapshotLoader>[0]["prisma"],
    deploymentEnvironment: "preview",
    readPrivateSnapshot: async (path: string) => {
      calls.push("private");
      assert.equal(path, workingSeePrivatePath(scope.projectId, versionId));
      throw new Error("synthetic-private-reader-reached");
    },
  };
  return { state, calls, deps };
}

test("production and bypass identity stop before database or private storage", async () => {
  for (const [environment, actorId] of [["production", "owner"], ["preview", "dev-bypass-user"], ["", "owner"]]) {
    const f = fixture();
    f.deps.deploymentEnvironment = environment;
    assert.equal(await createWorkingSeeSnapshotLoader(f.deps)({ ...scope, actorId }), null);
    assert.deepEqual(f.calls, []);
  }
});
test("denied project access never reads artefacts, purchases or private files", async () => {
  const f = fixture(); f.state.accessible = false;
  assert.equal(await createWorkingSeeSnapshotLoader(f.deps)(scope), null);
  assert.deepEqual(f.calls, ["project"]);
});
test("wrong product, unpaid/refunded purchase and wrong owner deny before private read", async () => {
  for (const change of [
    { productCode: "planning_controls_pack" }, { status: "PENDING" },
    { status: "REFUNDED" }, { userId: "another-owner" }, { projectId: "project-kempsey" },
    { quickSiteCheckArtefactId: "qsc-kempsey" }, { scopeKey: "mismatched" },
  ]) {
    const f = fixture(); Object.assign(f.state.purchase, change);
    assert.equal(await createWorkingSeeSnapshotLoader(f.deps)(scope), null);
    assert.equal(f.calls.includes("private"), false);
  }
});
test("revoked or substituted entitlements cannot authorise private reads", async () => {
  for (const change of [
    { status: "REVOKED" }, { status: "REFUNDED" }, { activeScopeKey: "different" },
    { projectId: "project-kempsey" }, { purchaseId: "other-purchase" },
    { productCode: "planning_controls_pack" },
  ]) {
    const f = fixture(); Object.assign(f.state.entitlement, change);
    assert.equal(await createWorkingSeeSnapshotLoader(f.deps)(scope), null);
    assert.equal(f.calls.includes("private"), false);
  }
});
test("missing original source records deny even with active purchase", async () => {
  const f = fixture(); f.state.sources = false;
  assert.equal(await createWorkingSeeSnapshotLoader(f.deps)(scope), null);
  assert.equal(f.calls.includes("private"), false);
});
test("valid scope reaches private reader only after all authorisation queries", async () => {
  const f = fixture();
  await assert.rejects(createWorkingSeeSnapshotLoader(f.deps)(scope), /synthetic-private-reader-reached/);
  assert.deepEqual(f.calls, ["project", "pointer", "purchase", "entitlement", "sources", "private"]);
});
test("every request rechecks revocation rather than caching a previous grant", async () => {
  const f = fixture(); const loader = createWorkingSeeSnapshotLoader(f.deps);
  await assert.rejects(loader(scope), /synthetic-private-reader-reached/);
  f.calls.length = 0; f.state.entitlement.status = "REVOKED";
  assert.equal(await loader(scope), null);
  assert.equal(f.calls.includes("private"), false);
  assert.equal(f.calls.includes("entitlement"), true);
});
test("storage keys cannot escape project/version prefix or accept a supplied URL", () => {
  assert.notEqual(workingSeePrivatePath("project-byron", versionId), workingSeePrivatePath("project-kempsey", versionId));
  for (const projectId of ["../secret", "https://example.com", "project/byron"]) {
    assert.throws(() => workingSeePrivatePath(projectId, versionId), /invalid_document_key/);
  }
  assert.throws(() => workingSeePrivatePath(scope.projectId, "../version"), /invalid_document_key/);
});

