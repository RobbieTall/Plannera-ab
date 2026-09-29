import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  readWorkingSeeSnapshot,
  type AuthorisedWorkingSeeSnapshot,
} from "./see-document-delivery";

export const WORKING_SEE_POINTER_SOURCE = "plannera-working-see-private.v1";
const SHA = /^[a-f0-9]{64}$/;
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const identifier = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 200 &&
  /^[a-zA-Z0-9_-]+$/.test(value);

type ReadClient = Pick<PrismaClient, "project" | "artefact" | "purchase" | "entitlement">;
export type WorkingSeePrivateReader = (pathname: string) => Promise<unknown>;

/** No URLs or caller-selected storage locations: one private key per exact version. */
export function workingSeePrivatePath(projectId: string, versionId: string): string {
  if (!identifier(projectId) || !SHA.test(versionId)) throw new Error("invalid_document_key");
  const projectKey = createHash("sha256").update(projectId).digest("hex");
  return "working-see/v1/" + projectKey + "/" + versionId + ".json";
}

/**
 * Read-only database authorisation for the download contract. No checkout flag,
 * client grant or development bypass can establish entitlement.
 *
 * readPrivateSnapshot must use the configured PRIVATE store, enforce a response
 * size limit and never follow a URL supplied by a browser or artefact payload.
 * The caller must derive actorId from a real server session. This factory does
 * not create an HTTP route, persist a pointer or grant generation permission.
 */
export function createWorkingSeeSnapshotLoader(dependencies: {
  prisma: ReadClient;
  deploymentEnvironment: string | undefined;
  readPrivateSnapshot: WorkingSeePrivateReader;
}) {
  return async (scope: {
    actorId: string; projectId: string; versionId: string;
  }): Promise<AuthorisedWorkingSeeSnapshot | null> => {
    if (dependencies.deploymentEnvironment !== "preview" ||
      !identifier(scope.actorId) || scope.actorId === "dev-bypass-user" ||
      !identifier(scope.projectId) || !SHA.test(scope.versionId)) return null;

    const db = dependencies.prisma;
    // Canonical database IDs only; an HTTP adapter may resolve a public ID first.
    const project = await db.project.findFirst({
      where: {
        id: scope.projectId,
        OR: [
          { userId: scope.actorId }, { createdById: scope.actorId },
          { collaborators: { some: { userId: scope.actorId } } },
        ],
      },
      select: { id: true, userId: true, createdById: true },
    });
    if (!project || project.id !== scope.projectId) return null;

    const pointer = await db.artefact.findFirst({
      where: {
        projectId: project.id,
        source: WORKING_SEE_POINTER_SOURCE,
        payload: { path: ["versionId"], equals: scope.versionId },
      },
      select: { projectId: true, source: true, payload: true },
    });
    if (!pointer || pointer.projectId !== project.id ||
      pointer.source !== WORKING_SEE_POINTER_SOURCE || !record(pointer.payload)) return null;
    const metadata = pointer.payload;
    if (metadata.schema !== "working-see-private-pointer.v1" ||
      metadata.versionId !== scope.versionId || metadata.projectId !== project.id ||
      !identifier(metadata.purchaseId) || !identifier(metadata.siteId) ||
      !identifier(metadata.sourceQuickSiteCheckArtefactId) ||
      !identifier(metadata.sourceDetailedPlanningPackArtefactId) ||
      (metadata.council !== "BYRON" && metadata.council !== "KEMPSEY")) return null;

    const purchase = await db.purchase.findUnique({ where: { id: metadata.purchaseId } });
    const currentOwnerId = project.userId ?? project.createdById;
    if (!purchase || !currentOwnerId || purchase.userId !== currentOwnerId ||
      purchase.projectId !== project.id || purchase.status !== "PAID" ||
      purchase.productCode !== "submission_see" || purchase.productVersion !== "v1" ||
      purchase.currency !== "AUD" || !purchase.paidAt ||
      !SHA.test(purchase.proposalFingerprint) ||
      purchase.quickSiteCheckArtefactId !== metadata.sourceQuickSiteCheckArtefactId) return null;

    const purchaseScopeKey = [
      purchase.userId, project.id, purchase.quickSiteCheckArtefactId,
      purchase.proposalFingerprint, purchase.productCode, purchase.productVersion,
    ].join(":");
    if (purchase.scopeKey !== purchaseScopeKey) return null;
    const entitlement = await db.entitlement.findFirst({
      where: {
        purchaseId: purchase.id, userId: purchase.userId, projectId: project.id,
        quickSiteCheckArtefactId: purchase.quickSiteCheckArtefactId,
        proposalFingerprint: purchase.proposalFingerprint,
        productCode: "submission_see", productVersion: "v1",
        activeScopeKey: purchaseScopeKey, status: "ACTIVE",
      },
    });
    if (!entitlement || entitlement.status !== "ACTIVE" ||
      entitlement.purchaseId !== purchase.id || entitlement.userId !== purchase.userId ||
      entitlement.projectId !== project.id ||
      entitlement.quickSiteCheckArtefactId !== purchase.quickSiteCheckArtefactId ||
      entitlement.proposalFingerprint !== purchase.proposalFingerprint ||
      entitlement.productCode !== "submission_see" || entitlement.productVersion !== "v1" ||
      entitlement.activeScopeKey !== purchaseScopeKey) return null;

    // Original source records must belong to this project; never substitute today's DPP.
    const sourceRecords = await db.artefact.findMany({
      where: {
        projectId: project.id,
        id: { in: [metadata.sourceQuickSiteCheckArtefactId, metadata.sourceDetailedPlanningPackArtefactId] },
      },
      select: { id: true, projectId: true, type: true },
    });
    if (!sourceRecords.some((row) => row.id === metadata.sourceQuickSiteCheckArtefactId &&
      row.projectId === project.id && row.type === "quick_site_check") ||
      !sourceRecords.some((row) => row.id === metadata.sourceDetailedPlanningPackArtefactId &&
      row.projectId === project.id && row.type === "detailed_planning_pack")) return null;

    // The private-store reader is invoked only after project AND purchase checks.
    const stored = await dependencies.readPrivateSnapshot(
      workingSeePrivatePath(project.id, scope.versionId),
    );
    const snapshot = readWorkingSeeSnapshot(stored);
    if (snapshot.projectId !== project.id || snapshot.versionId !== scope.versionId ||
      snapshot.purchaseScopeKey !== purchaseScopeKey || snapshot.siteId !== metadata.siteId ||
      snapshot.council !== metadata.council ||
      snapshot.sourceQuickSiteCheckArtefactId !== metadata.sourceQuickSiteCheckArtefactId ||
      snapshot.sourceDetailedPlanningPackArtefactId !== metadata.sourceDetailedPlanningPackArtefactId) return null;
    return {
      snapshot,
      grant: {
        actorId: scope.actorId, projectId: project.id, versionId: scope.versionId,
        purchaseScopeKey, status: "ACTIVE",
      },
    };
  };
}

