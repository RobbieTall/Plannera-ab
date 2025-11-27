import { z } from "zod";

export type ZoningResult = {
  zoneCode: string;
  zoneName: string;
  source: "NSW_LZN" | "NSW_EPI_LZN";
  raw?: unknown;
};

export type ZoningQuery = {
  coords?: { lat: number; lng: number } | null;
  parcel?: { lot: string; dp: string } | null;
  includeRaw?: boolean;
  serviceUrl?: string;
};

const NSW_EPI_ZONING_SERVICE_URL =
  "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer";

const DEFAULT_SERVICE_URL = process.env.NSW_PLANNING_SERVICE_URL ?? NSW_EPI_ZONING_SERVICE_URL;

const ZONING_LAYER_NAME_HINTS = ["Land Zoning", "Land Zoning (LZN)", "Zoning", "LZN"];
const KNOWN_ZONING_LAYER_ID = Number.parseInt(process.env.NSW_PLANNING_ZONING_LAYER_ID ?? "2", 10);

export class NswZoningError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "NswZoningError";
  }
}

const withToken = (url: URL) => {
  const token = process.env.NSW_SPATIAL_API_KEY;
  if (token) {
    url.searchParams.set("token", token);
  }
  return url;
};

async function fetchJson<T>(
  baseUrl: string,
  params: Record<string, string | number | boolean>,
): Promise<{ data: T; status: number; statusText: string }> {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  withToken(url);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new NswZoningError("NSW zoning API responded with a non-2xx status", {
      status: response.status,
      statusText: response.statusText,
      url: url.toString(),
    });
  }

  return {
    data: (await response.json()) as T,
    status: response.status,
    statusText: response.statusText,
  };
}

const arcGisErrorSchema = z.object({ message: z.string().optional(), details: z.array(z.string()).optional() }).optional();
const arcGisLayerSchema = z.object({ id: z.number(), name: z.string() });
const arcGisLayerListSchema = z.object({ layers: z.array(arcGisLayerSchema), error: arcGisErrorSchema });

let cachedZoningLayerId: number | null = null;

async function resolveZoningLayerId(serviceUrl: string): Promise<number | null> {
  if (cachedZoningLayerId !== null) return cachedZoningLayerId;

  try {
    const data = await fetchJson<unknown>(serviceUrl, { f: "json" });
    const parsed = arcGisLayerListSchema.safeParse(data.data);
    if (!parsed.success) {
      console.warn("[nsw-zoning] Unexpected layer response", { issues: parsed.error.issues });
      return null;
    }

    const matchedLayer = parsed.data.layers.find((layer) =>
      ZONING_LAYER_NAME_HINTS.some((hint) => layer.name.toLowerCase().includes(hint.toLowerCase())),
    );

    cachedZoningLayerId = matchedLayer?.id ?? null;
    return cachedZoningLayerId;
  } catch (error) {
    console.warn("[nsw-zoning] Failed to resolve zoning layer", error);
    return null;
  }
}

const findResponseSchema = z.object({
  results: z
    .array(
      z.object({
        layerId: z.number(),
        layerName: z.string(),
        geometry: z
          .object({ x: z.number().optional(), y: z.number().optional() })
          .partial()
          .nullish(),
      }),
    )
    .optional(),
  error: arcGisErrorSchema,
});

async function findParcelCentroid({ parcel, serviceUrl }: { parcel: NonNullable<ZoningQuery["parcel"]>; serviceUrl: string }) {
  try {
    const searchTerms = [`${parcel.lot}/${parcel.dp}`, `${parcel.lot} ${parcel.dp}`];
    for (const term of searchTerms) {
      const response = await fetchJson<unknown>(`${serviceUrl}/find`, {
        f: "json",
        searchText: term,
        searchFields: "LOT,LOT_NUMBER,LOTNO,LOTDP,PLAN_NO,DP_NUMBER,DP", // Best-effort field hints
        layers: "all",
        returnGeometry: true,
      });
      const parsed = findResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        console.warn("[nsw-zoning] Unexpected parcel find response", { term, issues: parsed.error.issues });
        continue;
      }
      const resultWithGeometry = parsed.data.results?.find((result) => result.geometry?.x && result.geometry?.y);
      if (resultWithGeometry?.geometry?.x && resultWithGeometry?.geometry?.y) {
        return { lng: resultWithGeometry.geometry.x, lat: resultWithGeometry.geometry.y };
      }
    }
  } catch (error) {
    console.warn("[nsw-zoning] Parcel lookup failed", error);
  }
  return null;
}

const zoningAttributesSchema = z.object({ attributes: z.record(z.string(), z.unknown()) });
const queryResponseSchema = z.object({
  features: z.array(zoningAttributesSchema).optional(),
  error: arcGisErrorSchema,
});

function normaliseZoneString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

