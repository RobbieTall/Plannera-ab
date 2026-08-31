import { createHash } from "node:crypto";

export const ITEM74H_CADASTRAL_SOURCE_URL =
  "https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre_WFS/MapServer/0";
export const ITEM74H_CADASTRAL_DATASET =
  "NSW Digital Cadastral Database - Lot_M";
export const ITEM74H_CADASTRAL_AUTHORITY = "NSW Spatial Services";
export const ITEM74H_CADASTRAL_PLAN_AREA_SQM = 388312.589;
export const ITEM74H_DETAIL_SURVEY_AREA_HA = 39.47;

const EXPECTED_PLAN_LABEL = "DP1225487";
const EXPECTED_LOT_NUMBER = "11";
const EXPECTED_CADID = 174629509;
const EXPECTED_PLAN_OID = 2167328;
const EXPECTED_TITLE_STATUS = 1;
const EXPECTED_CLASS_SUBTYPE = 1;
const MAX_RESPONSE_BYTES = 2_000_000;

export class Item74hCadastralEvidenceError extends Error {
  constructor(readonly code: string) {
    super("Item 74H cadastral evidence failed closed");
  }
}

type JsonRecord = Record<string, unknown>;

export type Item74hCadastralEvidence = {
  authority: typeof ITEM74H_CADASTRAL_AUTHORITY;
  dataset: typeof ITEM74H_CADASTRAL_DATASET;
  sourceUrl: typeof ITEM74H_CADASTRAL_SOURCE_URL;
  sourceVersion: string;
  planAreaSquareMetres: number;
  planAreaHectares: number;
  detailSurveyAreaHectares: number;
  areaDifferenceHectares: number;
  areaDifferencePercent: number;
  titleStatusCode: number;
  classSubtype: number;
  effectiveFrom: string;
  lastUpdatedAt: string;
  parcelRecordHash: string;
  geometryHash: string;
  lotReferenceHash: string;
};

const isRecord = (value: unknown): value is JsonRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<JsonRecord>((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value;
};

const digest = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");

const finiteNumber = (
  value: unknown,
  code: string,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Item74hCadastralEvidenceError(code);
  }
  return value;
};

const isoDate = (value: number, code: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Item74hCadastralEvidenceError(code);
  }
  return date.toISOString();
};

