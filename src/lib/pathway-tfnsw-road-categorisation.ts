import type { ByronRoadClassificationEvidence } from "./pathway-byron-rural-setbacks";

export const TFNSW_ROAD_CATEGORISATION = {
  datasetPage:
    "https://data.nsw.gov.au/data/dataset/2-nsw-roads-network-categorisation",
  arcgisItemId: "a72722ea615445f1aa10deb1ffe02e9b",
  arcgisItemMetadataUrl:
    "https://www.arcgis.com/sharing/rest/content/items/a72722ea615445f1aa10deb1ffe02e9b?f=json",
  publisher: "Transport for NSW",
  supportedAdminClasses: ["STATE", "REGIONAL"] as const,
} as const;

export type TfnswAdminClass =
  (typeof TFNSW_ROAD_CATEGORISATION.supportedAdminClasses)[number];

export type TfnswArcgisItemMetadata = {
  id?: unknown;
  type?: unknown;
  url?: unknown;
  modified?: unknown;
  error?: unknown;
};

export type TfnswFeatureServiceMetadata = {
  layers?: unknown;
  error?: unknown;
};

export type TfnswFeatureServiceLayer = {
  id?: unknown;
  name?: unknown;
};

export type TfnswVerifiedLayer = {
  id: number;
  adminClass: TfnswAdminClass;
};

export type TfnswCountResponse = {
  count?: unknown;
  error?: unknown;
};

export type TfnswRoadCategorisationResult = {
  status: "CLASSIFIED_ROAD_CONFIRMED" | "MORE_EVIDENCE_REQUIRED";
  matchingFeatureCount: number;
  matchedAdminClasses: TfnswAdminClass[];
  evidence: ByronRoadClassificationEvidence;
  privacy: {
    frontageCoordinatesReturned: false;
    roadNameReturned: false;
    rawResponsesReturned: false;
    geometryReturned: false;
    networkIdentifiersReturned: false;
  };
};

function validDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function normalizeLayerName(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function trustedFeatureServiceUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Transport for NSW feature service URL is invalid.");
  }

  const hostname = parsed.hostname.toLowerCase();
  const trustedHost =
    hostname === "arcgis.com" ||
    hostname.endsWith(".arcgis.com") ||
    hostname === "nsw.gov.au" ||
    hostname.endsWith(".nsw.gov.au");

  if (
    parsed.protocol !== "https:" ||
    !trustedHost ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    !/\/FeatureServer\/?$/i.test(parsed.pathname)
  ) {
    throw new Error("Transport for NSW feature service URL is not trusted.");
  }

  return parsed.toString().replace(/\/$/, "");
}

function validateFrontagePoint(input: {
  latitude: number;
  longitude: number;
}): void {
  if (
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    throw new Error("A valid protected frontage point is required.");
  }
}

export function buildTfnswArcgisItemMetadataRequest(): {
  url: typeof TFNSW_ROAD_CATEGORISATION.arcgisItemMetadataUrl;
  init: { method: "GET"; cache: "no-store" };
} {
  return {
    url: TFNSW_ROAD_CATEGORISATION.arcgisItemMetadataUrl,
    init: { method: "GET", cache: "no-store" },
  };
}

export function parseTfnswArcgisItemMetadata(
  payload: TfnswArcgisItemMetadata,
): {
  serviceUrl: string;
  itemModifiedOn: string;
} {
  if (
    payload.error !== undefined ||
    payload.id !== TFNSW_ROAD_CATEGORISATION.arcgisItemId ||
    payload.type !== "Feature Service" ||
    typeof payload.url !== "string" ||
    typeof payload.modified !== "number" ||
    !Number.isSafeInteger(payload.modified) ||
    payload.modified <= 0
  ) {
    throw new Error("Transport for NSW ArcGIS item metadata is invalid.");
  }

  const modifiedDate = new Date(payload.modified);
  if (!Number.isFinite(modifiedDate.getTime())) {
    throw new Error("Transport for NSW ArcGIS item date is invalid.");
  }

  return {
    serviceUrl: trustedFeatureServiceUrl(payload.url),
    itemModifiedOn: modifiedDate.toISOString(),
  };
}

export function buildTfnswFeatureServiceMetadataRequest(
  serviceUrl: string,
): {
  url: string;
  init: { method: "GET"; cache: "no-store" };
} {
  const url = new URL(trustedFeatureServiceUrl(serviceUrl));
  url.searchParams.set("f", "json");
  return {
    url: url.toString(),
    init: { method: "GET", cache: "no-store" },
  };
}

