import { createHash } from "node:crypto";

export const AUTHORITATIVE_SPATIAL_SOURCES = {
  lot: "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Land_Parcel_Property_Theme_multiCRS/FeatureServer/8",
  bushfire: "https://portal.spatial.nsw.gov.au/server/rest/services/Hosted/NSW_BushFire_Prone_Land/FeatureServer/0",
  water: [
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Water_Theme/FeatureServer/2",
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Water_Theme/FeatureServer/5",
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Water_Theme/FeatureServer/6",
    "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Water_Theme/FeatureServer/7",
  ],
  road: "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Transport_Theme_multiCRS/FeatureServer/5",
} as const;

const LOT_FIELDS = [
  "planlotarea",
  "planlotareaunits",
  "lastupdate",
  "startdate",
  "enddate",
] as const;

const BUSHFIRE_FIELDS = [
  "d_category",
  "lastupdate",
  "startdate",
  "enddate",
] as const;

const ROAD_FIELDS = [
  "functionhierarchy",
  "roadontype",
  "lastupdate",
  "startdate",
  "enddate",
] as const;

type JsonRecord = Record<string, unknown>;

export interface ArcGisFeatureResponse {
  features?: Array<{
    attributes?: JsonRecord;
    geometry?: unknown;
  }>;
  error?: unknown;
}

export interface ArcGisCountResponse {
  count?: number;
  error?: unknown;
}

export interface AuthoritativeSpatialQueries {
  lot: string;
  bushfire: string;
  water: string[];
  roadReference: string;
}

export interface SpatialEvidenceObservation {
  factKey:
    | "LANDHOLDING_AREA_SQM"
    | "MAPPED_BUSHFIRE_INTERSECTION"
    | "MAPPED_WATER_PROXIMITY"
    | "ROAD_CLASSIFICATION";
  status:
    | "SITE_CONFIRMED"
    | "LAYER_INTERSECTION"
    | "NO_LAYER_INTERSECTION"
    | "WITHIN_50M"
    | "NO_LAYER_FEATURE_WITHIN_50M"
    | "MORE_EVIDENCE_REQUIRED";
  value: JsonRecord;
  publicSourceRef: string;
  sourceUpdatedAt: string | null;
  checkedAt: string;
  evidenceHash: string;
}

function assertCoordinates(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("A finite latitude between -90 and 90 is required.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("A finite longitude between -180 and 180 is required.");
  }
}

function buildPointQuery(
  layerUrl: string,
  latitude: number,
  longitude: number,
  options: {
    outFields?: readonly string[];
    distanceMeters?: number;
    returnCountOnly?: boolean;
  },
): string {
  assertCoordinates(latitude, longitude);
  const url = new URL(`${layerUrl}/query`);
  url.searchParams.set("f", "json");
  url.searchParams.set("where", "1=1");
  url.searchParams.set(
    "geometry",
    JSON.stringify({
      x: longitude,
      y: latitude,
      spatialReference: { wkid: 4326 },
    }),
  );
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("returnGeometry", "false");

  if (options.outFields) {
    url.searchParams.set("outFields", options.outFields.join(","));
  }
  if (options.distanceMeters !== undefined) {
    if (!Number.isFinite(options.distanceMeters) || options.distanceMeters <= 0) {
      throw new Error("Query distance must be a positive finite number.");
    }
    url.searchParams.set("distance", String(options.distanceMeters));
    url.searchParams.set("units", "esriSRUnit_Meter");
  }
  if (options.returnCountOnly) {
    url.searchParams.set("returnCountOnly", "true");
  }

  return url.toString();
}

export function buildAuthoritativeSpatialQueries(
  latitude: number,
  longitude: number,
): AuthoritativeSpatialQueries {
  return {
    lot: buildPointQuery(
      AUTHORITATIVE_SPATIAL_SOURCES.lot,
      latitude,
      longitude,
      { outFields: LOT_FIELDS },
    ),
    bushfire: buildPointQuery(
      AUTHORITATIVE_SPATIAL_SOURCES.bushfire,
      latitude,
      longitude,
      { outFields: BUSHFIRE_FIELDS },
    ),
    water: AUTHORITATIVE_SPATIAL_SOURCES.water.map((source) =>
      buildPointQuery(source, latitude, longitude, {
        distanceMeters: 50,
        returnCountOnly: true,
      }),
    ),
    roadReference: buildPointQuery(
      AUTHORITATIVE_SPATIAL_SOURCES.road,
      latitude,
      longitude,
      {
        outFields: ROAD_FIELDS,
        distanceMeters: 100,
      },
    ),
  };
}

