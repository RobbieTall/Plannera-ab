import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { createPrivateWorkingSeeWriter } from "../src/lib/see-document-private-writer";
import { createWorkingSeePersistence } from "../src/lib/see-document-persistence";
import { downloadWorkingSeeSnapshot, type WorkingSeeSnapshot } from "../src/lib/see-document-delivery";
import { createWorkingSeeSnapshotLoader, workingSeePrivatePath } from "../src/lib/see-document-storage-loader";

const hash = (input: string | Buffer) => createHash("sha256").update(input).digest("hex");

/** Tiny byte fixtures test storage contracts, not DOCX/PDF rendering validity. */
function snapshot(council: "BYRON" | "KEMPSEY" = "BYRON", revision = "one", large = false): WorkingSeeSnapshot {
  const projectId = "synthetic-" + council;
  const qsc = "qsc-" + council;
  const file = (format: "DOCX" | "PDF") => {
    const bytes = format === "PDF" ?
      Buffer.from("%PDF-1.4\nsynthetic " + revision + (large ? "x".repeat(4 * 1024 * 1024) : "")) :
      Buffer.concat([Buffer.from("504b0304", "hex"), Buffer.from("synthetic " + revision)]);
    return {
      format,
      mimeType: format === "PDF" ? "application/pdf" :
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      contentHash: hash(bytes), byteLength: bytes.length, base64: bytes.toString("base64"),
    };
  };
  const value: Omit<WorkingSeeSnapshot, "versionId"> = {
    schema: "working-see-download.v1",
    projectId, siteId: "site-" + council, council,
    purchaseScopeKey: ["owner", projectId, qsc, "b".repeat(64), "submission_see", "v1"].join(":"),
    sourceDetailedPlanningPackArtefactId: "dpp-" + council,
    sourceQuickSiteCheckArtefactId: qsc,
    rendererVersion: "synthetic-storage-test.v1", documentReference: "SEE-0123456789ABCDEF",
    generatedAt: "2026-09-29T00:00:00.000Z", readiness: "WORKING_SEE", submissionReady: false,
    evidenceStatus: "MORE_EVIDENCE_REQUIRED",
    warnings: ["WORKING SEE - NOT SUBMISSION READY", "Synthetic survey gap; obtain current evidence."],
    files: [file("DOCX"), file("PDF")],
  };
  const manifest = { ...value, files: value.files.map((entry) => ({
    format: entry.format, mimeType: entry.mimeType, contentHash: entry.contentHash,
    byteLength: entry.byteLength,
  })) };
  return { ...value, versionId: hash(JSON.stringify(manifest)) };
}

function storage() {
  const objects = new Map<string, unknown>();
  const calls: string[] = [];
  let publicResponse = false;
  let failRead = false;
  let failPut = false;
  const deps: Parameters<typeof createPrivateWorkingSeeWriter>[0] = {
    deploymentEnvironment: "preview", writesEnabled: true,
    put: async (path, body, options) => {
      calls.push("put");
      assert.equal(options.access, "private");
      assert.equal(options.allowOverwrite, false);
      assert.equal(options.addRandomSuffix, false);
      assert.equal(options.contentType, "application/json");
      assert.ok(options.abortSignal);
      if (failPut || objects.has(path)) throw new Error("synthetic-secret-must-not-escape");
      objects.set(path, JSON.parse(String(body)));
      return {
        url: "https://synthetic." + (publicResponse ? "public" : "private") + ".blob.vercel-storage.com/" + path,
        downloadUrl: "unused", pathname: path, contentType: "application/json",
        contentDisposition: "attachment", etag: "synthetic",
      };
    },
    readPrivateSnapshot: async (path) => {
      calls.push("read");
      if (failRead || !objects.has(path)) throw new Error("synthetic-secret-must-not-escape");
      return objects.get(path);
    },
  };
  return {
    deps, objects, calls,
    setPublic: () => { publicResponse = true; },
    setReadFailure: () => { failRead = true; },
    setPutFailure: () => { failPut = true; },
  };
}

