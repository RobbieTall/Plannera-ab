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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error("Authoritative spatial source request failed.");
  }
  return (await response.json()) as T;
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

  try {
    const resolved = await withoutResolverLogging(() =>
      resolveSiteFromText(address, {
        source: "site-search",
        limit: 10,
      }),
    );

    if (
      resolved.status !== "ok" ||
      resolved.decision !== "auto" ||
      resolved.candidates.length === 0
    ) {
      throw new Error("Controlled site did not auto-resolve.");
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
      throw new Error("Controlled site is outside the accepted Byron RU2 scope.");
    }

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
      fetchJson<ArcGisFeatureResponse>(spatialQueries.lot),
      fetchJson<ArcGisFeatureResponse>(spatialQueries.bushfire),
      Promise.all(
        spatialQueries.water.map((query) =>
          fetchJson<ArcGisCountResponse>(query),
        ),
      ),
      fetchJson<ArcGisFeatureResponse>(spatialQueries.roadReference),
      fetchJson<PlanningLayerFeatureResponse>(planningQueries.heritage),
      fetchJson<PlanningLayerFeatureResponse>(planningQueries.floodPlanning),
      fetchJson<PlanningLayerFeatureResponse>(
        planningQueries.biodiversityValues,
      ),
    ]);

    const checkedAt = new Date();
    const observations = [
      parseLotEvidence(lotResponse, checkedAt),
      parseBushfireEvidence(bushfireResponse, checkedAt),
      parseWaterProximityEvidence(waterResponses, checkedAt),
      parseRoadReferenceEvidence(roadResponse, checkedAt),
      parseHeritageLayerEvidence(heritageResponse, checkedAt),
      parseFloodPlanningLayerEvidence(floodResponse, checkedAt),
      parseBiodiversityValuesEvidence(biodiversityResponse, checkedAt),
    ];

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
  } catch {
    return NextResponse.json(
      {
        status: "failed",
        code: "AUTHORITATIVE_SPATIAL_ACCEPTANCE_FAILED",
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
