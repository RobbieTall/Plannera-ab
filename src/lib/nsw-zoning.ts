import { z } from "zod";

export type ZoningResult = {
  zoneCode: string;
  zoneName: string;
  source: "NSW_SIX";
  raw?: unknown;
};

export type ZoningQuery = {
  coords?: { lat: number; lng: number } | null;
  parcel?: { lot: string; dp: string } | null;
  includeRaw?: boolean;
  serviceUrl?: string;
};

const DEFAULT_SERVICE_URL =
  process.env.NSW_PLANNING_SERVICE_URL ?? "https://maps.six.nsw.gov.au/arcgis/rest/services/public/Planning/MapServer";

const ZONING_LAYER_NAME_HINTS = ["Land Zoning", "Land Zoning (LZN)", "Zoning", "LZN"];

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

async function fetchJson<T>(baseUrl: string, params: Record<string, string | number | boolean>): Promise<T> {
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

  return response.json() as Promise<T>;
}

const arcGisErrorSchema = z.object({ message: z.string().optional(), details: z.array(z.string()).optional() }).optional();
const arcGisLayerSchema = z.object({ id: z.number(), name: z.string() });
const arcGisLayerListSchema = z.object({ layers: z.array(arcGisLayerSchema), error: arcGisErrorSchema });

let cachedZoningLayerId: number | null = null;

async function resolveZoningLayerId(serviceUrl: string): Promise<number | null> {
  if (cachedZoningLayerId !== null) return cachedZoningLayerId;

  try {
    const data = await fetchJson<unknown>(serviceUrl, { f: "json" });
    const parsed = arcGisLayerListSchema.safeParse(data);
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
      const parsed = findResponseSchema.safeParse(response);
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

function deriveZone(attributes: Record<string, unknown>): { zoneCode?: string; zoneName?: string } {
  const normalizedEntries = Object.entries(attributes).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key.toLowerCase()] = value;
    return acc;
  }, {});

  const zoneCode =
    normaliseZoneString(
      normalizedEntries["zone_code"] ??
        normalizedEntries["zonecode"] ??
        normalizedEntries["zone"] ??
        normalizedEntries["lzn"] ??
        normalizedEntries["lzn_code"] ??
        normalizedEntries["lzncode"],
    );

  const zoneName =
    normaliseZoneString(
      normalizedEntries["zone_name"] ??
        normalizedEntries["zonename"] ??
        normalizedEntries["zone_description"] ??
        normalizedEntries["zone_desc"] ??
        normalizedEntries["zonelabel"] ??
        normalizedEntries["label"] ??
        normalizedEntries["description"],
    );

  return { zoneCode, zoneName };
}

async function queryZoningLayer(params: {
  layerId: number;
  coords: { lat: number; lng: number };
  serviceUrl: string;
  includeRaw?: boolean;
}): Promise<ZoningResult | null> {
  const { layerId, coords, serviceUrl, includeRaw } = params;
  const response = await fetchJson<unknown>(`${serviceUrl}/${layerId}/query`, {
    f: "json",
    geometry: `${coords.lng},${coords.lat}`,
    geometryType: "esriGeometryPoint",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: false,
    where: "1=1",
  });

  const parsed = queryResponseSchema.safeParse(response);
  if (!parsed.success) {
    console.warn("[nsw-zoning] Unexpected zoning query response", { issues: parsed.error.issues });
    return null;
  }

  if (parsed.data.error) {
    throw new NswZoningError(parsed.data.error.message ?? "Unknown NSW zoning API error", {
      details: parsed.data.error.details,
    });
  }

  const feature = parsed.data.features?.[0];
  if (!feature?.attributes) {
    console.warn("[nsw-zoning] No zoning feature found for coordinates", coords);
    return null;
  }

  const { zoneCode, zoneName } = deriveZone(feature.attributes);
  if (!zoneCode && !zoneName) {
    console.warn("[nsw-zoning] Zoning feature missing expected attributes", feature.attributes);
    return null;
  }

  return {
    zoneCode: zoneCode ?? zoneName ?? "Unknown",
    zoneName: zoneName ?? zoneCode ?? "Unknown",
    source: "NSW_SIX",
    raw: includeRaw ? response : undefined,
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

  const layerId = await resolveZoningLayerId(serviceUrl);
  if (layerId === null) {
    console.warn("[nsw-zoning] No zoning layer could be resolved from service", { serviceUrl });
    return null;
  }

  try {
    return await queryZoningLayer({ layerId, coords: targetCoords, serviceUrl, includeRaw: query.includeRaw });
  } catch (error) {
    if (error instanceof NswZoningError) {
      console.warn("[nsw-zoning] Zoning lookup failed", error.context ?? error.message);
      return null;
    }
    console.warn("[nsw-zoning] Unexpected zoning lookup error", error);
    return null;
  }
}
