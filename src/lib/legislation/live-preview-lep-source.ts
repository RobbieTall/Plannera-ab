import { createHash } from "node:crypto";

// Date-pinned exports verified on the official pages on 30 September 2026.
// This is a rehearsal snapshot, not a rolling-current source. Revalidate before reuse.
const SOURCES = {
  BYRON: {
    sourceUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2014-0297",
    retrievalUrl: "https://legislation.nsw.gov.au/export/xml/2026-09-30/epi-2014-0297",
  },
  KEMPSEY: {
    sourceUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2013-0712",
    retrievalUrl: "https://legislation.nsw.gov.au/export/xml/2026-09-30/epi-2013-0712",
  },
} as const;

export const LIVE_LEP_MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
type Council = keyof typeof SOURCES;
type Failure = "preview_required" | "unsupported_council" | "http_failed" |
  "source_mismatch" | "unexpected_content_type" | "invalid_length" |
  "source_too_large" | "empty_source" | "invalid_utf8" | "retrieval_failed";

export class LivePreviewLepSourceError extends Error {
  constructor(readonly code: Failure) { super(code); this.name = "LivePreviewLepSourceError"; }
}
function fail(code: Failure): never { throw new LivePreviewLepSourceError(code); }

export type LiveLepReceipt = {
  schema: "live-preview-lep-retrieval.v1";
  council: Council;
  sourceUrl: string;
  retrievalUrl: string;
  retrievedAt: string;
  documentSha256: string;
  byteLength: number;
  usedFixture: false;
};

/**
 * Read-only transport evidence, NOT clause/applicability/currency acceptance.
 * No local-file fallback, database access, persistence, token or cookie handling.
 * Callers must separately validate instrument identity, parse completeness and
 * clause mappings, and bind any writes to an independently verified Preview DB.
 */
export async function fetchLivePreviewLepSource(
  council: string,
  dependencies: { fetch?: typeof fetch; now?: () => Date } = {},
): Promise<{ document: string; bytes: Uint8Array; receipt: LiveLepReceipt }> {
  if (process.env.VERCEL_ENV !== "preview") fail("preview_required");
  if (council !== "BYRON" && council !== "KEMPSEY") fail("unsupported_council");
  const source = SOURCES[council];
  const fetcher = dependencies.fetch ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  timer.unref();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetcher(source.retrievalUrl, {
      method: "GET", redirect: "error", credentials: "omit", cache: "no-store",
      referrerPolicy: "no-referrer", signal: controller.signal,
      headers: { Accept: "application/xml,text/xml", "User-Agent": "PlanneraPreviewSourceReview/1.0" },
    });
    if (response.status !== 200) fail("http_failed");
    if (response.redirected || response.url !== source.retrievalUrl) fail("source_mismatch");
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (contentType !== "application/xml" && contentType !== "text/xml") fail("unexpected_content_type");
    const declared = response.headers.get("content-length");
    if (declared !== null) {
      if (!/^\d+$/.test(declared) || !Number.isSafeInteger(Number(declared))) fail("invalid_length");
      if (Number(declared) > LIVE_LEP_MAX_BYTES) fail("source_too_large");
    }
    if (!response.body) fail("empty_source");
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > LIVE_LEP_MAX_BYTES) fail("source_too_large");
      chunks.push(part.value);
    }
    if (length === 0) fail("empty_source");
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let document: string;
    try { document = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { fail("invalid_utf8"); }
    if (!document.trim()) fail("empty_source");
    return {
      document, bytes,
      receipt: {
        schema: "live-preview-lep-retrieval.v1", council,
        sourceUrl: source.sourceUrl, retrievalUrl: source.retrievalUrl,
        retrievedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
        documentSha256: createHash("sha256").update(bytes).digest("hex"),
        byteLength: length, usedFixture: false,
      },
    };
  } catch (error) {
    if (error instanceof LivePreviewLepSourceError) throw error;
    // Never propagate provider diagnostics or response bodies to public CI logs.
    throw new LivePreviewLepSourceError("retrieval_failed");
  } finally {
    clearTimeout(timer);
    controller.abort();
    if (reader) { try { await reader.cancel(); } catch { /* Preserve the safe failure. */ } }
  }
}
