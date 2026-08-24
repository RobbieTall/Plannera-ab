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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACCEPTANCE_FLAG = "ITEM74H_AUTHORITATIVE_SPATIAL_ACCEPTANCE";
const CONTROLLED_ADDRESS = "ITEM74H_CONTROLLED_ADDRESS";

type AcceptanceStage =
  | "RESOLVE_SITE"
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

async function withoutResolverLogging<T>(action: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;
  const silent = () => undefined;

  console.log = silent;
  console.info = silent;
  console.warn = silent;
  console.error = silent;
  try {
    return await action();
  } finally {
    console.log = originalLog;
    console.info = originalInfo;
    console.warn = originalWarn;
    console.error = originalError;
  }
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
    const resolved = await withoutResolverLogging(() =>
      resolveSiteFromText(address, {
        source: "site-search",
        limit: 10,
      }),
    );

    stage = "VALIDATE_SCOPE";
    if (
      resolved.status !== "ok" ||
      resolved.decision !== "auto" ||
      resolved.candidates.length === 0
    ) {
      throw new AcceptanceStageError(stage);
    }

    const candidate = resolved.candidates[0];
    const lga = candidate.lgaName?.trim().toUpperCase() ?? null;
    const zone = candidate.zone?.trim().toUpperCase() ?? null;
    const latitude = candidate.latitude;
    const longitude = candidate.longitude;

    if (
      lga !== "BYRON" ||
      zone !== "RU2" ||
      typeof latitude !== "number" ||
      !Number.isFinite(latitude) ||
      typeof longitude !== "number" ||
      !Number.isFinite(longitude)
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
          resolutionDecision: "auto",
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
