export const NSW_EPI_PLANNING_SERVICE_URL =
  "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer";

export const NSW_EPI_ZONING_LAYER_URL =
  `${NSW_EPI_PLANNING_SERVICE_URL}/2`;

export type SpatialProvenanceStatus =
  | "verified"
  | "partial"
  | "unresolved";

export type SpatialResolutionMethod =
  | "coordinate_intersection"
  | "parcel_lookup"
  | "candidate_fallback"
  | "manual_entry";

export type SpatialProvenanceLimitation =
  | "missing_zone"
  | "invalid_timestamp"
  | "zone_conflict"
  | "non_authoritative_source"
  | "missing_official_service_url"
  | "unsupported_resolution_method"
  | "missing_location_evidence"
  | "missing_feature_identifier";

export interface SpatialProvenanceInput {
  zoneCode?: string | null;
  zoningSource?: string | null;
  resolutionMethod: SpatialResolutionMethod;
  serviceUrl?: string | null;
  featureIdentifier?: string | number | null;
  resolvedAt?: string | Date | null;
  coordinates?: {
    lat: number;
    lng: number;
  } | null;
  parcelId?: string | null;
  conflictingZoneCodes?: readonly (string | null | undefined)[];
}

export interface SpatialProvenance {
  status: SpatialProvenanceStatus;
  authoritative: boolean;
  zoneCode: string | null;
  zoningSource: string | null;
  resolutionMethod: SpatialResolutionMethod;
  serviceUrl: string | null;
  layerUrl: string | null;
  featureIdentifier: string | null;
  resolvedAt: string | null;
  query: {
    coordinates: {
      lat: number;
      lng: number;
    } | null;
    parcelId: string | null;
  };
  limitations: SpatialProvenanceLimitation[];
}

const AUTHORITATIVE_ZONING_SOURCES = new Set([
  "NSW_LZN",
  "NSW_EPI_LZN",
]);

function normaliseText(value: string | null | undefined): string | null {
  const normalised = value?.trim();
  return normalised ? normalised : null;
}

function normaliseZoneCode(value: string | null | undefined): string | null {
  return normaliseText(value)?.toUpperCase() ?? null;
}

function normaliseTimestamp(
  value: string | Date | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function validCoordinates(
  coordinates: SpatialProvenanceInput["coordinates"],
): coordinates is { lat: number; lng: number } {
  return Boolean(
    coordinates &&
      Number.isFinite(coordinates.lat) &&
      Number.isFinite(coordinates.lng) &&
      coordinates.lat >= -90 &&
      coordinates.lat <= 90 &&
      coordinates.lng >= -180 &&
      coordinates.lng <= 180,
  );
}

function normaliseOfficialServiceUrl(
  value: string | null | undefined,
): string | null {
  const candidate = normaliseText(value);
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    const allowedPaths = new Set([
      new URL(NSW_EPI_PLANNING_SERVICE_URL).pathname,
      new URL(NSW_EPI_ZONING_LAYER_URL).pathname,
    ]);
    const pathname = parsed.pathname.replace(/\/$/, "");

    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "mapprod3.environment.nsw.gov.au" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      !allowedPaths.has(pathname)
    ) {
      return null;
    }

    return `${parsed.origin}${pathname}`;
  } catch {
    return null;
  }
}

function uniqueConflictZones(
  zoneCode: string | null,
  values: SpatialProvenanceInput["conflictingZoneCodes"],
): string[] {
  const zones = new Set<string>();
  if (zoneCode) zones.add(zoneCode);

  for (const value of values ?? []) {
    const normalised = normaliseZoneCode(value);
    if (normalised) zones.add(normalised);
  }

  return [...zones];
}

export function assessSpatialProvenance(
  input: SpatialProvenanceInput,
): SpatialProvenance {
  const zoneCode = normaliseZoneCode(input.zoneCode);
  const zoningSource = normaliseText(input.zoningSource);
  const resolvedAt = normaliseTimestamp(input.resolvedAt);
  const coordinates = validCoordinates(input.coordinates)
    ? input.coordinates
    : null;
  const parcelId = normaliseText(input.parcelId);
  const featureIdentifier =
    input.featureIdentifier === null ||
    input.featureIdentifier === undefined
      ? null
      : normaliseText(String(input.featureIdentifier));
  const serviceUrl = normaliseOfficialServiceUrl(input.serviceUrl);
  const authoritativeSource = Boolean(
    zoningSource && AUTHORITATIVE_ZONING_SOURCES.has(zoningSource),
  );
  const authoritativeMethod =
    (input.resolutionMethod === "coordinate_intersection" &&
      coordinates !== null) ||
    (input.resolutionMethod === "parcel_lookup" && parcelId !== null);
  const conflict =
    uniqueConflictZones(zoneCode, input.conflictingZoneCodes).length > 1;

  const limitations: SpatialProvenanceLimitation[] = [];
  if (!zoneCode) limitations.push("missing_zone");
  if (!resolvedAt) limitations.push("invalid_timestamp");
  if (conflict) limitations.push("zone_conflict");
  if (!authoritativeSource) limitations.push("non_authoritative_source");
  if (!serviceUrl) limitations.push("missing_official_service_url");
  if (
    input.resolutionMethod === "candidate_fallback" ||
    input.resolutionMethod === "manual_entry"
  ) {
    limitations.push("unsupported_resolution_method");
  }
  if (!authoritativeMethod) limitations.push("missing_location_evidence");
  if (!featureIdentifier) limitations.push("missing_feature_identifier");

  const status: SpatialProvenanceStatus =
    !zoneCode || !resolvedAt || conflict
      ? "unresolved"
      : authoritativeSource &&
          serviceUrl !== null &&
          authoritativeMethod &&
          featureIdentifier !== null
        ? "verified"
        : "partial";

  return {
    status,
    authoritative: status === "verified",
    zoneCode,
    zoningSource,
    resolutionMethod: input.resolutionMethod,
    serviceUrl,
    layerUrl: serviceUrl ? NSW_EPI_ZONING_LAYER_URL : null,
    featureIdentifier,
    resolvedAt,
    query: {
      coordinates,
      parcelId,
    },
    limitations,
  };
}
