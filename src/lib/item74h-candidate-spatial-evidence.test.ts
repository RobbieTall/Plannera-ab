import { describe, expect, it } from "vitest";

import {
  Item74hCandidateSpatialError,
  buildItem74hCandidateParcelQueryUrl,
  buildItem74hCandidateZoneQueryUrl,
  parseItem74hCandidateParcel,
  parseItem74hCandidateZones,
} from "./item74h-candidate-spatial-evidence";

const observedAt = new Date("2026-09-01T00:00:00.000Z");

const parcelPayload = {
  features: [
    {
      attributes: {
        cadid: 180752773,
        planoid: 3829161,
        plannumber: 1265934,
        planlabel: "DP1265934",
        lotnumber: "138",
        planlotarea: 2331.671,
        planlotareaunits: "m2",
        itstitlestatus: 1,
        classsubtype: 1,
        enddate: 32503680000000,
      },
      geometry: {
        rings: [
          [
            [153.47696, -28.55606],
            [153.47739, -28.55606],
            [153.47739, -28.55526],
            [153.47696, -28.55606],
          ],
        ],
        spatialReference: { wkid: 4326 },
      },
    },
  ],
};

const zone = (code: "C2" | "R2") => ({
  attributes: {
    EPI_NAME: "Byron Local Environmental Plan 2014",
    LGA_NAME: "BYRON",
    CURRENCY_DATE: 1787270400000,
    LAY_NAME:
      code === "C2"
        ? "Environmental Conservation"
        : "Low Density Residential",
    LAY_CLASS:
      code === "C2"
        ? "Environmental Conservation"
        : "Low Density Residential",
    SYM_CODE: code,
    PCO_REF_KEY: "2014-297",
    EPI_TYPE: "LEP",
  },
});

describe("Item 74H candidate spatial evidence", () => {
  it("builds an exact current-lot query and never uses a centroid", () => {
    const url = buildItem74hCandidateParcelQueryUrl();
    expect(url.hostname).toBe("portal.spatial.nsw.gov.au");
    expect(url.searchParams.get("where")).toContain("plannumber = 1265934");
    expect(url.searchParams.get("where")).toContain("lotnumber = '138'");
    expect(url.searchParams.get("returnGeometry")).toBe("true");
    expect(url.searchParams.has("geometry")).toBe(false);
  });

  it("accepts only the exact current parcel and retains its polygon internally", () => {
    const parcel = parseItem74hCandidateParcel(parcelPayload, observedAt);
    expect(parcel.facts).toMatchObject({
      cadid: 180752773,
      planoid: 3829161,
      planLabel: "DP1265934",
      lotNumber: "138",
      currentParcelConfirmed: true,
    });
    expect(parcel.geometry.rings).toHaveLength(1);
  });

  it("queries zoning with the full parcel polygon", () => {
    const parcel = parseItem74hCandidateParcel(parcelPayload, observedAt);
    const url = buildItem74hCandidateZoneQueryUrl(parcel.geometry);
    expect(url.hostname).toBe("mapprod3.environment.nsw.gov.au");
    expect(url.searchParams.get("geometryType")).toBe("esriGeometryPolygon");
    expect(url.searchParams.get("spatialRel")).toBe(
      "esriSpatialRelIntersects",
    );
    expect(url.searchParams.get("geometry")).toContain("rings");
  });

  it("confirms the official C2/R2 split but not the proposal zone", () => {
    const result = parseItem74hCandidateZones(
      { features: [zone("R2"), zone("C2")] },
      observedAt,
    );
    expect(result).toMatchObject({
      parcelZones: ["C2", "R2"],
      splitZoningConfirmed: true,
      proposalZoneConfirmed: false,
      requiresGeoreferencedProposalLocation: true,
      pcoReference: "2014-297",
    });
  });

  it("rejects an unsafe centroid-only R2 result", () => {
    expect(() =>
      parseItem74hCandidateZones({ features: [zone("R2")] }, observedAt),
    ).toThrowError(Item74hCandidateSpatialError);
  });

  it("rejects a changed or additional zone instead of weakening the gate", () => {
    expect(() =>
      parseItem74hCandidateZones(
        {
          features: [
            zone("C2"),
            zone("R2"),
            { ...zone("R2"), attributes: { ...zone("R2").attributes, SYM_CODE: "RU2" } },
          ],
        },
        observedAt,
      ),
    ).toThrowError(Item74hCandidateSpatialError);
  });
});
