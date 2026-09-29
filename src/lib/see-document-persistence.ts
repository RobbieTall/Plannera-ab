import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { Prisma, PrismaClient } from "@prisma/client";
import { readWorkingSeeSnapshot, type WorkingSeeSnapshot } from "./see-document-delivery";
import { WORKING_SEE_POINTER_SOURCE, workingSeePrivatePath } from "./see-document-storage-loader";

type Database = Pick<PrismaClient, "project" | "purchase" | "entitlement" | "artefact">;
type PersistenceDatabase = Database & Pick<PrismaClient, "$transaction">;
const SHA = /^[a-f0-9]{64}$/;
const identifier = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value);
const unavailable = () => new Error("working_document_save_unavailable");

function pointerFor(snapshot: WorkingSeeSnapshot, purchaseId: string) {
  return {
    schema: "working-see-private-pointer.v1",
    versionId: snapshot.versionId,
    projectId: snapshot.projectId,
    purchaseId,
    siteId: snapshot.siteId,
    council: snapshot.council,
    sourceQuickSiteCheckArtefactId: snapshot.sourceQuickSiteCheckArtefactId,
    sourceDetailedPlanningPackArtefactId: snapshot.sourceDetailedPlanningPackArtefactId,
    rendererVersion: snapshot.rendererVersion,
    documentReference: snapshot.documentReference,
    generatedAt: snapshot.generatedAt,
    readiness: snapshot.readiness,
    submissionReady: snapshot.submissionReady,
    evidenceStatus: snapshot.evidenceStatus,
    warnings: snapshot.warnings,
    files: snapshot.files.map((file) => ({
      format: file.format, mimeType: file.mimeType,
      contentHash: file.contentHash, byteLength: file.byteLength,
    })),
  };
}

/**
 * Called only with a trusted server-assembled snapshot, never a browser-supplied
 * candidate/grant. This is persistence, not statutory-source verification.
 * Generation is owner-only; download access remains separately rechecked.
 *
 * Blob and Postgres cannot commit atomically. Write and verify the immutable Blob
 * first, then reauthorize in a serializable transaction and publish its pointer.
 * Failed pointer writes leave a private unlisted object for safe identical retry.
 * Automatic cleanup is deliberately absent: another retry may already own it.
 */
