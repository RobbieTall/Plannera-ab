export const ITEM74H_CANDIDATE_PARCEL_QUERY_ENDPOINT =
  "https://portal.spatial.nsw.gov.au/server/rest/services/Cadastre_History/FeatureServer/3/query";

export const ITEM74H_CANDIDATE_ZONING_QUERY_ENDPOINT =
  "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2/query";

export const ITEM74H_CANDIDATE_SPATIAL_IDENTITY = Object.freeze({
  cadid: 180752773,
  planoid: 3829161,
  planNumber: 1265934,
  planLabel: "DP1265934",
  lotNumber: "138",
  planLotAreaSquareMetres: 2331.671,
  titleStatus: 1,
  classSubtype: 1,
  instrumentName: "Byron Local Environmental Plan 2014",
  instrumentType: "LEP",
  pcoReference: "2014-297",
  expectedZones: ["C2", "R2"] as const,
});

type ArcGisAttributes = Record<string, unknown>;

export type ArcGisPolygon = {
  rings: number[][][];
  spatialReference?: Record<string, unknown>;
};

type ArcGisFeature = {
  attributes?: ArcGisAttributes;
  geometry?: ArcGisPolygon;
};

type ArcGisFeatureSet = {
  error?: { code?: number; message?: string };
  features?: ArcGisFeature[];
};

export class Item74hCandidateSpatialError extends Error {
  constructor(
    readonly code:
      | "ARCGIS_ERROR"
      | "PARCEL_NOT_UNIQUE"
      | "PARCEL_IDENTITY_MISMATCH"
      | "PARCEL_NOT_CURRENT"
      | "PARCEL_GEOMETRY_MISSING"
      | "ZONE_RESULT_INVALID"
      | "ZONE_SET_MISMATCH"
      | "ZONE_INSTRUMENT_MISMATCH"
      | "ZONE_CURRENCY_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "Item74hCandidateSpatialError";
  }
}

const attribute = (attributes: ArcGisAttributes, name: string): unknown => {
  const key = Object.keys(attributes).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );
  return key ? attributes[key] : undefined;
};

const textValue = (value: unknown) => String(value ?? "").trim();

const numberValue = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
};

const requireNoArcGisError = (payload: ArcGisFeatureSet) => {
  if (payload.error) {
    throw new Item74hCandidateSpatialError(
      "ARCGIS_ERROR",
      "The authoritative NSW spatial service returned an error.",
    );
  }
};

export const buildItem74hCandidateParcelQueryUrl = () => {
  const url = new URL(ITEM74H_CANDIDATE_PARCEL_QUERY_ENDPOINT);
  url.searchParams.set(
    "where",
    "plannumber = 1265934 AND lotnumber = '138' AND classsubtype = 1 AND itstitlestatus = 1",
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
      "itstitlestatus",
      "classsubtype",
      "startdate",
      "enddate",
      "lastupdate",
    ].join(","),
  );
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("returnTrueCurves", "false");
  url.searchParams.set("f", "json");
  return url;
};

export const parseItem74hCandidateParcel = (
  payload: ArcGisFeatureSet,
  observedAt: Date,
) => {
  requireNoArcGisError(payload);
  const features = payload.features ?? [];
  if (features.length !== 1) {
    throw new Item74hCandidateSpatialError(
      "PARCEL_NOT_UNIQUE",
      "The exact deposited-plan lot did not resolve to one current cadastral parcel.",
    );
  }

  const feature = features[0];
  const attributes = feature.attributes ?? {};
  const expected = ITEM74H_CANDIDATE_SPATIAL_IDENTITY;

  const identityMatches =
    numberValue(attribute(attributes, "cadid")) === expected.cadid &&
    numberValue(attribute(attributes, "planoid")) === expected.planoid &&
    numberValue(attribute(attributes, "plannumber")) === expected.planNumber &&
    textValue(attribute(attributes, "planlabel")).toUpperCase() ===
      expected.planLabel &&
    textValue(attribute(attributes, "lotnumber")) === expected.lotNumber &&
    numberValue(attribute(attributes, "itstitlestatus")) === expected.titleStatus &&
    numberValue(attribute(attributes, "classsubtype")) === expected.classSubtype &&
    Math.abs(
      numberValue(attribute(attributes, "planlotarea")) -
        expected.planLotAreaSquareMetres,
    ) < 0.001;

  if (!identityMatches) {
    throw new Item74hCandidateSpatialError(
      "PARCEL_IDENTITY_MISMATCH",
      "The authoritative cadastral attributes do not match the reviewed candidate.",
    );
  }

  const endDate = numberValue(attribute(attributes, "enddate"));
  if (Number.isFinite(endDate) && endDate <= observedAt.getTime()) {
    throw new Item74hCandidateSpatialError(
      "PARCEL_NOT_CURRENT",
      "The authoritative cadastral record is no longer current.",
    );
  }

  const geometry = feature.geometry;
  if (
    !geometry ||
    !Array.isArray(geometry.rings) ||
    geometry.rings.length === 0 ||
    geometry.rings.some((ring) => !Array.isArray(ring) || ring.length < 4)
  ) {
    throw new Item74hCandidateSpatialError(
      "PARCEL_GEOMETRY_MISSING",
      "The current parcel polygon is unavailable.",
    );
  }

  return {
    geometry,
    facts: {
      cadid: expected.cadid,
      planoid: expected.planoid,
      planLabel: expected.planLabel,
      lotNumber: expected.lotNumber,
      planLotAreaSquareMetres: expected.planLotAreaSquareMetres,
      titleStatusConfirmed: true,
      currentParcelConfirmed: true,
    },
  };
};

