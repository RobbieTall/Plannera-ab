import { createWorkingSeeSnapshot } from "./see-document-delivery";
import { documentIdentifier, readSavedSeeVersion, type SavedSeeVersion } from "./see-document-version-summary";
import { WorkingSeeSourceError } from "./see-document-generation-sources";
import type { WorkingSeeGenerationScope } from "./see-document-generation-source-loader";
import { workingSeeRequestRejection, type WorkingSeePreviewOrigin } from "./working-see-preview-policy";

const headers = { "Content-Type": "application/json", "Cache-Control": "private, no-store",
  "Vary": "Cookie, Authorization", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };
const response = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers });
type Prepared = Parameters<typeof createWorkingSeeSnapshot>[0] & { purchaseId: string; sourceSignature: string };

export function createWorkingSeeGenerationHandler(deps: {
  deploymentEnvironment: string | undefined;
  enabled: boolean;
  previewOrigin?: Omit<WorkingSeePreviewOrigin, "deploymentEnvironment">;
  getActorId: () => Promise<string | null>;
  prepare: (scope: WorkingSeeGenerationScope) => Promise<Prepared>;
  save: (scope: WorkingSeeGenerationScope, prepared: Prepared,
    snapshot: ReturnType<typeof createWorkingSeeSnapshot>) => Promise<unknown>;
}) {
  return async (request: Request, projectId: string) => {
    if (deps.deploymentEnvironment !== "preview" || !deps.enabled) return response(404, { error: "generation_disabled" });
    const requestRejection = workingSeeRequestRejection(request, projectId,
      { ...deps.previewOrigin, deploymentEnvironment: deps.deploymentEnvironment });
    if (requestRejection) {
      return response(400, { error: "invalid_generation_request", reason: requestRejection });
    }
    try {
      // Fixed-size input: identifiers and explicit working-document acknowledgement only.
      const reader = request.body?.getReader();
      if (!reader) return response(400, { error: "invalid_generation_request" });
      let body = "";
      let size = 0;
      const decoder = new TextDecoder("utf-8", { fatal: true });
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 1024) { await reader.cancel(); return response(400, { error: "invalid_generation_request" }); }
          body += decoder.decode(chunk.value, { stream: true });
        }
        body += decoder.decode();
      } finally { reader.releaseLock(); }
      const parsed: unknown = JSON.parse(body);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return response(400, { error: "invalid_generation_request" });
      const data = parsed as Record<string, unknown>;
      if (Object.keys(data).sort().join(",") !== "acknowledgeWorkingDocument,sourceDetailedPlanningPackArtefactId,sourceMemoArtefactId" ||
        data.acknowledgeWorkingDocument !== true ||
        !documentIdentifier(data.sourceDetailedPlanningPackArtefactId) ||
        !documentIdentifier(data.sourceMemoArtefactId)) return response(400, { error: "invalid_generation_request" });
      const actorId = await deps.getActorId();
      if (!actorId || actorId === "dev-bypass-user") return response(401, { error: "sign_in_required" });
      const scope = { actorId, projectId,
        sourceDetailedPlanningPackArtefactId: data.sourceDetailedPlanningPackArtefactId,
        sourceMemoArtefactId: data.sourceMemoArtefactId };
      const prepared = await deps.prepare(scope);
      if (prepared.candidate.projectId !== projectId ||
        prepared.candidate.sourceDetailedPlanningPack.artefactId !== scope.sourceDetailedPlanningPackArtefactId) {
        return response(409, { error: "source_scope_mismatch" });
      }
      const snapshot = createWorkingSeeSnapshot(prepared);
      const saved = await deps.save(scope, prepared, snapshot);
      const version: SavedSeeVersion | null = readSavedSeeVersion(saved, projectId);
      if (!version || version.versionId !== snapshot.versionId) throw new Error("save_failed");
      return response(201, { version });
    } catch (error) {
      if (error instanceof WorkingSeeSourceError) return response(409, { error: error.code });
      // Never return upstream errors, private evidence, credentials or storage paths.
      return response(409, { error: "generation_unavailable" });
    }
  };
}
