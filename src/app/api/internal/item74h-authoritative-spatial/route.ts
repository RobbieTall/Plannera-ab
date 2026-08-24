import { NextResponse } from "next/server";

import {
  buildAuthoritativePlanningLayerQueries,
  parseBiodiversityValuesEvidence,
  parseFloodPlanningLayerEvidence,
  parseHeritageLayerEvidence,
  type PlanningLayerFeatureResponse,
} from "@/lib/pathway-authoritative-planning-layers";
import {
  buildAuthoritativeSpatialQueries,
  parseBushfireEvidence,
  parseLotEvidence,
  parseRoadReferenceEvidence,
  parseWaterProximityEvidence,
  type ArcGisCountResponse,
  type ArcGisFeatureResponse,
} from "@/lib/pathway-authoritative-spatial";
import { resolveSiteFromText } from "@/lib/site-resolver";
import { getZoningForSite } from "@/lib/nsw-zoning";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACCEPTANCE_FLAG = "ITEM74H_AUTHORITATIVE_SPATIAL_ACCEPTANCE";
const CONTROLLED_ADDRESS = "ITEM74H_CONTROLLED_ADDRESS";
const BYRON_LGA_NAMES = new Set([
  "BYRON",
  "BYRON SHIRE",
  "BYRON SHIRE COUNCIL",
]);
const ADDRESS_ABBREVIATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bSTREET\b/g, "ST"],
  [/\bROAD\b/g, "RD"],
  [/\bAVENUE\b/g, "AVE"],
  [/\bBOULEVARD\b/g, "BLVD"],
  [/\bLANE\b/g, "LN"],
  [/\bDRIVE\b/g, "DR"],
  [/\bPARADE\b/g, "PDE"],
  [/\bPLACE\b/g, "PL"],
  [/\bTERRACE\b/g, "TERR"],
  [/\bHIGHWAY\b/g, "HWY"],
  [/\bCIRCUIT\b/g, "CCT"],
  [/\bCOURT\b/g, "CT"],
];

type AcceptanceStage =
  | "RESOLVE_SITE"
  | "VALIDATE_SITE"
  | "RESOLVE_ZONING"
  | "VALIDATE_SCOPE"
  | "BUILD_QUERIES"
  | "FETCH_LOT"
  | "FETCH_BUSHFIRE"
  | "FETCH_WATER"
  | "FETCH_ROAD_REFERENCE"
  | "FETCH_HERITAGE"
  | "FETCH_FLOOD"
  | "FETCH_BIODIVERSITY"
  | "PARSE_LOT"
  | "PARSE_BUSHFIRE"
  | "PARSE_WATER"
  | "PARSE_ROAD_REFERENCE"
  | "PARSE_HERITAGE"
  | "PARSE_FLOOD"
  | "PARSE_BIODIVERSITY";

class AcceptanceStageError extends Error {
  constructor(readonly stage: AcceptanceStage) {
    super(stage);
  }
}

function normaliseAddressKey(value: string): string {
  let normalized = value.trim().toUpperCase().replace(/\bAUSTRALIA\b/g, " ");
  for (const [pattern, replacement] of ADDRESS_ABBREVIATIONS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized.replace(/[^A-Z0-9]/g, "");
}

function lotSchemaSummary(response: ArcGisFeatureResponse) {
  const featureArrayReturned = Array.isArray(response.features);
  const featureCount = featureArrayReturned ? response.features!.length : null;
  const attributes =
    featureArrayReturned &&
    featureCount === 1 &&
    response.features![0]?.attributes &&
    typeof response.features![0].attributes === "object"
      ? response.features![0].attributes
      : null;
  const area = attributes?.planlotarea;
  const unit = attributes?.planlotareaunits;
  const normalizedUnit =
    typeof unit === "string"
      ? unit.trim().toUpperCase().replaceAll(".", "").replaceAll(" ", "")
      : null;
  const areaUnitClass =
    normalizedUnit &&
    new Set(["M2", "SQM", "SQUAREMETRE", "SQUAREMETRES"]).has(normalizedUnit)
      ? "SQUARE_METRES"
      : normalizedUnit &&
          new Set(["HA", "HECTARE", "HECTARES"]).has(normalizedUnit)
        ? "HECTARES"
        : normalizedUnit
          ? "UNSUPPORTED"
          : "MISSING";

  return {
    arcGisErrorReturned: response.error !== undefined,
    featureArrayReturned,
    featureCount,
    attributesPresent: attributes !== null,
    areaNumericFinitePositive:
      typeof area === "number" && Number.isFinite(area) && area > 0,
    areaUnitClass,
    privacy: {
      areaValueLogged: false,
      areaUnitValueLogged: false,
      lotOrPlanLogged: false,
      parcelIdentifierLogged: false,
      geometryLogged: false,
      rawResponseLogged: false,
    },
  };
}

async function fetchJson<T>(
  url: string,
  stage: AcceptanceStage,
): Promise<T> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error("Authoritative source request failed.");
    }
    return (await response.json()) as T;
  } catch {
    throw new AcceptanceStageError(stage);
  }
}