type SavedPointer = { id: string; projectId: string; type: string; source: string; payload: unknown };
function database(council: "BYRON" | "KEMPSEY" = "BYRON") {
  const value = snapshot(council);
  const calls: string[] = [];
  const pointers = new Map<string, SavedPointer>();
  const project = { id: value.projectId, userId: "owner", createdById: "owner" };
  const purchase = {
    id: "purchase-" + council, userId: "owner", projectId: project.id,
    quickSiteCheckArtefactId: value.sourceQuickSiteCheckArtefactId,
    proposalFingerprint: "b".repeat(64), productCode: "submission_see", productVersion: "v1",
    currency: "AUD", paidAt: new Date(value.generatedAt), status: "PAID", scopeKey: value.purchaseScopeKey,
  };
  const entitlement = { ...purchase, purchaseId: purchase.id, status: "ACTIVE", activeScopeKey: purchase.scopeKey };
  const state = { allowed: true, sources: true, failPointer: false };
  const db = {
    project: { findFirst: async () => { calls.push("project"); return state.allowed ? project : null; } },
    purchase: { findUnique: async () => { calls.push("purchase"); return purchase; } },
    entitlement: { findFirst: async () => { calls.push("entitlement"); return entitlement; } },
    artefact: {
      findUnique: async (query: { where: { id: string } }) => pointers.get(query.where.id) ?? null,
      findFirst: async (query: { where: { payload: { equals: string } } }) =>
        [...pointers.values()].find((row) =>
          (row.payload as { versionId: string }).versionId === query.where.payload.equals) ?? null,
      findMany: async () => {
        calls.push("sources");
        return state.sources ? [
          { id: value.sourceQuickSiteCheckArtefactId, projectId: project.id, type: "quick_site_check" },
          { id: value.sourceDetailedPlanningPackArtefactId, projectId: project.id, type: "detailed_planning_pack" },
        ] : [];
      },
      upsert: async (query: { where: { id: string }; create: SavedPointer; update: object }) => {
        calls.push("pointer");
        assert.deepEqual(query.update, {});
        if (state.failPointer) throw new Error("private-database-detail");
        const saved = pointers.get(query.where.id) ?? query.create;
        pointers.set(query.where.id, saved);
        return saved;
      },
    },
  };
  const prisma = {
    ...db,
    $transaction: async <T>(work: (tx: typeof db) => Promise<T>, options: object) => {
      calls.push("transaction");
      assert.deepEqual(options, { isolationLevel: "Serializable" });
      return work(db);
    },
  } as unknown as Parameters<typeof createWorkingSeePersistence>[0]["prisma"];
  const store = storage();
  const deps: Parameters<typeof createWorkingSeePersistence>[0] = {
    deploymentEnvironment: "preview", writesEnabled: true, prisma,
    writePrivateSnapshot: createPrivateWorkingSeeWriter(store.deps),
  };
  const request = { actorId: "owner", projectId: project.id, purchaseId: purchase.id, snapshot: value };
  return { deps, request, calls, pointers, store, state, project, purchase, entitlement, value };
}

