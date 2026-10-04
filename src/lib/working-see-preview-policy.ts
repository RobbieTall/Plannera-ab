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

/** Enumerated diagnostics only: never return headers, URLs, identifiers or bodies. */
export function workingSeeRequestRejection(request: Request, projectId: string):
  "method" | "project_identifier" | "origin" | "content_type" | null {
  if (request.method !== "POST") return "method";
  if (!documentIdentifier(projectId)) return "project_identifier";
  if (request.headers.get("origin") !== new URL(request.url).origin) return "origin";
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return "content_type";
  }
  return null;
}
