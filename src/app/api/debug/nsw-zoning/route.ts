import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// NOTE: Keep these in sync with src/lib/nsw-zoning.ts
const NSW_EPI_ZONING_SERVICE_URL =
  "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer";

const DEFAULT_SERVICE_URL = process.env.NSW_PLANNING_SERVICE_URL ?? NSW_EPI_ZONING_SERVICE_URL;

const ZONING_LAYER_NAME_HINTS = ["Land Zoning", "Land Zoning (LZN)", "Zoning", "LZN"];
const KNOWN_ZONING_LAYER_ID = Number.parseInt(process.env.NSW_PLANNING_ZONING_LAYER_ID ?? "2", 10);

const arcGisErrorSchema = z.object({ message: z.string().optional(), details: z.array(z.string()).optional() }).optional();
const arcGisLayerSchema = z.object({ id: z.number(), name: z.string() });
const arcGisLayerListSchema = z.object({ layers: z.array(arcGisLayerSchema), error: arcGisErrorSchema });

const zoningAttributesSchema = z.object({ attributes: z.record(z.string(), z.unknown()) });
const queryResponseSchema = z.object({
  features: z.array(zoningAttributesSchema).optional(),
  error: arcGisErrorSchema,
});

const withToken = (url: URL) => {
  const token = process.env.NSW_SPATIAL_API_KEY;
  if (token) {
    url.searchParams.set("token", token);
  }
  return url;
};

async function fetchJsonWithUrl<T>(
  baseUrl: string,
  params: Record<string, string | number | boolean>,
): Promise<{ data: T; status: number; statusText: string; url: string }> {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  withToken(url);

  const response = await fetch(url.toString());
  const data = (await response.json()) as T;

  return {
    data,
    status: response.status,
    statusText: response.statusText,
    url: url.toString(),
  };
}

async function resolveZoningLayerId(serviceUrl: string): Promise<number | null> {
  try {
    const data = await fetchJsonWithUrl<unknown>(serviceUrl, { f: "json" });
    const parsed = arcGisLayerListSchema.safeParse(data.data);
    if (!parsed.success) {
      console.warn("[nsw-zoning-debug] Unexpected layer response", { issues: parsed.error.issues });
      return null;
    }

    const matchedLayer = parsed.data.layers.find((layer) =>
      ZONING_LAYER_NAME_HINTS.some((hint) => layer.name.toLowerCase().includes(hint.toLowerCase())),
    );

    return matchedLayer?.id ?? null;
  } catch (error) {
    console.warn("[nsw-zoning-debug] Failed to resolve zoning layer", error);
    return null;
  }
}

async function queryZoningLayer(params: {
  layerId: number;
  coords: { lat: number; lng: number };
  serviceUrl: string;
}): Promise<{
  queryUrl: string;
  rawData: unknown;
  firstFeature: unknown;
  attributes: Record<string, unknown> | null;
  error: { message?: string; details?: string[] } | null;
}> {
  const { layerId, coords, serviceUrl } = params;
  const queryUrl = `${serviceUrl}/${layerId}/query`;

  const response = await fetchJsonWithUrl<unknown>(queryUrl, {
    f: "json",
    geometry: `${coords.lng},${coords.lat}`,
    geometryType: "esriGeometryPoint",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: false,
    where: "1=1",
  });

  const parsed = queryResponseSchema.safeParse(response.data);
  const error = parsed.success ? parsed.data.error ?? null : null;
  const feature = parsed.success ? parsed.data.features?.[0] : undefined;

  return {
    queryUrl: response.url,
    rawData: parsed.success && feature ? feature : response.data,
    firstFeature: feature ?? null,
    attributes: feature?.attributes ?? null,
    error,
  };
}

export async function GET(request: NextRequest) {
  const latParam = request.nextUrl.searchParams.get("lat");
  const lngParam = request.nextUrl.searchParams.get("lng");
  const lat = latParam ? Number.parseFloat(latParam) : Number.NaN;
  const lng = lngParam ? Number.parseFloat(lngParam) : Number.NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid or missing lat/lng" }, { status: 400 });
  }

  const serviceUrl = process.env.NSW_PLANNING_SERVICE_URL ?? DEFAULT_SERVICE_URL;

  const resolvedLayerId = await resolveZoningLayerId(serviceUrl);
  const candidateLayerIds = [KNOWN_ZONING_LAYER_ID, resolvedLayerId].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0,
  );

  const debugResults: Awaited<ReturnType<typeof queryZoningLayer>>[] = [];
  for (const layerId of candidateLayerIds) {
    const result = await queryZoningLayer({ layerId, coords: { lat, lng }, serviceUrl });
    debugResults.push(result);
    if (result.attributes) break;
  }

  const chosenResult = debugResults.find((result) => result.attributes) ?? debugResults[0];

  return NextResponse.json({
    input: { lat, lng },
    serviceUrl,
    candidateLayerIds,
    layerId: chosenResult ? candidateLayerIds[debugResults.indexOf(chosenResult)] ?? null : null,
    queryUrl: chosenResult?.queryUrl ?? null,
    rawResponse: chosenResult?.firstFeature ?? chosenResult?.rawData ?? null,
    attributes: chosenResult?.attributes ?? null,
    error: chosenResult?.error ?? null,
  });
}