export function redactSpatialQueryUrl(queryUrl: string): string {
  const url = new URL(queryUrl);
  return `${url.origin}${url.pathname}`;
}

function assertArcGisSuccess(response: { error?: unknown }, label: string): void {
  if (response.error !== undefined) {
    throw new Error(`${label} ArcGIS query returned an error.`);
  }
}

function attributesOf(
  response: ArcGisFeatureResponse,
  label: string,
): JsonRecord[] {
  assertArcGisSuccess(response, label);
  if (!Array.isArray(response.features)) {
    throw new Error(`${label} ArcGIS query did not return a feature array.`);
  }
  return response.features.map((feature) => {
    if (!feature || typeof feature !== "object") {
      throw new Error(`${label} ArcGIS query returned an invalid feature.`);
    }
    if (!feature.attributes || typeof feature.attributes !== "object") {
      throw new Error(`${label} ArcGIS feature has no attributes.`);
    }
    return feature.attributes;
  });
}

function checkedAtIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Evidence checkedAt timestamp is invalid.");
  }
  return date.toISOString();
}

function optionalTimestamp(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date =
    typeof value === "number" || typeof value === "string"
      ? new Date(value)
      : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeAreaSquareMetres(area: unknown, unit: unknown): number {
  if (typeof area !== "number" || !Number.isFinite(area) || area <= 0) {
    throw new Error("Cadastral lot area is missing or invalid.");
  }
  if (typeof unit !== "string") {
    throw new Error("Cadastral lot area unit is missing.");
  }

  const normalizedUnit = unit
    .trim()
    .toUpperCase()
    .replaceAll(".", "")
    .replaceAll(" ", "");

  const squareMetreUnits = new Set([
    "M2",
    "SQM",
    "SQUAREMETRE",
    "SQUAREMETRES",
  ]);
  const hectareUnits = new Set(["HA", "HECTARE", "HECTARES"]);

  let squareMetres: number;
  if (squareMetreUnits.has(normalizedUnit)) {
    squareMetres = area;
  } else if (hectareUnits.has(normalizedUnit)) {
    squareMetres = area * 10_000;
  } else {
    throw new Error("Cadastral lot area unit is unsupported.");
  }

  return Math.round(squareMetres * 100) / 100;
}

function evidenceHash(value: Omit<SpatialEvidenceObservation, "evidenceHash">): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function observation(
  value: Omit<SpatialEvidenceObservation, "evidenceHash">,
): SpatialEvidenceObservation {
  return { ...value, evidenceHash: evidenceHash(value) };
}

function latestTimestamp(attributes: JsonRecord[]): string | null {
  const timestamps = attributes
    .map((attributesRecord) => optionalTimestamp(attributesRecord.lastupdate))
    .filter((value): value is string => value !== null)
    .sort();
  return timestamps.at(-1) ?? null;
}

export function parseLotEvidence(
  response: ArcGisFeatureResponse,
  checkedAtInput: Date | string = new Date(),
): SpatialEvidenceObservation {
  const checkedAt = checkedAtIso(checkedAtInput);
  const attributes = attributesOf(response, "Cadastral lot");
  if (attributes.length !== 1) {
    throw new Error("Cadastral point query must resolve to exactly one lot.");
  }
  const lot = attributes[0];
  const areaSquareMetres = normalizeAreaSquareMetres(
    lot.planlotarea,
    lot.planlotareaunits,
  );

  return observation({
    factKey: "LANDHOLDING_AREA_SQM",
    status: "SITE_CONFIRMED",
    value: {
      areaSquareMetres,
      areaBasis: "NSW_CADASTRAL_PLAN_AREA",
      unit: "sqm",
    },
    publicSourceRef: AUTHORITATIVE_SPATIAL_SOURCES.lot,
    sourceUpdatedAt: optionalTimestamp(lot.lastupdate),
    checkedAt,
  });
}

export function parseBushfireEvidence(
  response: ArcGisFeatureResponse,
  checkedAtInput: Date | string = new Date(),
): SpatialEvidenceObservation {
  const checkedAt = checkedAtIso(checkedAtInput);
  const attributes = attributesOf(response, "Bushfire prone land");
  const categories = [
    ...new Set(
      attributes
        .map((record) => record.d_category)
        .filter(
          (category): category is string =>
            typeof category === "string" && category.trim().length > 0,
        )
        .map((category) => category.trim()),
    ),
  ].sort();

  return observation({
    factKey: "MAPPED_BUSHFIRE_INTERSECTION",
    status:
      categories.length > 0 ? "LAYER_INTERSECTION" : "NO_LAYER_INTERSECTION",
    value: {
      categories,
      interpretation:
        categories.length > 0
          ? "POINT_INTERSECTS_STATEWIDE_BUSHFIRE_LAYER"
          : "NO_POINT_INTERSECTION_IN_STATEWIDE_BUSHFIRE_LAYER",
    },
    publicSourceRef: AUTHORITATIVE_SPATIAL_SOURCES.bushfire,
    sourceUpdatedAt: latestTimestamp(attributes),
    checkedAt,
  });
}

export function parseWaterProximityEvidence(
  responses: ArcGisCountResponse[],
  checkedAtInput: Date | string = new Date(),
): SpatialEvidenceObservation {
  if (responses.length !== AUTHORITATIVE_SPATIAL_SOURCES.water.length) {
    throw new Error("Every configured NSW water layer must be queried.");
  }
  const checkedAt = checkedAtIso(checkedAtInput);
  const counts = responses.map((response, index) => {
    assertArcGisSuccess(response, `Water layer ${index + 1}`);
    if (
      typeof response.count !== "number" ||
      !Number.isInteger(response.count) ||
      response.count < 0
    ) {
      throw new Error("Water proximity query returned an invalid count.");
    }
    return response.count;
  });
  const intersectingLayerCount = counts.filter((count) => count > 0).length;

  return observation({
    factKey: "MAPPED_WATER_PROXIMITY",
    status:
      intersectingLayerCount > 0
        ? "WITHIN_50M"
        : "NO_LAYER_FEATURE_WITHIN_50M",
    value: {
      radiusMetres: 50,
      queriedLayerCount: counts.length,
      intersectingLayerCount,
      interpretation:
        intersectingLayerCount > 0
          ? "MAPPED_WATER_FEATURE_WITHIN_50M"
          : "NO_CONFIGURED_MAPPED_WATER_FEATURE_WITHIN_50M",
    },
    publicSourceRef:
      "https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Water_Theme/FeatureServer",
    sourceUpdatedAt: null,
    checkedAt,
  });
}

export function parseRoadReferenceEvidence(
  response: ArcGisFeatureResponse,
  checkedAtInput: Date | string = new Date(),
): SpatialEvidenceObservation {
  const checkedAt = checkedAtIso(checkedAtInput);
  const attributes = attributesOf(response, "Road reference");
  const functionHierarchyCodes = [
    ...new Set(
      attributes
        .map((record) => record.functionhierarchy)
        .filter(
          (value): value is number =>
            typeof value === "number" && Number.isInteger(value),
        ),
    ),
  ].sort((left, right) => left - right);
  const roadTypeCodes = [
    ...new Set(
      attributes
        .map((record) => record.roadontype)
        .filter(
          (value): value is number =>
            typeof value === "number" && Number.isInteger(value),
        ),
    ),
  ].sort((left, right) => left - right);

  return observation({
    factKey: "ROAD_CLASSIFICATION",
    status: "MORE_EVIDENCE_REQUIRED",
    value: {
      searchRadiusMetres: 100,
      matchingSegmentCount: attributes.length,
      functionHierarchyCodes,
      roadTypeCodes,
      interpretation:
        "REFERENCE_CODES_ONLY_NOT_DCP_CLASSIFIED_ROAD_EVIDENCE",
    },
    publicSourceRef: AUTHORITATIVE_SPATIAL_SOURCES.road,
    sourceUpdatedAt: latestTimestamp(attributes),
    checkedAt,
  });
}
