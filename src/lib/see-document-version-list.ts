import type { PrismaClient } from "@prisma/client";
import { createWorkingSeePointerLoader, WORKING_SEE_POINTER_SOURCE } from "./see-document-storage-loader";
import {
  documentIdentifier, readSavedSeeVersion, readVersionCursor,
  type SavedSeeVersionPage,
} from "./see-document-version-summary";

type ReadClient = Pick<PrismaClient, "project" | "artefact" | "purchase" | "entitlement">;

/** Read-only, paginated metadata. File integrity is independently checked on download. */
export function createWorkingSeeVersionList(deps: {
  prisma: ReadClient; deploymentEnvironment: string | undefined;
}) {
  const loadPointer = createWorkingSeePointerLoader(deps);
  return async (scope: {
    actorId: string; projectId: string; cursor?: string | null;
  }): Promise<SavedSeeVersionPage | null> => {
    if (deps.deploymentEnvironment !== "preview" ||
      !documentIdentifier(scope.actorId) || scope.actorId === "dev-bypass-user" ||
      !documentIdentifier(scope.projectId)) return null;
    const cursor = scope.cursor ? readVersionCursor(scope.cursor) : null;
    if (scope.cursor && !cursor) return null;
    const project = await deps.prisma.project.findFirst({
      where: {
        id: scope.projectId,
        OR: [
          { userId: scope.actorId }, { createdById: scope.actorId },
          { collaborators: { some: { userId: scope.actorId } } },
        ],
      },
      select: { id: true },
    });
    if (!project || project.id !== scope.projectId) return null;
    const rows = await deps.prisma.artefact.findMany({
      where: {
        projectId: project.id, type: "working_see", source: WORKING_SEE_POINTER_SOURCE,
        ...(cursor ? { OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 11,
      select: { id: true, projectId: true, createdAt: true, payload: true },
    });
    const versions: SavedSeeVersionPage["versions"] = [];
    for (const row of rows.slice(0, 10)) {
      if (row.projectId !== project.id) continue;
      const summary = readSavedSeeVersion(row.payload, project.id);
      if (!summary || versions.some((version) => version.versionId === summary.versionId)) continue;
      // A paid DPP is not enough. Reuse exact SEE-scope checks, without opening Blob.
      const authorised = await loadPointer({
        actorId: scope.actorId, projectId: project.id, versionId: summary.versionId,
      });
      if (!authorised) continue;
      const authorisedSummary = readSavedSeeVersion(authorised.metadata, project.id);
      if (authorisedSummary) versions.push(authorisedSummary);
    }
    const last = rows[9];
    return {
      versions,
      nextCursor: rows.length > 10 && last
        ? last.createdAt.toISOString() + "~" + last.id : null,
    };
  };
}

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Vary": "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
export function createWorkingSeeVersionListHandler(deps: {
  deploymentEnvironment: string | undefined;
  getActorId: () => Promise<string | null>;
  loadVersions: (scope: { actorId: string; projectId: string; cursor: string | null }) =>
    Promise<SavedSeeVersionPage | null>;
}) {
  return async (request: Request, projectId: string): Promise<Response> => {
    const reply = (status: number, body: unknown) => Response.json(body, { status, headers: PRIVATE_HEADERS });
    if (deps.deploymentEnvironment !== "preview") return reply(404, { error: "Documents not found" });
    if (request.method !== "GET") return reply(405, { error: "Method not allowed" });
    const cursors = new URL(request.url).searchParams.getAll("cursor");
    if (!documentIdentifier(projectId) || cursors.length > 1 ||
      (cursors.length === 1 && !readVersionCursor(cursors[0]))) {
      return reply(400, { error: "Invalid document request" });
    }
    try {
      const actorId = await deps.getActorId();
      if (!documentIdentifier(actorId) || actorId === "dev-bypass-user") {
        return reply(401, { error: "Please sign in to view saved documents" });
      }
      const result = await deps.loadVersions({ actorId, projectId, cursor: cursors[0] ?? null });
      return result ? reply(200, result) : reply(404, { error: "Documents not found" });
    } catch {
      return reply(503, { error: "Saved documents temporarily unavailable" });
    }
  };
}