export function parseTfnswFeatureServiceLayers(
  payload: TfnswFeatureServiceMetadata,
): TfnswVerifiedLayer[] {
  if (payload.error !== undefined || !Array.isArray(payload.layers)) {
    throw new Error("Transport for NSW feature service metadata is invalid.");
  }

  const expected = new Map<string, TfnswAdminClass>([
    ["STATE ROADS", "STATE"],
    ["REGIONAL ROADS", "REGIONAL"],
  ]);
  const verified: TfnswVerifiedLayer[] = [];

  for (const layer of payload.layers as TfnswFeatureServiceLayer[]) {
    if (
      typeof layer.name !== "string" ||
      typeof layer.id !== "number" ||
      !Number.isSafeInteger(layer.id) ||
      layer.id < 0
    ) {
      continue;
    }
    const adminClass = expected.get(normalizeLayerName(layer.name));
    if (adminClass) {
      verified.push({ id: layer.id, adminClass });
    }
  }

  const uniqueClasses = new Set(verified.map((layer) => layer.adminClass));
  const uniqueIds = new Set(verified.map((layer) => layer.id));
  if (
    verified.length !== 2 ||
    uniqueClasses.size !== 2 ||
    uniqueIds.size !== 2
  ) {
    throw new Error(
      "Transport for NSW State and Regional layers could not be verified.",
    );
  }

  return TFNSW_ROAD_CATEGORISATION.supportedAdminClasses.map(
    (adminClass) =>
      verified.find((layer) => layer.adminClass === adminClass)!,
  );
}

export function buildTfnswSpatialCountRequest(input: {
  serviceUrl: string;
  layer: TfnswVerifiedLayer;
  protectedFrontagePoint: {
    latitude: number;
    longitude: number;
  };
}): {
  url: string;
  init: {
    method: "POST";
    headers: { "content-type": "application/x-www-form-urlencoded" };
    body: string;
    cache: "no-store";
  };
} {
  const serviceUrl = trustedFeatureServiceUrl(input.serviceUrl);
  validateFrontagePoint(input.protectedFrontagePoint);
  if (
    !Number.isSafeInteger(input.layer.id) ||
    input.layer.id < 0 ||
    !TFNSW_ROAD_CATEGORISATION.supportedAdminClasses.includes(
      input.layer.adminClass,
    )
  ) {
    throw new Error("A verified Transport for NSW layer is required.");
  }

  const body = new URLSearchParams({
    f: "json",
    where: "1=1",
    geometry: [
      input.protectedFrontagePoint.longitude.toFixed(8),
      input.protectedFrontagePoint.latitude.toFixed(8),
    ].join(","),
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnCountOnly: "true",
    returnGeometry: "false",
  }).toString();

  return {
    url: `${serviceUrl}/${input.layer.id}/query`,
    init: {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    },
  };
}

export function parseTfnswRoadCategorisation(input: {
  layerCounts: Array<{
    adminClass: TfnswAdminClass;
    payload: TfnswCountResponse;
  }>;
  sourceUpdatedOn: string;
  checkedAt: string;
}): TfnswRoadCategorisationResult {
  if (
    !validDate(input.sourceUpdatedOn) ||
    !validDate(input.checkedAt) ||
    Date.parse(input.sourceUpdatedOn) > Date.parse(input.checkedAt)
  ) {
    throw new Error("Transport for NSW source dates are invalid.");
  }

  const byClass = new Map<TfnswAdminClass, number>();
  for (const layerCount of input.layerCounts) {
    if (
      !TFNSW_ROAD_CATEGORISATION.supportedAdminClasses.includes(
        layerCount.adminClass,
      ) ||
      byClass.has(layerCount.adminClass) ||
      layerCount.payload.error !== undefined ||
      typeof layerCount.payload.count !== "number" ||
      !Number.isSafeInteger(layerCount.payload.count) ||
      layerCount.payload.count < 0
    ) {
      throw new Error(
        "Transport for NSW spatial count response is invalid.",
      );
    }
    byClass.set(layerCount.adminClass, layerCount.payload.count);
  }

  if (
    byClass.size !==
      TFNSW_ROAD_CATEGORISATION.supportedAdminClasses.length ||
    TFNSW_ROAD_CATEGORISATION.supportedAdminClasses.some(
      (adminClass) => !byClass.has(adminClass),
    )
  ) {
    throw new Error(
      "Transport for NSW spatial count response is incomplete.",
    );
  }

  const matchedAdminClasses =
    TFNSW_ROAD_CATEGORISATION.supportedAdminClasses.filter(
      (adminClass) => (byClass.get(adminClass) ?? 0) > 0,
    );
  const matchingFeatureCount = [...byClass.values()].reduce(
    (sum, count) => sum + count,
    0,
  );
  const classifiedConfirmed = matchedAdminClasses.length > 0;

  return {
    status: classifiedConfirmed
      ? "CLASSIFIED_ROAD_CONFIRMED"
      : "MORE_EVIDENCE_REQUIRED",
    matchingFeatureCount,
    matchedAdminClasses: [...matchedAdminClasses],
    evidence: {
      category: classifiedConfirmed ? "CLASSIFIED_ROAD" : "UNRESOLVED",
      basis: classifiedConfirmed
        ? "TFNSW_POSITIVE_STATE_OR_REGIONAL_MATCH"
        : "DATASET_ABSENCE_ONLY",
      status: "CURRENT",
      sourceUrl: TFNSW_ROAD_CATEGORISATION.datasetPage,
      sourcePublishedOn: input.sourceUpdatedOn,
      checkedAt: input.checkedAt,
    },
    privacy: {
      frontageCoordinatesReturned: false,
      roadNameReturned: false,
      rawResponsesReturned: false,
      geometryReturned: false,
      networkIdentifiersReturned: false,
    },
  };
}
