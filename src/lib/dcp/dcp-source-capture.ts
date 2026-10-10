import { createHash } from "node:crypto";

export const DCP_SOURCE_CAPTURE_VERSION = "dcp-source-capture.v1";
// Operational re-fetch interval only, NOT certification of statutory currency.
export const DCP_SOURCE_CAPTURE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export type DcpSourceCouncil = "BYRON" | "KEMPSEY";
export type DcpSourceCapture = {
  schema: typeof DCP_SOURCE_CAPTURE_VERSION;
  council: DcpSourceCouncil;
  sourceUrl: string;
  sourceVersion: string;
  retrievedAt: string;
  pdfSha256: string;
  bodyTextSha256: string;
};
const sha = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const digest = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const meaningful = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 500;
const officialPdf = (url: string, council: DcpSourceCouncil) => {
  try {
    const parsed = new URL(url);
    const host = council === "BYRON" ? "byron.nsw.gov.au" : "kempsey.nsw.gov.au";
    return parsed.protocol === "https:" && !parsed.username && !parsed.password &&
      !parsed.port && !parsed.search && !parsed.hash &&
      (parsed.hostname === host || parsed.hostname === "www." + host) &&
      /\.pdf$/i.test(parsed.pathname);
  } catch { return false; }
};

/**
 * Internal ingestion boundary, not an upload or browser assertion.
 * Call only after fetching and parsing the official PDF successfully.
 * Preserve actual fetch time, original PDF hash and the exact stored clause body.
 * A hash proves byte identity, not adoption, applicability or legal currency.
 */
export function captureDcpSource(input: {
  council: DcpSourceCouncil; sourceUrl: string; sourceVersion: string;
  retrievedAt: string; pdfSha256: string; bodyText: string;
}, now = new Date()): DcpSourceCapture {
  const capture: DcpSourceCapture = {
    schema: DCP_SOURCE_CAPTURE_VERSION, council: input.council,
    sourceUrl: input.sourceUrl, sourceVersion: input.sourceVersion,
    retrievedAt: input.retrievedAt, pdfSha256: input.pdfSha256,
    bodyTextSha256: sha(input.bodyText),
  };
  if (!readDcpSourceCapture({ sourceUrl: input.sourceUrl, sourceCapture: capture },
    { council: input.council, bodyText: input.bodyText, now })) {
    throw new Error("dcp_source_capture_invalid");
  }
  return capture;
}

/**
 * Legacy metadata without this explicit envelope stays unavailable. Never turn
 * createdAt/updatedAt into retrieval time, or reinterpret old composite hashes.
 * Re-check the current stored body. This does not fetch or write anything.
 */
export function readDcpSourceCapture(metadata: unknown, expected: {
  council: DcpSourceCouncil; bodyText: string; now: Date;
}): DcpSourceCapture | null {
  if (!isRecord(metadata) || !isRecord(metadata.sourceCapture)) return null;
  const value = metadata.sourceCapture;
  const retrieved = typeof value.retrievedAt === "string" ? Date.parse(value.retrievedAt) : NaN;
  const age = expected.now.getTime() - retrieved;
  if (value.schema !== DCP_SOURCE_CAPTURE_VERSION || value.council !== expected.council ||
    !["BYRON", "KEMPSEY"].includes(expected.council) ||
    !meaningful(value.sourceUrl) || !officialPdf(value.sourceUrl, expected.council) ||
    value.sourceUrl !== metadata.sourceUrl ||
    !meaningful(value.sourceVersion) || /synthetic|fixture|stand[- ]?in/i.test(value.sourceVersion) ||
    !Number.isFinite(age) || age < 0 || age >= DCP_SOURCE_CAPTURE_MAX_AGE_MS ||
    !digest(value.pdfSha256) || !digest(value.bodyTextSha256) ||
    !expected.bodyText.trim() || Buffer.byteLength(expected.bodyText, "utf8") > 2 * 1024 * 1024 ||
    sha(expected.bodyText) !== value.bodyTextSha256 ||
    metadata.fixture === true || metadata.synthetic === true || metadata.authoritative === false ||
    value.fixture === true || value.synthetic === true || value.authoritative === false) return null;
  return {
    schema: DCP_SOURCE_CAPTURE_VERSION, council: expected.council,
    sourceUrl: value.sourceUrl, sourceVersion: value.sourceVersion,
    retrievedAt: new Date(retrieved).toISOString(), pdfSha256: value.pdfSha256,
    bodyTextSha256: value.bodyTextSha256,
  };
}
