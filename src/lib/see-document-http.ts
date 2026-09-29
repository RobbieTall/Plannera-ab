import {
  downloadWorkingSeeSnapshot, WorkingSeeDeliveryError,
  type AuthorisedWorkingSeeSnapshot,
} from "./see-document-delivery";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Vary": "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
const errorResponse = (status: number, error: string) =>
  Response.json({ error }, { status, headers: PRIVATE_HEADERS });

export function createWorkingSeeDownloadHandler(dependencies: {
  deploymentEnvironment: string | undefined;
  getActorId: () => Promise<string | null>;
  loadAuthorisedSnapshot: (scope: {
    actorId: string; projectId: string; versionId: string;
  }) => Promise<AuthorisedWorkingSeeSnapshot | null>;
}) {
  return async (request: Request, params: { projectId: string; versionId: string }): Promise<Response> => {
    // This runs before session resolution or any database/storage dependency.
    if (dependencies.deploymentEnvironment !== "preview") return errorResponse(404, "Document not found");
    if (request.method !== "GET") return errorResponse(405, "Method not allowed");
    try {
      const actorId = await dependencies.getActorId();
      const formats = new URL(request.url).searchParams.getAll("format");
      const result = await downloadWorkingSeeSnapshot({
        deploymentEnvironment: dependencies.deploymentEnvironment, actorId,
        projectId: params.projectId, versionId: params.versionId,
        format: formats.length === 1 ? formats[0] : "",
        loadAuthorisedSnapshot: dependencies.loadAuthorisedSnapshot,
      });
      // Stay below Vercel's buffered function-response limit; streaming is separate work.
      if (result.bytes.length > 4 * 1024 * 1024) {
        return errorResponse(413, "This document exceeds the Preview download size limit");
      }
      return new Response(new Uint8Array(result.bytes), { status: 200, headers: result.headers });
    } catch (error) {
      if (error instanceof WorkingSeeDeliveryError) {
        if (error.status === 401) return errorResponse(401, "Please sign in to download this document");
        if (error.status === 400) return errorResponse(400, "Invalid document request");
        if (error.status === 404) return errorResponse(404, "Document not found");
        return errorResponse(409, "This saved document could not be verified");
      }
      // Never return provider errors, signed URLs, credentials or saved content.
      return errorResponse(503, "Document temporarily unavailable");
    }
  };
}