export function createWorkingSeePersistence(deps: {
  deploymentEnvironment: string | undefined;
  writesEnabled: boolean;
  prisma: PersistenceDatabase;
  writePrivateSnapshot: (snapshot: WorkingSeeSnapshot) =>
    Promise<{ pathname: string; versionId: string }>;
}) {
  return async (request: {
    actorId: string | null | undefined;
    projectId: string;
    purchaseId: string;
    snapshot: unknown;
  }) => {
    if (deps.deploymentEnvironment !== "preview" || deps.writesEnabled !== true ||
      !identifier(request.actorId) || request.actorId === "dev-bypass-user" ||
      !identifier(request.projectId) || !identifier(request.purchaseId)) throw unavailable();

    try {
      const actorId = request.actorId;
      const snapshot = readWorkingSeeSnapshot(request.snapshot);
      if (snapshot.projectId !== request.projectId || !identifier(snapshot.siteId) ||
        !identifier(snapshot.sourceQuickSiteCheckArtefactId) ||
        !identifier(snapshot.sourceDetailedPlanningPackArtefactId)) throw unavailable();
      const metadata = pointerFor(snapshot, request.purchaseId);
      const pointerId = "see_" + createHash("sha256")
        .update(snapshot.projectId + ":" + snapshot.versionId).digest("hex");

      const authorize = async (db: Database) => {
        const project = await db.project.findFirst({
          where: { id: request.projectId, OR: [{ userId: actorId }, { createdById: actorId }] },
          select: { id: true, userId: true, createdById: true },
        });
        const ownerId = project?.userId ?? project?.createdById;
        if (!project || project.id !== snapshot.projectId || ownerId !== actorId) throw unavailable();
        const purchase = await db.purchase.findUnique({ where: { id: request.purchaseId } });
        if (!purchase || purchase.id !== request.purchaseId || purchase.userId !== ownerId ||
          purchase.projectId !== project.id || purchase.status !== "PAID" || !purchase.paidAt ||
          purchase.productCode !== "submission_see" || purchase.productVersion !== "v1" ||
          purchase.currency !== "AUD" || !SHA.test(purchase.proposalFingerprint) ||
          purchase.quickSiteCheckArtefactId !== snapshot.sourceQuickSiteCheckArtefactId) throw unavailable();
        const scopeKey = [
          ownerId, project.id, purchase.quickSiteCheckArtefactId,
          purchase.proposalFingerprint, "submission_see", "v1",
        ].join(":");
        if (purchase.scopeKey !== scopeKey || snapshot.purchaseScopeKey !== scopeKey) throw unavailable();
        const entitlement = await db.entitlement.findFirst({
          where: {
            purchaseId: purchase.id, userId: ownerId, projectId: project.id,
            quickSiteCheckArtefactId: purchase.quickSiteCheckArtefactId,
            proposalFingerprint: purchase.proposalFingerprint,
            productCode: "submission_see", productVersion: "v1",
            activeScopeKey: scopeKey, status: "ACTIVE",
          },
        });
        if (!entitlement || entitlement.purchaseId !== purchase.id || entitlement.userId !== ownerId ||
          entitlement.projectId !== project.id || entitlement.status !== "ACTIVE" ||
          entitlement.productCode !== "submission_see" || entitlement.productVersion !== "v1" ||
          entitlement.quickSiteCheckArtefactId !== purchase.quickSiteCheckArtefactId ||
          entitlement.proposalFingerprint !== purchase.proposalFingerprint ||
          entitlement.activeScopeKey !== scopeKey) throw unavailable();
        const sources = await db.artefact.findMany({
          where: {
            projectId: project.id,
            id: { in: [snapshot.sourceQuickSiteCheckArtefactId, snapshot.sourceDetailedPlanningPackArtefactId] },
          },
          select: { id: true, projectId: true, type: true },
        });
        if (!sources.some((row) => row.id === snapshot.sourceQuickSiteCheckArtefactId &&
          row.projectId === project.id && row.type === "quick_site_check") ||
          !sources.some((row) => row.id === snapshot.sourceDetailedPlanningPackArtefactId &&
          row.projectId === project.id && row.type === "detailed_planning_pack")) throw unavailable();
      };

      const assertPointer = (saved: { projectId: string; type: string; source: string | null; payload: unknown }) => {
        if (saved.projectId !== snapshot.projectId || saved.type !== "working_see" ||
          saved.source !== WORKING_SEE_POINTER_SOURCE || !isDeepStrictEqual(saved.payload, metadata)) {
          throw unavailable();
        }
      };
      await authorize(deps.prisma);
      const existing = await deps.prisma.artefact.findUnique({ where: { id: pointerId } });
      if (existing) assertPointer(existing);
      const receipt = await deps.writePrivateSnapshot(snapshot);
      if (receipt.versionId !== snapshot.versionId ||
        receipt.pathname !== workingSeePrivatePath(snapshot.projectId, snapshot.versionId)) throw unavailable();

      await deps.prisma.$transaction(async (tx) => {
        await authorize(tx);
        const saved = await tx.artefact.upsert({
          where: { id: pointerId },
          create: {
            id: pointerId, projectId: snapshot.projectId, createdById: actorId,
            type: "working_see", source: WORKING_SEE_POINTER_SOURCE,
            title: "Working SEE - " + snapshot.documentReference,
            capturedAt: new Date(snapshot.generatedAt),
            payload: metadata as Prisma.InputJsonValue,
          },
          update: {},
        });
        assertPointer(saved);
      }, { isolationLevel: "Serializable" });
      return { artefactId: pointerId, ...metadata };
    } catch {
      throw unavailable();
    }
  };
}
