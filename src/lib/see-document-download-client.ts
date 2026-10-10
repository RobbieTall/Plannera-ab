import {
  documentIdentifier, readSavedSeeVersion, readSavedSeeVersionPage,
  WORKING_SEE_MIME, type SavedSeeFormat, type SavedSeeVersion,
} from "./see-document-version-summary";

const failure = () => new Error("The saved document could not be downloaded. Refresh the list or sign in again.");
export async function fetchSavedSeeVersions(
  projectId: string, cursor: string | null, signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  if (!documentIdentifier(projectId)) throw failure();
  const url = "/api/projects/" + encodeURIComponent(projectId) + "/working-see" +
    (cursor ? "?cursor=" + encodeURIComponent(cursor) : "");
  const response = await fetcher(url, {
    cache: "no-store", credentials: "same-origin", mode: "same-origin", redirect: "error", signal,
  });
  if (!response.ok || response.redirected ||
    !response.headers.get("content-type")?.includes("application/json")) throw failure();
  const page = readSavedSeeVersionPage(await response.json(), projectId);
  if (!page) throw failure();
  return page;
}

export async function fetchSavedSeeFile(
  version: SavedSeeVersion, format: SavedSeeFormat, signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const saved = readSavedSeeVersion(version, version.projectId);
  const file = saved?.files.find((item) => item.format === format);
  if (!saved || !file) throw failure();
  const response = await fetcher(
    "/api/projects/" + encodeURIComponent(saved.projectId) + "/working-see/" +
    saved.versionId + "/download?format=" + format,
    { cache: "no-store", credentials: "same-origin", mode: "same-origin", redirect: "error", signal },
  );
  if (!response.ok || response.redirected || !response.body ||
    response.headers.get("content-type")?.split(";")[0].trim() !== WORKING_SEE_MIME[format]) throw failure();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > file.byteLength || length > 4 * 1024 * 1024) {
        await reader.cancel();
        throw failure();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (length !== file.byteLength) throw failure();
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
    .map((value) => value.toString(16).padStart(2, "0")).join("");
  if (digest !== file.contentHash) throw failure();
  return {
    bytes, mimeType: file.mimeType,
    filename: "working-see-" + saved.projectId + "-" + saved.versionId + "." + format.toLowerCase(),
  };
}

/** Explicit customer action; no browser-supplied evidence, grants or file bytes. */
export async function generateSavedWorkingSee(input: {
  projectId: string; sourceDetailedPlanningPackArtefactId: string; sourceMemoArtefactId: string;
  signal: AbortSignal;
}, fetcher: typeof fetch = fetch) {
  if (![input.projectId, input.sourceDetailedPlanningPackArtefactId, input.sourceMemoArtefactId].every(documentIdentifier)) {
    throw new Error("Select a saved planning pack and matching assessment first.");
  }
  const response = await fetcher("/api/projects/" + encodeURIComponent(input.projectId) + "/working-see/generate", {
    method: "POST", cache: "no-store", credentials: "same-origin", mode: "same-origin", redirect: "error",
    signal: input.signal, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      acknowledgeWorkingDocument: true,
      sourceDetailedPlanningPackArtefactId: input.sourceDetailedPlanningPackArtefactId,
      sourceMemoArtefactId: input.sourceMemoArtefactId,
    }),
  });
  if (response.redirected || !response.headers.get("content-type")?.includes("application/json")) throw failure();
  const result: unknown = await response.json();
  if (!result || typeof result !== "object") throw failure();
  const body = result as { error?: unknown; version?: unknown };
  if (!response.ok) {
    const messages: Record<string, string> = {
      generation_disabled: "Word/PDF generation has not been enabled for this protected Preview yet.",
      sign_in_required: "Please sign in again before generating your documents.",
      source_scope_mismatch: "The selected assessment, project or paid access no longer matches. Refresh the workspace before continuing.",
      source_evidence_missing: "The saved assessment is missing traceable planning-source evidence. The existing memo remains available; source preparation must be completed before Word/PDF generation.",
      source_evidence_unverified: "A planning source is stale, changed or not verifiable. It must be reconciled before generating these documents.",
    };
    throw new Error(typeof body.error === "string" && messages[body.error]
      ? messages[body.error] : "The working documents could not be saved. No successful generation has been confirmed.");
  }
  const version = readSavedSeeVersion(body.version, input.projectId);
  if (!version) throw failure();
  return version;
}
