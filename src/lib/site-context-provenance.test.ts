import { describe, expect, it } from "vitest";

import {
  NSW_EPI_ZONING_LAYER_URL,
} from "./spatial-provenance";
import {
  buildResolvedSiteProvenance,
  buildStoredSiteProvenance,
} from "./site-context-provenance";

describe("site-context provenance integration", () => {
  it("exposes a fresh authoritative coordinate result as verified", () => {
    const provenance = buildResolvedSiteProvenance({
      zoning: {
        zoneCode: "SP3",
        zoneName: "Tourist",
        source: "NSW_EPI_LZN",
        resolutionMethod: "coordinate_intersection",
        serviceUrl: NSW_EPI_ZONING_LAYER_URL.replace(/\/2$/, ""),
        layerUrl: NSW_EPI_ZONING_LAYER_URL,
        featureIdentifier: "OBJECTID:17421",
        resolvedAt: "2026-08-20T08:35:20.068Z",
      },
      location: {
        coordinates: {
          lat: -28.6508,
          lng: 153.612,
        },
      },
    });

    expect(provenance).toMatchObject({
      status: "verified",
      authoritative: true,
      zoneCode: "SP3",
      featureIdentifier: "OBJECTID:17421",
    });
  });

  it("keeps a launch fixture explicitly non-authoritative", () => {
    const provenance = buildResolvedSiteProvenance({
      zoning: {
        zoneCode: "E2",
        zoneName: "Commercial Centre",
        source: "LAUNCH_FIXTURE",
        resolutionMethod: "candidate_fallback",
        resolvedAt: "2026-08-20T08:35:20.068Z",
      },
      location: {
        coordinates: {
          lat: -31.078,
          lng: 152.84,
        },
      },
    });

    expect(provenance.status).toBe("partial");
    expect(provenance.authoritative).toBe(false);
    expect(provenance.zoningSource).toBe("LAUNCH_FIXTURE");
    expect(provenance.limitations).toEqual(
      expect.arrayContaining([
        "non_authoritative_source",
        "missing_official_service_url",
        "unsupported_resolution_method",
        "missing_location_evidence",
        "missing_feature_identifier",
      ]),
    );
  });

  it("fails a reloaded legacy record closed when source evidence was not persisted", () => {
    const provenance = buildStoredSiteProvenance({
      zoneCode: "SP2",
      zoningSource: "NSW_EPI_LZN",
      location: {
        parcelId: "1/DP123456",
      },
    });

    expect(provenance.status).toBe("unresolved");
    expect(provenance.authoritative).toBe(false);
    expect(provenance.resolvedAt).toBeNull();
    expect(provenance.limitations).toEqual(
      expect.arrayContaining([
        "invalid_timestamp",
        "missing_official_service_url",
        "missing_feature_identifier",
      ]),
    );
  });

  it("does not infer authority for a stored candidate zone", () => {
    const provenance = buildStoredSiteProvenance({
      zoneCode: "SP3",
      zoningSource: "CANDIDATE",
      location: {
        coordinates: {
          lat: -28.6508,
          lng: 153.612,
        },
      },
    });

    expect(provenance.status).toBe("unresolved");
    expect(provenance.authoritative).toBe(false);
    expect(provenance.resolutionMethod).toBe("candidate_fallback");
    expect(provenance.limitations).toContain("non_authoritative_source");
  });
});
