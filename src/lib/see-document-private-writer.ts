import type { put } from "@vercel/blob";
import { readWorkingSeeSnapshot } from "./see-document-delivery";
import { MAX_WORKING_SEE_SNAPSHOT_BYTES } from "./see-document-private-reader";
import { workingSeePrivatePath, type WorkingSeePrivateReader } from "./see-document-storage-loader";

const MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024;
const unavailable = () => new Error("private_document_write_failed");

/**
 * Server-only append-only adapter. The caller must authorize project, purchase,
 * evidence and actor before calling. Enabling writes is a separate Preview gate.
 * No URLs, credentials, file contents or upstream errors are returned/logged.
 */
export function createPrivateWorkingSeeWriter(input: {
  deploymentEnvironment: string | undefined;
  writesEnabled: boolean;
  put: typeof put;
  readPrivateSnapshot: WorkingSeePrivateReader;
}) {
  return async (value: unknown): Promise<{ pathname: string; versionId: string }> => {
    if (input.deploymentEnvironment !== "preview" || input.writesEnabled !== true) {
      throw unavailable();
    }
    try {
      const snapshot = readWorkingSeeSnapshot(value);
      if (snapshot.files.some((file) => file.byteLength > MAX_DOWNLOAD_BYTES)) throw unavailable();
      const pathname = workingSeePrivatePath(snapshot.projectId, snapshot.versionId);
      const body = JSON.stringify(snapshot);
      if (Buffer.byteLength(body, "utf8") > MAX_WORKING_SEE_SNAPSHOT_BYTES) throw unavailable();

      const confirmOriginal = async () => {
        const saved = readWorkingSeeSnapshot(await input.readPrivateSnapshot(pathname));
        // Normalization fixes key order; equality includes original document bytes.
        if (JSON.stringify(saved) !== body) throw unavailable();
        return { pathname, versionId: snapshot.versionId };
      };

      let uploaded: Awaited<ReturnType<typeof put>>;
      try {
        uploaded = await input.put(pathname, body, {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: "application/json",
          cacheControlMaxAge: 60,
          abortSignal: AbortSignal.timeout(15000),
        });
      } catch {
        // A race, duplicate or timed-out successful upload is accepted ONLY when
        // an independent bounded private read proves the exact original snapshot.
        // Never overwrite or delete to make a retry succeed.
        return await confirmOriginal();
      }
      const url = new URL(uploaded.url);
      if (url.protocol !== "https:" || url.username || url.password ||
        !url.hostname.endsWith(".private.blob.vercel-storage.com") ||
        uploaded.pathname !== pathname ||
        uploaded.contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
        throw unavailable();
      }
      return await confirmOriginal();
    } catch {
      throw unavailable();
    }
  };
}
