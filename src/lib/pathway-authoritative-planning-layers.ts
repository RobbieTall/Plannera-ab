import { createHash } from "node:crypto";

export const AUTHORITATIVE_PLANNING_LAYER_SOURCES = {
  heritage:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/0",
  floodPlanning:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/Hazard/MapServer/1",
  biodiversityValues:
    "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/BiodiversityValuesMap/MapServer/1",
} as const;

const HERITAGE_FIELDS = [
  "EPI_NAME",
  "LGA_NAME",
  "PUBLISHED_DATE",
  "COMMENCED_DATE",
  "CURRENCY_DATE",
  "AMENDMENT",
  "LAY_CLASS",
  "SIG",
  "EPI_TYPE",
] as const;

const FLOOD_FIELDS = [
  "EPI_NAME",
  "LGA_NAME",
  "PUBLISHED_DATE",
  "COMMENCED_DATE",
  "CURRENCY_DATE",
  "AMENDMENT",
  "LAY_CLASS",
  "EPI_TYPE",
] as const;

const BIODIVERSITY_FIELDS = [
  "Criteria",
  "BOSET_Class",
  "BV_Category",
  "Date_Added",
  "VerDate",
] as const;

type JsonRecord = Record<string, unknown>;

export interface PlanningLayerFeatureResponse {
  features?: Array<{
    attributes?: JsonRecord;
    geometry?: unknown;
  }>;
  error?: unknown;
}

export interface AuthoritativePlanningLayerQueries {
  heritage: string;
  floodPlanning: string;
  biodiversityValues: string;
}

export interface PlanningLayerObservation {
  factKey:
    | "HERITAGE_STATUS"
    | "FLOOD_PLANNING_STATUS"
    | "BIODIVERSITY_VALUES_STATUS";
  status: "LAYER_INTERSECTION" | "NO_LAYER_INTERSECTION";
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

function pointQuery(
  source: string,
  latitude: number,
  longitude: number,
  fields: readonly string[],
): string {
  assertCoordinates(latitude, longitude);
  const url = new URL(`${source}/query`);
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
  url.searchParams.set("outFields", fields.join(","));
  url.searchParams.set("returnGeometry", "false");
  return url.toString();
}

export function buildAuthoritativePlanningLayerQueries(
  latitude: number,
  longitude: number,
): AuthoritativePlanningLayerQueries {
  return {
    heritage: pointQuery(
      AUTHORITATIVE_PLANNING_LAYER_SOURCES.heritage,
      latitude,
      longitude,
      HERITAGE_FIELDS,
    ),
    floodPlanning: pointQuery(
      AUTHORITATIVE_PLANNING_LAYER_SOURCES.floodPlanning,
      latitude,
      longitude,
      FLOOD_FIELDS,
    ),
    biodiversityValues: pointQuery(
      AUTHORITATIVE_PLANNING_LAYER_SOURCES.biodiversityValues,
      latitude,
      longitude,
      BIODIVERSITY_FIELDS,
    ),
  };
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

function attributesOf(
  response: PlanningLayerFeatureResponse,
  label: string,
): JsonRecord[] {
  if (response.error !== undefined) {
    throw new Error(`${label} ArcGIS query returned an error.`);
  }
  if (!Array.isArray(response.features)) {
    throw new Error(`${label} ArcGIS query did not return a feature array.`);
  }
  return response.features.map((feature) => {
    if (!feature?.attributes || typeof feature.attributes !== "object") {
      throw new Error(`${label} ArcGIS feature has no attributes.`);
    }
    return feature.attributes;
  });
}

function strings(records: JsonRecord[], key: string): string[] {
  return [
    ...new Set(
      records
        .map((record) => record[key])
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
        .map((value) => value.trim()),
    ),
  ].sort();
}

function latestTimestamp(records: JsonRecord[], key: string): string | null {
  const timestamps = records
    .map((record) => optionalTimestamp(record[key]))
    .filter((value): value is string => value !== null)
    .sort();
  return timestamps.at(-1) ?? null;
}

function observation(
  value: Omit<PlanningLayerObservation, "evidenceHash">,
): PlanningLayerObservation {
  return {
    ...value,
    evidenceHash: createHash("sha256")
      .update(JSON.stringify(value))
      .digest("hex"),
  };
}

export function parseHeritageLayerEvidence(
  response: PlanningLayerFeatureResponse,
  checkedAtInput: Date | string = new Date(),
): PlanningLayerObservation {
  const records = attributesOf(response, "Heritage");
  const hasIntersection = records.length > 0;
  return observation({
    factKey: "HERITAGE_STATUS",
    status: hasIntersection
      ? "LAYER_INTERSECTION"
      : "NO_LAYER_INTERSECTION",
    value: {
      classes: strings(records, "LAY_CLASS"),
      significance: strings(records, "SIG"),
      instruments: strings(records, "EPI_NAME"),
      interpretation: hasIntersection
        ? "POINT_INTERSECTS_PRIMARY_EPI_HERITAGE_LAYER"
        : "NO_POINT_INTERSECTION_IN_PRIMARY_EPI_HERITAGE_LAYER",
    },
    publicSourceRef: AUTHORITATIVE_PLANNING_LAYER_SOURCES.heritage,
    sourceUpdatedAt: latestTimestamp(records, "CURRENCY_DATE"),
    checkedAt: checkedAtIso(checkedAtInput),
  });
}

export function parseFloodPlanningLayerEvidence(
  response: PlanningLayerFeatureResponse,
  checkedAtInput: Date | string = new Date(),
): PlanningLayerObservation {
  const records = attributesOf(response, "Flood planning");
  const hasIntersection = records.length > 0;
  return observation({
    factKey: "FLOOD_PLANNING_STATUS",
    status: hasIntersection
      ? "LAYER_INTERSECTION"
      : "NO_LAYER_INTERSECTION",
    value: {
      classes: strings(records, "LAY_CLASS"),
      instruments: strings(records, "EPI_NAME"),
      interpretation: hasIntersection
        ? "POINT_INTERSECTS_PRIMARY_EPI_FLOOD_PLANNING_LAYER"
        : "NO_POINT_INTERSECTION_IN_PRIMARY_EPI_FLOOD_PLANNING_LAYER",
    },
    publicSourceRef: AUTHORITATIVE_PLANNING_LAYER_SOURCES.floodPlanning,
    sourceUpdatedAt: latestTimestamp(records, "CURRENCY_DATE"),
    checkedAt: checkedAtIso(checkedAtInput),
  });
}

export function parseBiodiversityValuesEvidence(
  response: PlanningLayerFeatureResponse,
  checkedAtInput: Date | string = new Date(),
): PlanningLayerObservation {
  const records = attributesOf(response, "Biodiversity values");
  const hasIntersection = records.length > 0;
  return observation({
    factKey: "BIODIVERSITY_VALUES_STATUS",
    status: hasIntersection
      ? "LAYER_INTERSECTION"
      : "NO_LAYER_INTERSECTION",
    value: {
      categories: strings(records, "BV_Category"),
      criteria: strings(records, "Criteria"),
      interpretation: hasIntersection
        ? "POINT_INTERSECTS_BIODIVERSITY_VALUES_MAP"
        : "NO_POINT_INTERSECTION_IN_BIODIVERSITY_VALUES_MAP",
    },
    publicSourceRef:
      AUTHORITATIVE_PLANNING_LAYER_SOURCES.biodiversityValues,
    sourceUpdatedAt: latestTimestamp(records, "VerDate"),
    checkedAt: checkedAtIso(checkedAtInput),
  });
}
