import { documentIdentifier } from "./see-document-version-summary";

/** This exception permits a working memo, never a submission-ready assessment. */
export function canGenerateUncitedWorkingSee(input: {
  deploymentEnvironment: string | undefined;
  generationEnabled: string | undefined;
  commercialReady: unknown;
  unresolvedTopics: unknown;
}): boolean {
  return input.deploymentEnvironment === "preview" &&
    input.generationEnabled === "1" &&
    input.commercialReady === false &&
    Array.isArray(input.unresolvedTopics) &&
    input.unresolvedTopics.length > 0 &&
    input.unresolvedTopics.every((topic: unknown) =>
      typeof topic === "string" && topic.trim().length > 0);
}

export type WorkingSeePreviewOrigin = {
  deploymentEnvironment?: string;
  vercel?: string;
  deploymentUrl?: string;
  branchUrl?: string;
};

function hasWorkingSeeOrigin(request: Request, preview: WorkingSeePreviewOrigin): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || origin === "null" || (fetchSite !== null && fetchSite !== "same-origin")) return false;
  if (origin === new URL(request.url).origin) return true;

  // A proxy may reconstruct Request.url with an internal origin. Only Vercel's
  // server-side deployment metadata can establish the external Preview origin.
  // Never trust Host, Forwarded, X-Forwarded-Host, NEXTAUTH_URL or a suffix match
  // against the incoming Origin. Browser same-origin metadata is also required.
  if (preview.deploymentEnvironment !== "preview" || preview.vercel !== "1" || fetchSite !== "same-origin") return false;
  return [preview.deploymentUrl, preview.branchUrl].some(host =>
    typeof host === "string" &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/.test(host) &&
    origin === `https://${host}`);
}

/** Enumerated diagnostics only: never return headers, URLs, identifiers or bodies. */
export function workingSeeRequestRejection(request: Request, projectId: string, preview: WorkingSeePreviewOrigin = {}):
  "method" | "project_identifier" | "origin" | "content_type" | null {
  if (request.method !== "POST") return "method";
  if (!documentIdentifier(projectId)) return "project_identifier";
  if (!hasWorkingSeeOrigin(request, preview)) return "origin";
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return "content_type";
  }
  return null;
}
