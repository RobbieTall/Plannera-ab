import type { ByronRoadClassificationEvidence } from "./pathway-byron-rural-setbacks";

export const TFNSW_ROAD_CATEGORISATION = {
  datasetPage:
    "https://data.nsw.gov.au/data/dataset/2-nsw-roads-network-categorisation",
  apiUrl: "https://data.nsw.gov.au/data/api/action/datastore_search",
  resourceId: "2bff2775-4949-4ae1-89c6-0159662fc0c2",
  publisher: "Transport for NSW",
  supportedAdminClasses: ["STATE", "REGIONAL"] as const,
} as const;

export type TfnswRoadRecord = {
  road_name?: unknown;
  admin_class?: unknown;
  road_number?: unknown;
  ne_unique?: unknown;
};

export type TfnswDatastoreResponse = {
  success?: unknown;
  result?: {
    records?: unknown;
  };
};

export type TfnswRoadCategorisationResult = {
  status: "CLASSIFIED_ROAD_CONFIRMED" | "MORE_EVIDENCE_REQUIRED";
  matchingRecordCount: number;
  matchedAdminClasses: Array<"STATE" | "REGIONAL">;
  evidence: ByronRoadClassificationEvidence;
  privacy: {
    roadNameReturned: false;
    rawRecordsReturned: false;
    networkIdentifiersReturned: false;
  };
};

function normalizeRoadName(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function validDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

export function buildTfnswRoadCategorisationRequest(roadName: string): {
  url: typeof TFNSW_ROAD_CATEGORISATION.apiUrl;
  init: {
    method: "POST";
    headers: { "content-type": "application/json" };
    body: string;
    cache: "no-store";
  };
} {
  const normalized = normalizeRoadName(roadName);
  if (
    normalized.length < 2 ||
    normalized.length > 120 ||
    !/^[A-Z0-9 .'-]+$/.test(normalized)
  ) {
    throw new Error("A valid protected road name is required.");
  }

  return {
    url: TFNSW_ROAD_CATEGORISATION.apiUrl,
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resource_id: TFNSW_ROAD_CATEGORISATION.resourceId,
        limit: 100,
        q: normalized,
      }),
      cache: "no-store",
    },
  };
}

export function parseTfnswRoadCategorisation(input: {
  protectedRoadName: string;
  payload: TfnswDatastoreResponse;
  sourceUpdatedOn: string;
  checkedAt: string;
}): TfnswRoadCategorisationResult {
  const protectedRoadName = normalizeRoadName(input.protectedRoadName);
  buildTfnswRoadCategorisationRequest(protectedRoadName);

  if (
    input.payload.success !== true ||
    !Array.isArray(input.payload.result?.records)
  ) {
    throw new Error("Transport for NSW road categorisation response is invalid.");
  }
  if (
    !validDate(input.sourceUpdatedOn) ||
    !validDate(input.checkedAt) ||
    Date.parse(input.sourceUpdatedOn) > Date.parse(input.checkedAt)
  ) {
    throw new Error("Transport for NSW source dates are invalid.");
  }

  const exactMatches = (input.payload.result.records as TfnswRoadRecord[]).filter(
    (record) =>
      typeof record.road_name === "string" &&
      normalizeRoadName(record.road_name) === protectedRoadName,
  );
  const supportedClasses = [
    ...new Set(
      exactMatches
        .map((record) =>
          typeof record.admin_class === "string"
            ? record.admin_class.trim().toUpperCase()
            : "",
        )
        .filter(
          (value): value is "STATE" | "REGIONAL" =>
            value === "STATE" || value === "REGIONAL",
        ),
    ),
  ].sort();

  const allMatchesSupported =
    exactMatches.length > 0 &&
    exactMatches.every((record) => {
      const value =
        typeof record.admin_class === "string"
          ? record.admin_class.trim().toUpperCase()
          : "";
      return value === "STATE" || value === "REGIONAL";
    });
  const classifiedConfirmed =
    allMatchesSupported && supportedClasses.length > 0;

  return {
    status: classifiedConfirmed
      ? "CLASSIFIED_ROAD_CONFIRMED"
      : "MORE_EVIDENCE_REQUIRED",
    matchingRecordCount: exactMatches.length,
    matchedAdminClasses: supportedClasses,
    evidence: {
      category: classifiedConfirmed ? "CLASSIFIED_ROAD" : "UNRESOLVED",
      basis: classifiedConfirmed
        ? "TFNSW_POSITIVE_STATE_OR_REGIONAL_MATCH"
        : exactMatches.length === 0
          ? "DATASET_ABSENCE_ONLY"
          : "MISSING",
      status: "CURRENT",
      sourceUrl: TFNSW_ROAD_CATEGORISATION.datasetPage,
      sourcePublishedOn: input.sourceUpdatedOn,
      checkedAt: input.checkedAt,
    },
    privacy: {
      roadNameReturned: false,
      rawRecordsReturned: false,
      networkIdentifiersReturned: false,
    },
  };
}
