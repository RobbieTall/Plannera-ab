import {
  assessSpatialProvenance,
  type SpatialProvenance,
  type SpatialResolutionMethod,
} from "./spatial-provenance";
import type { ZoningResult } from "./nsw-zoning";

export type SiteProvenanceLocation = {
  coordinates?: {
    lat: number;
    lng: number;
  } | null;
  parcelId?: string | null;
};

const storedResolutionMethod = (params: {
  zoningSource?: string | null;
  location: SiteProvenanceLocation;
}): SpatialResolutionMethod => {
  if (
    params.zoningSource === "CANDIDATE" ||
    params.zoningSource === "LAUNCH_FIXTURE"
  ) {
    return "candidate_fallback";
  }
  if (params.location.coordinates) return "coordinate_intersection";
  if (params.location.parcelId) return "parcel_lookup";
  return "manual_entry";
};

export const buildResolvedSiteProvenance = (params: {
  zoning: ZoningResult | null;
  location: SiteProvenanceLocation;
  conflictingZoneCodes?: readonly (string | null | undefined)[];
}): SpatialProvenance =>
  assessSpatialProvenance({
    zoneCode: params.zoning?.zoneCode,
    zoningSource: params.zoning?.source,
    resolutionMethod:
      params.zoning?.resolutionMethod ??
      storedResolutionMethod({
        zoningSource: params.zoning?.source,
        location: params.location,
      }),
    serviceUrl: params.zoning?.serviceUrl,
    featureIdentifier: params.zoning?.featureIdentifier,
    resolvedAt: params.zoning?.resolvedAt,
    coordinates: params.location.coordinates,
    parcelId: params.location.parcelId,
    conflictingZoneCodes: params.conflictingZoneCodes,
  });

export const buildStoredSiteProvenance = (params: {
  zoneCode?: string | null;
  zoningSource?: string | null;
  location: SiteProvenanceLocation;
}): SpatialProvenance =>
  assessSpatialProvenance({
    zoneCode: params.zoneCode,
    zoningSource: params.zoningSource,
    resolutionMethod: storedResolutionMethod(params),
    serviceUrl: null,
    featureIdentifier: null,
    resolvedAt: null,
    coordinates: params.location.coordinates,
    parcelId: params.location.parcelId,
  });