export async function GET() {
  if (
    process.env.VERCEL_ENV !== "preview" ||
    process.env[ACCEPTANCE_FLAG] !== "true"
  ) {
    return NextResponse.json(
      { status: "disabled" },
      { status: 404 },
    );
  }

  const address = process.env[CONTROLLED_ADDRESS];
  if (!address) {
    return NextResponse.json(
      { status: "failed", code: "CONTROLLED_ADDRESS_MISSING" },
      { status: 503 },
    );
  }

  let stage: AcceptanceStage = "RESOLVE_SITE";

  try {
    const resolved = await resolveSiteFromText(address, {
      source: "site-search",
      limit: 10,
      suppressLogs: true,
    });

    stage = "VALIDATE_SITE";
    const resolutionStatusOk = resolved.status === "ok";
    const candidatePresent =
      resolutionStatusOk && resolved.candidates.length > 0;
    const controlledAddressKey = normaliseAddressKey(address);
    const exactMatches = resolutionStatusOk
      ? resolved.candidates.filter(
          (candidate) =>
            normaliseAddressKey(candidate.formattedAddress) ===
            controlledAddressKey,
        )
      : [];
    const uniqueExactAddressMatch = exactMatches.length === 1;

    if (
      !resolutionStatusOk ||
      !candidatePresent ||
      !uniqueExactAddressMatch
    ) {
      console.info("[item74h-authoritative-spatial-validation]", {
        resolutionStatusOk,
        candidatePresent,
        uniqueExactAddressMatch,
        lgaAllowlisted: false,
        coordinatesFinite: false,
        privacy: {
          addressLogged: false,
          candidateValuesLogged: false,
          rawResolverPayloadLogged: false,
        },
      });
      throw new AcceptanceStageError(stage);
    }

    const candidate = exactMatches[0];
    const lga = candidate.lgaName?.trim().toUpperCase() ?? null;
    const latitude = candidate.latitude;
    const longitude = candidate.longitude;
    const lgaAllowlisted = Boolean(lga && BYRON_LGA_NAMES.has(lga));
    const coordinatesFinite =
      typeof latitude === "number" &&
      Number.isFinite(latitude) &&
      typeof longitude === "number" &&
      Number.isFinite(longitude);

    if (!lgaAllowlisted || !coordinatesFinite) {
      console.info("[item74h-authoritative-spatial-validation]", {
        resolutionStatusOk,
        candidatePresent,
        uniqueExactAddressMatch,
        lgaAllowlisted,
        coordinatesFinite,
        privacy: {
          addressLogged: false,
          candidateValuesLogged: false,
          rawResolverPayloadLogged: false,
        },
      });
      throw new AcceptanceStageError(stage);
    }

    stage = "RESOLVE_ZONING";
    const zoning = await getZoningForSite({
      coords: {
        lat: latitude,
        lng: longitude,
      },
    });

    stage = "VALIDATE_SCOPE";
    if (
      !zoning ||
      zoning.source !== "NSW_EPI_LZN" ||
      zoning.resolutionMethod !== "coordinate_intersection" ||
      zoning.zoneCode.trim().toUpperCase() !== "RU2"
    ) {
      throw new AcceptanceStageError(stage);
    }

    stage = "BUILD_QUERIES";
    const spatialQueries = buildAuthoritativeSpatialQueries(
      latitude,
      longitude,
    );
    const planningQueries = buildAuthoritativePlanningLayerQueries(
      latitude,
      longitude,
    );

    const [
      lotResponse,
      bushfireResponse,
      waterResponses,
      roadResponse,
      heritageResponse,
      floodResponse,
      biodiversityResponse,
    ] = await Promise.all([
      fetchJson<ArcGisFeatureResponse>(spatialQueries.lot, "FETCH_LOT"),
      fetchJson<ArcGisFeatureResponse>(
        spatialQueries.bushfire,
        "FETCH_BUSHFIRE",
      ),
      Promise.all(
        spatialQueries.water.map((query) =>
          fetchJson<ArcGisCountResponse>(query, "FETCH_WATER"),
        ),
      ),
      fetchJson<ArcGisFeatureResponse>(
        spatialQueries.roadReference,
        "FETCH_ROAD_REFERENCE",
      ),
      fetchJson<PlanningLayerFeatureResponse>(
        planningQueries.heritage,
        "FETCH_HERITAGE",
      ),
      fetchJson<PlanningLayerFeatureResponse>(
        planningQueries.floodPlanning,
        "FETCH_FLOOD",
      ),
      fetchJson<PlanningLayerFeatureResponse>(
        planningQueries.biodiversityValues,
        "FETCH_BIODIVERSITY",
      ),
    ]);

    const checkedAt = new Date();

    stage = "PARSE_LOT";
    console.info(
      "[item74h-authoritative-spatial-lot-schema]",
      lotSchemaSummary(lotResponse),
    );
    const lotObservation = parseLotEvidence(lotResponse, checkedAt);
    stage = "PARSE_BUSHFIRE";
    const bushfireObservation = parseBushfireEvidence(
      bushfireResponse,
      checkedAt,
    );
    stage = "PARSE_WATER";
    const waterObservation = parseWaterProximityEvidence(
      waterResponses,
      checkedAt,
    );
    stage = "PARSE_ROAD_REFERENCE";
    const roadObservation = parseRoadReferenceEvidence(
      roadResponse,
      checkedAt,
    );
    stage = "PARSE_HERITAGE";
    const heritageObservation = parseHeritageLayerEvidence(
      heritageResponse,
      checkedAt,
    );
    stage = "PARSE_FLOOD";
    const floodObservation = parseFloodPlanningLayerEvidence(
      floodResponse,
      checkedAt,
    );
    stage = "PARSE_BIODIVERSITY";
    const biodiversityObservation = parseBiodiversityValuesEvidence(
      biodiversityResponse,
      checkedAt,
    );

    const observations = [
      lotObservation,
      bushfireObservation,
      waterObservation,
      roadObservation,
      heritageObservation,
      floodObservation,
      biodiversityObservation,
    ];

    console.info("[item74h-authoritative-spatial]", {
      status: "accepted",
      observationCount: observations.length,
      scopeEvidence: {
        uniqueExactAddressMatch: true,
        lgaAllowlisted: true,
        zoningSourceAuthoritative: true,
        zoningByCoordinateIntersection: true,
        zoningMatchesRu2: true,
      },
      privacy: {
        addressReturned: false,
        coordinatesReturned: false,
        parcelIdentifiersReturned: false,
        geometryReturned: false,
        rawResponsesReturned: false,
      },
      commercial: {
        productionCheckoutEnabled: false,
        planningControlsPackEligible: false,
        submissionSeeEligible: false,
      },
    });

    return NextResponse.json(
      {
        status: "accepted",
        scope: {
          lga: "BYRON",
          zone: "RU2",
          proposalType: "SHED_OUTBUILDING",
          resolutionDecision: "unique_exact_address_match",
          zoningSource: "NSW_EPI_LZN",
          zoningResolutionMethod: "coordinate_intersection",
        },
        observationCount: observations.length,
        observations,
        privacy: {
          addressReturned: false,
          coordinatesReturned: false,
          parcelIdentifiersReturned: false,
          geometryReturned: false,
          rawResponsesReturned: false,
        },
        commercial: {
          productionCheckoutEnabled: false,
          planningControlsPackEligible: false,
          submissionSeeEligible: false,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      },
    );
  } catch (error) {
    const failedStage =
      error instanceof AcceptanceStageError ? error.stage : stage;

    console.info("[item74h-authoritative-spatial]", {
      status: "failed",
      stage: failedStage,
      privacy: {
        addressLogged: false,
        coordinatesLogged: false,
        parcelIdentifiersLogged: false,
        rawErrorLogged: false,
      },
      commercial: {
        productionCheckoutEnabled: false,
        paidOutputsMutated: false,
      },
    });

    return NextResponse.json(
      {
        status: "failed",
        code: "AUTHORITATIVE_SPATIAL_ACCEPTANCE_FAILED",
        stage: failedStage,
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store, private",
        },
      },
    );
  }
}