export const buildItem74hCandidateZoneQueryUrl = (
  parcelGeometry: ArcGisPolygon,
) => {
  const url = new URL(ITEM74H_CANDIDATE_ZONING_QUERY_ENDPOINT);
  url.searchParams.set("where", "1=1");
  url.searchParams.set("geometry", JSON.stringify(parcelGeometry));
  url.searchParams.set("geometryType", "esriGeometryPolygon");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set(
    "outFields",
    [
      "EPI_NAME",
      "LGA_NAME",
      "CURRENCY_DATE",
      "LAY_NAME",
      "LAY_CLASS",
      "SYM_CODE",
      "PCO_REF_KEY",
      "EPI_TYPE",
    ].join(","),
  );
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("f", "json");
  return url;
};

export const parseItem74hCandidateZones = (
  payload: ArcGisFeatureSet,
  observedAt: Date,
) => {
  requireNoArcGisError(payload);
  const features = payload.features ?? [];
  if (features.length !== 2 || features.some((feature) => !feature.attributes)) {
    throw new Item74hCandidateSpatialError(
      "ZONE_RESULT_INVALID",
      "The parcel did not resolve to the expected two official zoning records.",
    );
  }

  const zones = features
    .map((feature) => textValue(attribute(feature.attributes!, "SYM_CODE")))
    .sort();

  if (
    zones.length !== 2 ||
    zones[0] !== "C2" ||
    zones[1] !== "R2"
  ) {
    throw new Item74hCandidateSpatialError(
      "ZONE_SET_MISMATCH",
      "The official parcel zoning is no longer the reviewed C2/R2 split.",
    );
  }

  for (const feature of features) {
    const attributes = feature.attributes!;
    const instrumentMatches =
      textValue(attribute(attributes, "EPI_NAME")) ===
        ITEM74H_CANDIDATE_SPATIAL_IDENTITY.instrumentName &&
      textValue(attribute(attributes, "EPI_TYPE")) ===
        ITEM74H_CANDIDATE_SPATIAL_IDENTITY.instrumentType &&
      textValue(attribute(attributes, "PCO_REF_KEY")) ===
        ITEM74H_CANDIDATE_SPATIAL_IDENTITY.pcoReference &&
      textValue(attribute(attributes, "LGA_NAME")).toUpperCase() === "BYRON";

    if (!instrumentMatches) {
      throw new Item74hCandidateSpatialError(
        "ZONE_INSTRUMENT_MISMATCH",
        "The zoning result is not sourced from the expected Byron LEP.",
      );
    }

    const currencyDate = numberValue(attribute(attributes, "CURRENCY_DATE"));
    const ageDays = (observedAt.getTime() - currencyDate) / 86_400_000;
    if (!Number.isFinite(currencyDate) || ageDays < -2 || ageDays > 120) {
      throw new Item74hCandidateSpatialError(
        "ZONE_CURRENCY_INVALID",
        "The official zoning currency date is absent or outside the acceptance window.",
      );
    }
  }

  return {
    parcelZones: zones as ["C2", "R2"],
    instrumentName: ITEM74H_CANDIDATE_SPATIAL_IDENTITY.instrumentName,
    instrumentType: ITEM74H_CANDIDATE_SPATIAL_IDENTITY.instrumentType,
    pcoReference: ITEM74H_CANDIDATE_SPATIAL_IDENTITY.pcoReference,
    splitZoningConfirmed: true,
    proposalZoneConfirmed: false,
    requiresGeoreferencedProposalLocation: true,
  };
};
