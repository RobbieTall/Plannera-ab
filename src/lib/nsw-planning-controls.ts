import type { LepControlValue } from "@/types/quick-site-check-lep";

const DEFAULT_SERVICE_URL =
  process.env.NSW_PLANNING_SERVICE_URL ??
  "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer";

const CONTROL_LAYERS = {
  floorSpaceRatio: Number.parseInt(process.env.NSW_PLANNING_FSR_LAYER_ID ?? "1", 10),
  minimumLotSize: Number.parseInt(process.env.NSW_PLANNING_LOT_SIZE_LAYER_ID ?? "4", 10),
  heightOfBuilding: Number.parseInt(process.env.NSW_PLANNING_HEIGHT_LAYER_ID ?? "5", 10),
} as const;

type ArcGisAttributes = Record<string, unknown>;

type MappedPlanningControls = {
  heightOfBuilding: LepControlValue | null;
  fsr: LepControlValue | null;
  minLotSize: LepControlValue | null;
};

export type MappedPlanningControlQuery = {
  coords: { lat: number; lng: number } | null;
  instrumentName?: string | null;
  lga?: string | null;
  serviceUrl?: string;
};

const emptyControls = (): MappedPlanningControls => ({
  heightOfBuilding: null,
  fsr: null,
  minLotSize: null,
});

const textValue = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const numberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const compactNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));

const normaliseInstrument = (value: string | null | undefined) =>
  (value ?? "")
    .toLowerCase()
    .replace(/local environmental plan/g, "lep")
    .replace(/[^a-z0-9]+/g, "");

const normaliseLga = (value: string | null | undefined) =>
  (value ?? "")
    .toLowerCase()
    .replace(/\b(?:shire|city|municipal)?\s*council\b/g, "")
    .replace(/\b(?:shire|city|municipality)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");

const featureAttributes = (payload: unknown): ArcGisAttributes[] => {
  if (!payload || typeof payload !== "object") return [];
  const features = (payload as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((feature) => {
    if (!feature || typeof feature !== "object") return [];
    const attributes = (feature as { attributes?: unknown }).attributes;
    return attributes && typeof attributes === "object"
      ? [attributes as ArcGisAttributes]
      : [];
  });
};

const chooseFeature = (
  features: ArcGisAttributes[],
  instrumentName?: string | null,
  lga?: string | null,
) => {
  const lepFeatures = features.filter((feature) => {
    const type = textValue(feature.EPI_TYPE);
    return !type || type.toUpperCase() === "LEP";
  });
  const instrumentKey = normaliseInstrument(instrumentName);
  if (instrumentKey) {
    const exact = lepFeatures.filter(
      (feature) => normaliseInstrument(textValue(feature.EPI_NAME)) === instrumentKey,
    );
    if (exact.length === 1) return exact[0];
  }
  const lgaKey = normaliseLga(lga);
  if (lgaKey) {
    const exact = lepFeatures.filter(
      (feature) => normaliseLga(textValue(feature.LGA_NAME)) === lgaKey,
    );
    if (exact.length === 1) return exact[0];
  }
  return lepFeatures.length === 1 ? lepFeatures[0] : null;
};

const clauseRef = (attributes: ArcGisAttributes, fallback: string) =>
  textValue(attributes.LEGIS_REF_CLAUSE)?.replace(/^clause\s+/i, "") ?? fallback;

const sourceRef = (attributes: ArcGisAttributes, fallbackMapName: string) => {
  const instrument = textValue(attributes.EPI_NAME) ?? "NSW LEP";
  const mapName = textValue(attributes.MAP_NAME) ?? fallbackMapName;
  const clause = textValue(attributes.LEGIS_REF_CLAUSE);
  return [instrument, mapName, clause].filter(Boolean).join(" · ");
};

const citedControl = (
  value: string | null,
  attributes: ArcGisAttributes | null,
  fallbackClause: string,
  fallbackMapName: string,
): LepControlValue | null => {
  if (!value || !attributes) return null;
  return {
    value,
    clauseRef: clauseRef(attributes, fallbackClause),
    sourceRef: sourceRef(attributes, fallbackMapName),
    confidence: "Cited",
  };
};

async function queryLayer(
  layerId: number,
  query: MappedPlanningControlQuery,
): Promise<ArcGisAttributes | null> {
  if (!Number.isFinite(layerId) || !query.coords) return null;
  const url = new URL(`${query.serviceUrl ?? DEFAULT_SERVICE_URL}/${layerId}/query`);
  url.searchParams.set("f", "json");
  url.searchParams.set("geometry", `${query.coords.lng},${query.coords.lat}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("where", "EPI_TYPE='LEP'");
  if (process.env.NSW_SPATIAL_API_KEY) {
    url.searchParams.set("token", process.env.NSW_SPATIAL_API_KEY);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NSW planning layer ${layerId} returned ${response.status}`);
  }
  const payload = (await response.json()) as unknown;
  if (payload && typeof payload === "object" && "error" in payload) {
    throw new Error(`NSW planning layer ${layerId} returned an ArcGIS error`);
  }
  return chooseFeature(featureAttributes(payload), query.instrumentName, query.lga);
}

export async function getMappedPlanningControlsForSite(
  query: MappedPlanningControlQuery,
): Promise<MappedPlanningControls> {
  if (!query.coords) return emptyControls();

  try {
    const [fsrAttributes, lotAttributes, heightAttributes] = await Promise.all([
      queryLayer(CONTROL_LAYERS.floorSpaceRatio, query),
      queryLayer(CONTROL_LAYERS.minimumLotSize, query),
      queryLayer(CONTROL_LAYERS.heightOfBuilding, query),
    ]);

    const fsr = fsrAttributes ? numberValue(fsrAttributes.FSR) : null;
    const lotSize = lotAttributes ? numberValue(lotAttributes.LOT_SIZE) : null;
    const height = heightAttributes
      ? numberValue(heightAttributes.MAX_B_H_M) ?? numberValue(heightAttributes.MAX_B_H)
      : null;
    const lotUnits = lotAttributes ? textValue(lotAttributes.UNITS) : null;
    const heightUnits = heightAttributes ? textValue(heightAttributes.UNITS) : null;

    return {
      heightOfBuilding: citedControl(
        height === null ? null : `${compactNumber(height)}${heightUnits ?? "m"}`,
        heightAttributes,
        "4.3",
        "Height of Buildings Map",
      ),
      fsr: citedControl(
        fsr === null ? null : `${compactNumber(fsr)}:1`,
        fsrAttributes,
        "4.4",
        "Floor Space Ratio Map",
      ),
      minLotSize: citedControl(
        lotSize === null ? null : `${compactNumber(lotSize)} ${lotUnits ?? "m²"}`,
        lotAttributes,
        "4.1",
        "Lot Size Map",
      ),
    };
  } catch (error) {
    console.warn("[nsw-planning-controls] mapped control lookup failed", {
      message: error instanceof Error ? error.message : String(error),
      coords: query.coords,
      instrumentName: query.instrumentName ?? null,
    });
    return emptyControls();
  }
}
