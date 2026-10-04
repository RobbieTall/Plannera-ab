import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { SiteCandidate } from "@/types/site";
import { normalizeCouncilLgaCode } from "./council/lga-normaliser";

export const WORKING_SEE_COUNCIL_LAYER = "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Administrative_Boundaries_Theme/MapServer/8";
export const WORKING_SEE_COUNCIL_VERSION = "nsw-council-point-identity.v1";
export const WORKING_SEE_COUNCIL_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_BYTES = 16 * 1024;
const coordinatesSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
}).strict();
const responseSchema = z.object({
  error: z.unknown().optional(),
  exceededTransferLimit: z.boolean().optional(),
  features: z.array(z.object({
    attributes: z.object({
      rid: z.number().int().nonnegative(),
      lganame: z.string().trim().min(1).max(60),
      councilname: z.string().trim().min(1).max(80),
      abscode: z.number().int().positive(),
      // ArcGIS dates are epoch milliseconds; reject coercion and invalid Date ranges.
      enddate: z.number().finite().int().min(-8640000000000000).max(8640000000000000).nullable(),
    }),
  })).min(1).max(2),
});
export type CouncilCoordinates = z.infer<typeof coordinatesSchema>;
export type WorkingSeeCouncilIdentity = {
  schema: typeof WORKING_SEE_COUNCIL_VERSION;
  sourceUrl: typeof WORKING_SEE_COUNCIL_LAYER;
  authority: "NSW Spatial Services";
  method: "coordinate_intersection";
  coordinates: CouncilCoordinates;
  council: "BYRON" | "KEMPSEY";
  lgaName: string;
  councilName: string;
  providerCode: number;
  featureIdentifier: string;
  retrievedAt: string;
  responseSha256: string;
  responseText: string;
};
const hash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

function identityFromResponse(
  responseText: string, coordinates: CouncilCoordinates, retrievedAt: string,
  evaluatedAt = Date.parse(retrievedAt),
): WorkingSeeCouncilIdentity | null {
  try {
    if (Buffer.byteLength(responseText, "utf8") > MAX_BYTES) return null;
    const parsed = responseSchema.safeParse(JSON.parse(responseText));
    if (!parsed.success || parsed.data.error != null || parsed.data.exceededTransferLimit) return null;
    const fetchedAt = Date.parse(retrievedAt);
    if (!Number.isFinite(fetchedAt) || !Number.isFinite(evaluatedAt) || evaluatedAt < fetchedAt) return null;
    // Establish uniqueness at capture, not only after competing records expire.
    // Keep the complete original response for its hash and later revalidation.
    const current = parsed.data.features.filter(({ attributes }) =>
      attributes.enddate === null || attributes.enddate > fetchedAt);
    if (current.length !== 1) return null;
    const attributes = current[0].attributes;
    if (attributes.enddate !== null && attributes.enddate <= evaluatedAt) return null;
    const council = normalizeCouncilLgaCode(attributes.lganame);
    if (council !== "BYRON" && council !== "KEMPSEY") return null;
    return {
      schema: WORKING_SEE_COUNCIL_VERSION, sourceUrl: WORKING_SEE_COUNCIL_LAYER,
      authority: "NSW Spatial Services", method: "coordinate_intersection",
      coordinates, council, lgaName: attributes.lganame,
      councilName: attributes.councilname, providerCode: attributes.abscode,
      featureIdentifier: "rid:" + attributes.rid, retrievedAt,
      responseSha256: hash(responseText), responseText,
    };
  } catch { return null; }
}

/**
 * Internal read-only lookup, not a client-supplied council assertion.
 * Call only from the authorized, explicitly enabled Preview site-resolution path.
 * The result identifies the queried point, not parcel extent, address accuracy,
 * statutory planning controls, approval or a new LGA's coverage maturity.
 */
export async function lookupWorkingSeeCouncilIdentity(
  coordinates: CouncilCoordinates,
  deps: { fetcher?: typeof fetch; now?: () => Date } = {},
): Promise<WorkingSeeCouncilIdentity | null> {
  const point = coordinatesSchema.safeParse(coordinates);
  if (!point.success) return null;
  const url = new URL(WORKING_SEE_COUNCIL_LAYER + "/query");
  url.search = new URLSearchParams({
    f: "json", geometry: point.data.lng + "," + point.data.lat,
    geometryType: "esriGeometryPoint", inSR: "4326",
    spatialRel: "esriSpatialRelIntersects", where: "1=1",
    outFields: "rid,lganame,councilname,abscode,enddate",
    returnGeometry: "false", resultRecordCount: "2",
  }).toString();
  try {
    const response = await (deps.fetcher ?? fetch)(url.toString(), {
      method: "GET", redirect: "error", credentials: "omit", cache: "no-store",
      headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok || response.redirected || !response.body) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > MAX_BYTES) { await reader.cancel(); return null; }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    const responseText = Buffer.concat(chunks).toString("utf8");
    return identityFromResponse(responseText, point.data, (deps.now ?? (() => new Date()))().toISOString());
  } catch {
    // No address, response body, credential or provider error is logged.
    return null;
  }
}

/** Validate stored server evidence against the exact current point and time. */
export function readWorkingSeeCouncilIdentity(
  value: unknown, coordinates: CouncilCoordinates, now = new Date(),
): WorkingSeeCouncilIdentity | null {
  try {
    const point = coordinatesSchema.safeParse(coordinates);
    if (!point.success || !Number.isFinite(now.getTime()) || !value || typeof value !== "object") return null;
    const row = value as Partial<WorkingSeeCouncilIdentity>;
    if (typeof row.responseText !== "string" || typeof row.retrievedAt !== "string") return null;
    const fetched = Date.parse(row.retrievedAt);
    if (!Number.isFinite(fetched) || fetched > now.getTime() ||
      fetched + WORKING_SEE_COUNCIL_MAX_AGE_MS <= now.getTime()) return null;
    const expected = identityFromResponse(row.responseText, point.data, row.retrievedAt, now.getTime());
    return expected && isDeepStrictEqual(value, expected) ? expected : null;
  } catch { return null; }
}

/** Default-off Preview hook. Candidate labels can contradict, but never prove, identity. */
export async function resolveWorkingSeeCouncilForCandidate(
  params: {
    candidate: Pick<SiteCandidate, "latitude" | "longitude" | "lgaName" | "lgaCode">;
    deploymentEnvironment: string | undefined;
    enabled: boolean;
  },
  deps: { fetcher?: typeof fetch; now?: () => Date } = {},
): Promise<WorkingSeeCouncilIdentity | null> {
  if (params.deploymentEnvironment !== "preview" || params.enabled !== true) return null;
  const { candidate } = params;
  if (typeof candidate.latitude !== "number" || typeof candidate.longitude !== "number") return null;
  const identity = await lookupWorkingSeeCouncilIdentity({
    lat: candidate.latitude, lng: candidate.longitude,
  }, deps);
  if (!identity) return null;
  if (candidate.lgaName?.trim() && normalizeCouncilLgaCode(candidate.lgaName) !== identity.council) return null;
  if (candidate.lgaCode?.trim() &&
    normalizeCouncilLgaCode(candidate.lgaCode) !== identity.council &&
    candidate.lgaCode.trim() !== String(identity.providerCode)) return null;
  return identity;
}
