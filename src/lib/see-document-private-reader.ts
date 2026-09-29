import type { GetBlobResult, GetCommandOptions } from "@vercel/blob";

const PRIVATE_PATH = /^working-see\/v1\/[a-f0-9]{64}\/[a-f0-9]{64}\.json$/;
export const MAX_WORKING_SEE_SNAPSHOT_BYTES = 48 * 1024 * 1024;
type BlobGet = (pathname: string, options: GetCommandOptions) => Promise<GetBlobResult | null>;

/** Read-only private Blob adapter. No credential, URL or document content is logged. */
export function createPrivateWorkingSeeReader(input: {
  deploymentEnvironment: string | undefined;
  get: BlobGet;
}) {
  return async (pathname: string): Promise<unknown> => {
    if (input.deploymentEnvironment !== "preview" || !PRIVATE_PATH.test(pathname)) {
      throw new Error("private_document_unavailable");
    }
    const result = await input.get(pathname, {
      access: "private", useCache: false, abortSignal: AbortSignal.timeout(15000),
    });
    if (!result || result.statusCode !== 200) throw new Error("private_document_unavailable");
    const reader = result.stream.getReader();
    try {
      const url = new URL(result.blob.url);
      if (url.protocol !== "https:" || !url.hostname.endsWith(".private.blob.vercel-storage.com") ||
        result.blob.pathname !== pathname ||
        result.blob.contentType.split(";")[0].trim().toLowerCase() !== "application/json" ||
        !Number.isSafeInteger(result.blob.size) || result.blob.size <= 0 ||
        result.blob.size > MAX_WORKING_SEE_SNAPSHOT_BYTES) {
        throw new Error("private_document_unavailable");
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > MAX_WORKING_SEE_SNAPSHOT_BYTES || size > result.blob.size) {
          throw new Error("private_document_unavailable");
        }
        chunks.push(next.value);
      }
      if (size !== result.blob.size) throw new Error("private_document_unavailable");
      const bytes = Buffer.concat(chunks);
      return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      await reader.cancel().catch(() => undefined);
      throw new Error("private_document_unavailable");
    } finally {
      reader.releaseLock();
    }
  };
}