async function queryZoningLayer(params: {
  layerId: number;
  coords: { lat: number; lng: number };
  serviceUrl: string;
  includeRaw?: boolean;
}): Promise<ZoningResult | null> {
  const { layerId, coords, serviceUrl, includeRaw } = params;
  const queryUrl = `${serviceUrl}/${layerId}/query`;
  console.log("[nsw-zoning] querying zoning", {
    serviceUrl,
    coords,
    layerId,
    queryUrl,
  });

  const response = await fetchJson<unknown>(queryUrl, {
    f: "json",
    geometry: `${coords.lng},${coords.lat}`,
    geometryType: "esriGeometryPoint",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: false,
    where: "1=1",
  });

  const rawData = response.data as { error?: unknown; features?: unknown[] };
  if (rawData.error) {
    console.warn("[nsw-zoning] ArcGIS error", { error: rawData.error });
  }
  console.log("[nsw-zoning] query result", {
    featureCount: Array.isArray(rawData.features) ? rawData.features.length : 0,
    sampleAttributes:
      Array.isArray(rawData.features) && rawData.features.length > 0
        ? (rawData.features[0] as { attributes?: unknown }).attributes ?? null
        : null,
  });

  const parsed = queryResponseSchema.safeParse(response.data);
  if (!parsed.success) {
    console.warn("[nsw-zoning] Unexpected zoning query response", { issues: parsed.error.issues });
    return null;
  }

  if (parsed.data.error) {
    console.warn("[nsw-zoning] zoning query returned error", {
      coords,
      status: response.status,
      statusText: response.statusText,
      error: parsed.data.error,
    });
    throw new NswZoningError(parsed.data.error.message ?? "Unknown NSW zoning API error", {
      details: parsed.data.error.details,
    });
  }

  const feature = parsed.data.features?.[0];
  if (!feature?.attributes) {
    console.warn("[nsw-zoning] No zoning feature found for coordinates", {
      coords,
      status: response.status,
    });
    return null;
  }

  const attrs = feature.attributes as Record<string, unknown>;
  const zoneCode =
    normaliseZoneString(attrs.SYM_CODE) ??
    normaliseZoneString(attrs.ZONE_CODE) ??
    normaliseZoneString(attrs.ZONE) ??
    normaliseZoneString(attrs.LZN_ZONE) ??
    normaliseZoneString(attrs.LZNCODE) ??
    normaliseZoneString(attrs.ZONE_LEP) ??
    null;

  const zoneName =
    normaliseZoneString(attrs.LAY_CLASS) ??
    normaliseZoneString(attrs.ZONE_NAME) ??
    normaliseZoneString(attrs.LZN_ZONE_NAME) ??
    normaliseZoneString(attrs.ZONE_LABEL) ??
    normaliseZoneString(attrs.LZN_LABEL) ??
    normaliseZoneString(attrs.ZONE_DESC) ??
    normaliseZoneString(attrs.ZONE_DESCRIPTION) ??
    null;

  if (!zoneCode) {
    console.warn("[nsw-zoning] feature returned but no zone code field found", { attrs });
    return null;
  }

  console.log("[nsw-zoning] resolved zoning", { zoneCode, zoneName });

  return {
    zoneCode,
    zoneName: zoneName ?? "",
    source: "NSW_EPI_LZN",
    raw: includeRaw ? response.data : undefined,
  } satisfies ZoningResult;
}

export const formatZoningLabel = (result: ZoningResult | null): string | null => {
  if (!result) return null;
  if (result.zoneName && result.zoneName.toUpperCase().startsWith(result.zoneCode.toUpperCase())) {
    return result.zoneName;
  }
  return [result.zoneCode, result.zoneName].filter(Boolean).join(" – ");
};

export async function getZoningForSite(query: ZoningQuery): Promise<ZoningResult | null> {
  const serviceUrl = query.serviceUrl ?? DEFAULT_SERVICE_URL;
  const coords = query.coords ?? null;
  const parcel = query.parcel ?? null;

  const targetCoords = coords ?? (parcel ? await findParcelCentroid({ parcel, serviceUrl }) : null);
  if (!targetCoords) {
    console.warn("[nsw-zoning] Unable to determine coordinates for zoning lookup", { parcel });
    return null;
  }

  const resolvedLayerId = await resolveZoningLayerId(serviceUrl);
  const candidateLayerIds = [KNOWN_ZONING_LAYER_ID, resolvedLayerId].filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value >= 0,
  );
  if (candidateLayerIds.length === 0) {
    console.warn("[nsw-zoning] No zoning layer could be resolved from service", { serviceUrl });
    return null;
  }

  try {
    for (const layerId of candidateLayerIds) {
      const result = await queryZoningLayer({
        layerId,
        coords: targetCoords,
        serviceUrl,
        includeRaw: query.includeRaw,
      });
      if (result) return result;
    }
    return null;
  } catch (error) {
    if (error instanceof NswZoningError) {
      console.warn("[nsw-zoning] Zoning lookup failed", error.context ?? error.message);
      return null;
    }
    console.warn("[nsw-zoning] Unexpected zoning lookup error", error);
    return null;
  }
}
