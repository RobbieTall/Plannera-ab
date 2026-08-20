import { describe, expect, it } from "vitest";

import {
  NSW_EPI_PLANNING_SERVICE_URL,
  NSW_EPI_ZONING_LAYER_URL,
  assessSpatialProvenance,
} from "./spatial-provenance";

const resolvedAt = "2026-08-20T08:35:20.068Z";

describe("assessSpatialProvenance", () => {
  it("verifies an authoritative Byron coordinate intersection with feature evidence", () => {
    const result = assessSpatialProvenance({
      zoneCode: "SP3",
      zoningSource: "NSW_EPI_LZN",
      resolutionMethod: "coordinate_intersection",
      serviceUrl: NSW_EPI_ZONING_LAYER_URL,
      featureIdentifier: 17421,
      resolvedAt,
      coordinates: {
        lat: -28.6508,
        lng: 153.612,
      },
    });

    expect(result).toMatchObject({
      status: "verified",
      authoritative: true,
      zoneCode: "SP3",
      zoningSource: "NSW_EPI_LZN",
      serviceUrl: NSW_EPI_ZONING_LAYER_URL,
      layerUrl: NSW_EPI_ZONING_LAYER_URL,
      featureIdentifier: "17421",
      resolvedAt,
      limitations: [],
    });
  });

  it("verifies an authoritative Kempsey parcel lookup with feature evidence", () => {
    const result = assessSpatialProvenance({
      zoneCode: "E2",
      zoningSource: "NSW_LZN",
      resolutionMethod: "parcel_lookup",
      serviceUrl: NSW_EPI_PLANNING_SERVICE_URL,
      featureIdentifier: "OBJECTID:9821",
      resolvedAt,
      parcelId: "1//DP123456",
    });

    expect(result.status).toBe("verified");
    expect(result.query.parcelId).toBe("1//DP123456");
    expect(result.query.coordinates).toBeNull();
  });

  it("keeps an authoritative result partial when the feature identifier is absent", () => {
    const result = assessSpatialProvenance({
      zoneCode: "SP2",
      zoningSource: "NSW_EPI_LZN",
      resolutionMethod: "coordinate_intersection",
      serviceUrl: NSW_EPI_ZONING_LAYER_URL,
      featureIdentifier: null,
      resolvedAt,
      coordinates: {
        lat: -31.078,
        lng: 152.84,
      },
    });

    expect(result.status).toBe("partial");
    expect(result.authoritative).toBe(false);
    expect(result.limitations).toContain("missing_feature_identifier");
  });

  it("never treats a launch fixture or candidate fallback as verified", () => {
    const result = assessSpatialProvenance({
      zoneCode: "SP3",
      zoningSource: "NSW_EPI_LZN",
      resolutionMethod: "candidate_fallback",
      serviceUrl: NSW_EPI_ZONING_LAYER_URL,
      featureIdentifier: "fixture-1",
      resolvedAt,
    });

    expect(result.status).toBe("partial");
    expect(result.authoritative).toBe(false);
    expect(result.limitations).toEqual(
      expect.arrayContaining([
        "unsupported_resolution_method",
        "missing_location_evidence",
      ]),
    );
  });

  it("fails closed when otherwise complete evidence contains a zone conflict", () => {
    const result = assessSpatialProvenance({
      zoneCode: "E2",
      zoningSource: "NSW_EPI_LZN",
      resolutionMethod: "coordinate_intersection",
      serviceUrl: NSW_EPI_ZONING_LAYER_URL,
      featureIdentifier: "OBJECTID:551",
      resolvedAt,
      coordinates: {
        lat: -31.08,
        lng: 152.83,
      },
      conflictingZoneCodes: ["E2", "RU1"],
    });

    expect(result.status).toBe("unresolved");
    expect(result.authoritative).toBe(false);
    expect(result.limitations).toContain("zone_conflict");
  });

  it("rejects an insecure or non-official service URL", () => {
    const result = assessSpatialProvenance({
      zoneCode: "SP3",
      zoningSource: "NSW_EPI_LZN",
      resolutionMethod: "coordinate_intersection",
      serviceUrl:
        "http://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
      featureIdentifier: "OBJECTID:1",
      resolvedAt,
      coordinates: {
        lat: -28.65,
        lng: 153.61,
      },
    });

    expect(result.status).toBe("partial");
    expect(result.serviceUrl).toBeNull();
    expect(result.layerUrl).toBeNull();
    expect(result.limitations).toContain("missing_official_service_url");
  });

  it("preserves a valid evidence timestamp and rejects an invalid one", () => {
    const valid = assessSpatialProvenance({
      zoneCode: "E2",
      zoningSource: "manual",
      resolutionMethod: "manual_entry",
      resolvedAt,
    });
    const invalid = assessSpatialProvenance({
      zoneCode: "E2",
      zoningSource: "manual",
      resolutionMethod: "manual_entry",
      resolvedAt: "not-a-date",
    });

    expect(valid.resolvedAt).toBe(resolvedAt);
    expect(valid.status).toBe("partial");
    expect(invalid.resolvedAt).toBeNull();
    expect(invalid.status).toBe("unresolved");
    expect(invalid.limitations).toContain("invalid_timestamp");
  });
});