test("private writer denies Production, disabled writes and invalid snapshots before storage", async () => {
  for (const change of [{ deploymentEnvironment: "production" }, { writesEnabled: false }]) {
    const f = storage(); Object.assign(f.deps, change);
    await assert.rejects(createPrivateWorkingSeeWriter(f.deps)(snapshot()), /private_document_write_failed/);
    assert.deepEqual(f.calls, []);
  }
  const f = storage();
  await assert.rejects(createPrivateWorkingSeeWriter(f.deps)({ ...snapshot(), versionId: "bad" }));
  assert.deepEqual(f.calls, []);
});
test("files too large for the customer download route are not persisted", async () => {
  const f = storage();
  await assert.rejects(createPrivateWorkingSeeWriter(f.deps)(snapshot("BYRON", "large", true)));
  assert.deepEqual(f.calls, []);
});
test("private writer confirms original bytes and retries without overwriting", async () => {
  const f = storage(); const value = snapshot(); const write = createPrivateWorkingSeeWriter(f.deps);
  const first = await write(value); const second = await write(value);
  assert.deepEqual(first, second); assert.equal(f.objects.size, 1);
  assert.deepEqual(f.objects.get(first.pathname), value);
  assert.deepEqual(f.calls, ["put", "read", "put", "read"]);
  assert.equal("url" in first, false);
});
test("existing corrupt data cannot be accepted as a successful retry", async () => {
  const f = storage(); const value = snapshot();
  f.objects.set(workingSeePrivatePath(value.projectId, value.versionId), { ...value, council: "KEMPSEY" });
  await assert.rejects(createPrivateWorkingSeeWriter(f.deps)(value), /private_document_write_failed/);
  assert.equal(f.objects.size, 1);
});
test("public upload metadata and failed readback deny success without leaking provider errors", async () => {
  for (const change of [(f: ReturnType<typeof storage>) => f.setPublic(),
    (f: ReturnType<typeof storage>) => f.setReadFailure(),
    (f: ReturnType<typeof storage>) => f.setPutFailure()]) {
    const f = storage(); change(f);
    await assert.rejects(createPrivateWorkingSeeWriter(f.deps)(snapshot()),
      (error: unknown) => error instanceof Error && error.message === "private_document_write_failed");
  }
});
test("persistence denies Production, disabled writes and bypass actors before database calls", async () => {
  for (const change of ["production", "disabled", "bypass", "missing"]) {
    const f = database();
    if (change === "production") f.deps.deploymentEnvironment = "production";
    if (change === "disabled") f.deps.writesEnabled = false;
    if (change === "bypass") f.request.actorId = "dev-bypass-user";
    if (change === "missing") f.request.actorId = "";
    await assert.rejects(createWorkingSeePersistence(f.deps)(f.request), /working_document_save_unavailable/);
    assert.deepEqual(f.calls, []); assert.deepEqual(f.store.calls, []);
  }
});
test("non-owners, substituted project and missing source records cannot write files", async () => {
  for (const change of ["denied", "collaborator", "project", "sources"]) {
    const f = database();
    if (change === "denied") f.state.allowed = false;
    if (change === "collaborator") f.request.actorId = "collaborator";
    if (change === "project") f.request.projectId = "synthetic-KEMPSEY";
    if (change === "sources") f.state.sources = false;
    await assert.rejects(createWorkingSeePersistence(f.deps)(f.request));
    assert.deepEqual(f.store.calls, []); assert.equal(f.pointers.size, 0);
  }
});
test("wrong purchase, product, owner, paid status or scope denies before private write", async () => {
  for (const change of [
    { id: "other" }, { productCode: "planning_controls_pack" }, { status: "REFUNDED" },
    { userId: "other" }, { projectId: "other" }, { scopeKey: "other" },
    { quickSiteCheckArtefactId: "other" }, { currency: "USD" },
  ]) {
    const f = database(); Object.assign(f.purchase, change);
    await assert.rejects(createWorkingSeePersistence(f.deps)(f.request));
    assert.deepEqual(f.store.calls, []);
  }
});
test("revoked or mismatched entitlements deny before private write", async () => {
  for (const change of [
    { status: "REVOKED" }, { purchaseId: "other" }, { activeScopeKey: "other" },
    { projectId: "other" }, { proposalFingerprint: "c".repeat(64) },
  ]) {
    const f = database(); Object.assign(f.entitlement, change);
    await assert.rejects(createWorkingSeePersistence(f.deps)(f.request));
    assert.deepEqual(f.store.calls, []);
  }
});
test("both council versions persist metadata only and reopen exact original DOCX/PDF bytes", async () => {
  for (const council of ["BYRON", "KEMPSEY"] as const) {
    const f = database(council); const save = createWorkingSeePersistence(f.deps);
    const first = await save(f.request);
    const newer = snapshot(council, "two");
    await save({ ...f.request, snapshot: newer });
    assert.equal(f.pointers.size, 2); assert.equal(f.store.objects.size, 2);
    assert.equal(JSON.stringify(first).includes("base64"), false);
    assert.equal(JSON.stringify(first).includes("blob.vercel"), false);
    assert.equal(first.submissionReady, false);
    assert.deepEqual(first.warnings, f.value.warnings);
    assert.ok([...f.pointers.values()].every((row) => row.type === "working_see"));
    const loader = createWorkingSeeSnapshotLoader({
      prisma: f.deps.prisma, deploymentEnvironment: "preview",
      readPrivateSnapshot: f.store.deps.readPrivateSnapshot,
    });
    for (const file of f.value.files) {
      const downloaded = await downloadWorkingSeeSnapshot({
        deploymentEnvironment: "preview", actorId: "owner",
        projectId: f.value.projectId, versionId: f.value.versionId, format: file.format,
        loadAuthorisedSnapshot: loader,
      });
      assert.equal(downloaded.bytes.toString("base64"), file.base64);
      assert.equal(downloaded.versionId, f.value.versionId);
    }
    f.entitlement.status = "REVOKED";
    assert.equal(await loader({ actorId: "owner", projectId: f.value.projectId, versionId: f.value.versionId }), null);
  }
});
test("identical concurrent saves converge on one pointer and one immutable object", async () => {
  const f = database(); const save = createWorkingSeePersistence(f.deps);
  const results = await Promise.all([save(f.request), save(f.request)]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(f.pointers.size, 1); assert.equal(f.store.objects.size, 1);
});
test("entitlement is rechecked after private upload and before publishing a pointer", async () => {
  const f = database(); const write = f.deps.writePrivateSnapshot;
  f.deps.writePrivateSnapshot = async (value) => {
    const receipt = await write(value); f.entitlement.status = "REVOKED"; return receipt;
  };
  await assert.rejects(createWorkingSeePersistence(f.deps)(f.request));
  assert.equal(f.pointers.size, 0); assert.equal(f.store.objects.size, 1);
});
test("database failure leaves an unlisted private object and identical retry repairs the pointer", async () => {
  const f = database(); const save = createWorkingSeePersistence(f.deps);
  f.state.failPointer = true;
  await assert.rejects(save(f.request),
    (error: unknown) => error instanceof Error && error.message === "working_document_save_unavailable");
  assert.equal(f.store.objects.size, 1); assert.equal(f.pointers.size, 0);
  f.state.failPointer = false; await save(f.request);
  assert.equal(f.store.objects.size, 1); assert.equal(f.pointers.size, 1);
});
test("existing pointer conflicts fail without overwriting or touching private storage", async () => {
  const f = database(); const save = createWorkingSeePersistence(f.deps);
  const saved = await save(f.request);
  f.pointers.get(saved.artefactId)!.payload = { versionId: "other" };
  f.store.calls.length = 0;
  await assert.rejects(save(f.request));
  assert.deepEqual(f.store.calls, []);
});
