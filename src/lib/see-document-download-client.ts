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