export const parseItem74hCadastralEvidence = (
  payload: unknown,
  observedAt = new Date(),
): Item74hCadastralEvidence => {
  if (
    !isRecord(payload) ||
    payload.type !== "FeatureCollection" ||
    !Array.isArray(payload.features)
  ) {
    throw new Item74hCadastralEvidenceError("CADASTRAL_RESPONSE_INVALID");
  }

  const exactFeatures = payload.features.filter((feature) => {
    if (!isRecord(feature) || !isRecord(feature.properties)) return false;
    return (
      feature.type === "Feature" &&
      feature.properties.planlabel === EXPECTED_PLAN_LABEL &&
      feature.properties.lotnumber === EXPECTED_LOT_NUMBER
    );
  });
  if (exactFeatures.length < 1) {
    throw new Item74hCadastralEvidenceError("CADASTRAL_EXACT_PARCEL_MISSING");
  }

  const observedTime = observedAt.getTime();
  if (!Number.isFinite(observedTime)) {
    throw new Item74hCadastralEvidenceError("CADASTRAL_OBSERVED_AT_INVALID");
  }
  const currentFeatures = exactFeatures.filter((feature) => {
    const properties = (feature as JsonRecord).properties;
    if (!isRecord(properties)) return false;
    const start = properties.startdate;
    const end = properties.enddate;
    return (
      typeof start === "number" &&
      typeof end === "number" &&
      start <= observedTime &&
      end > observedTime
    );
  });
  if (currentFeatures.length !== 1) {
    throw new Item74hCadastralEvidenceError(
      "CADASTRAL_CURRENT_PARCEL_CARDINALITY",
    );
  }

  const feature = currentFeatures[0] as JsonRecord;
  const properties = feature.properties as JsonRecord;
  const geometry = feature.geometry;
  if (
    !isRecord(geometry) ||
    geometry.type !== "MultiPolygon" ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length === 0
  ) {
    throw new Item74hCadastralEvidenceError("CADASTRAL_GEOMETRY_INVALID");
  }

  const cadid = finiteNumber(properties.cadid, "CADASTRAL_CADID_INVALID");
  const planoid = finiteNumber(properties.planoid, "CADASTRAL_PLAN_OID_INVALID");
  const planArea = finiteNumber(
    properties.planlotarea,
    "CADASTRAL_PLAN_AREA_INVALID",
  );
  const titleStatus = finiteNumber(
    properties.itstitlestatus,
    "CADASTRAL_TITLE_STATUS_INVALID",
  );
  const classSubtype = finiteNumber(
    properties.classsubtype,
    "CADASTRAL_CLASS_SUBTYPE_INVALID",
  );
  const startDate = finiteNumber(
    properties.startdate,
    "CADASTRAL_START_DATE_INVALID",
  );
  const endDate = finiteNumber(
    properties.enddate,
    "CADASTRAL_END_DATE_INVALID",
  );
  const lastUpdate = finiteNumber(
    properties.lastupdate,
    "CADASTRAL_LAST_UPDATE_INVALID",
  );

  if (
    cadid !== EXPECTED_CADID ||
    planoid !== EXPECTED_PLAN_OID ||
    properties.plannumber !== 1225487 ||
    properties.planlotareaunits !== "Meters" ||
    titleStatus !== EXPECTED_TITLE_STATUS ||
    classSubtype !== EXPECTED_CLASS_SUBTYPE ||
    Math.abs(planArea - ITEM74H_CADASTRAL_PLAN_AREA_SQM) > 0.001 ||
    endDate <= observedTime
  ) {
    throw new Item74hCadastralEvidenceError(
      "CADASTRAL_EXPECTED_RECORD_MISMATCH",
    );
  }

  // Source precision is 0.001 m2, which maps to seven decimal places in hectares.
  const planAreaHectares = Number((planArea / 10_000).toFixed(7));
  const areaDifferenceHectares =
    ITEM74H_DETAIL_SURVEY_AREA_HA - planAreaHectares;

  return {
    authority: ITEM74H_CADASTRAL_AUTHORITY,
    dataset: ITEM74H_CADASTRAL_DATASET,
    sourceUrl: ITEM74H_CADASTRAL_SOURCE_URL,
    sourceVersion:
      "current feature updated " + isoDate(lastUpdate, "CADASTRAL_LAST_UPDATE_INVALID"),
    planAreaSquareMetres: planArea,
    planAreaHectares,
    detailSurveyAreaHectares: ITEM74H_DETAIL_SURVEY_AREA_HA,
    areaDifferenceHectares,
    areaDifferencePercent: (areaDifferenceHectares / planAreaHectares) * 100,
    titleStatusCode: titleStatus,
    classSubtype,
    effectiveFrom: isoDate(startDate, "CADASTRAL_START_DATE_INVALID"),
    lastUpdatedAt: isoDate(lastUpdate, "CADASTRAL_LAST_UPDATE_INVALID"),
    parcelRecordHash: digest({
      cadid,
      planoid,
      planlabel: properties.planlabel,
      lotnumber: properties.lotnumber,
      planArea,
      startDate,
      endDate,
      lastUpdate,
      titleStatus,
      classSubtype,
    }),
    geometryHash: digest(geometry),
    lotReferenceHash: digest(EXPECTED_LOT_NUMBER + "/" + EXPECTED_PLAN_LABEL),
  };
};

const queryUrl = () => {
  const url = new URL(ITEM74H_CADASTRAL_SOURCE_URL + "/query");
  url.searchParams.set(
    "where",
    "plannumber=1225487 AND lotnumber='11'",
  );
  url.searchParams.set(
    "outFields",
    [
      "cadid",
      "planoid",
      "plannumber",
      "planlabel",
      "lotnumber",
      "planlotarea",
      "planlotareaunits",
      "startdate",
      "enddate",
      "lastupdate",
      "itstitlestatus",
      "classsubtype",
    ].join(","),
  );
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("f", "geojson");
  return url;
};

export const fetchItem74hCadastralEvidence = async (
  fetcher: typeof fetch = fetch,
  observedAt = new Date(),
): Promise<Item74hCadastralEvidence> => {
  let response: Response;
  try {
    response = await fetcher(queryUrl(), {
      cache: "no-store",
      headers: { accept: "application/geo+json, application/json" },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Item74hCadastralEvidenceError("CADASTRAL_REQUEST_FAILED");
  }
  if (!response.ok) {
    throw new Item74hCadastralEvidenceError("CADASTRAL_RESPONSE_NOT_OK");
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Item74hCadastralEvidenceError("CADASTRAL_RESPONSE_TOO_LARGE");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Item74hCadastralEvidenceError("CADASTRAL_RESPONSE_INVALID_JSON");
  }
  return parseItem74hCadastralEvidence(payload, observedAt);
};
