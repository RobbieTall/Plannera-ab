import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTHORITATIVE_SPATIAL_SOURCES,
  buildAuthoritativeSpatialQueries,
  parseBushfireEvidence,
  parseLotEvidence,
  parseRoadReferenceEvidence,
  parseWaterProximityEvidence,
  redactSpatialQueryUrl,
} from "./pathway-authoritative-spatial";

const CHECKED_AT = "2026-08-25T00:00:00.000Z";

test("builds read-only point queries with identifier-free output fields", () => {
  const queries = buildAuthoritativeSpatialQueries(-30.5, 153.5);

  for (const query of [
    queries.lot,
    queries.bushfire,
    ...queries.water,
    queries.roadReference,
  ]) {
    const url = new URL(query);
    assert.equal(url.pathname.endsWith("/query"), true);
    assert.equal(url.searchParams.get("returnGeometry"), "false");
    assert.equal(url.searchParams.get("geometryType"), "esriGeometryPoint");
    assert.equal(url.searchParams.get("inSR"), "4326");
  }

  assert.equal(
    new URL(queries.lot).searchParams.get("outFields"),
    "planlotarea,planlotareaunits,lastupdate,startdate,enddate",
  );
  assert.equal(queries.lot.includes("lotnumber"), false);
  assert.equal(queries.lot.includes("planlabel"), false);
  assert.equal(queries.lot.includes("lotidstring"), false);
  assert.equal(queries.roadReference.includes("roadnamebase"), false);

  for (const query of queries.water) {
    const url = new URL(query);
    assert.equal(url.searchParams.get("distance"), "50");
    assert.equal(url.searchParams.get("units"), "esriSRUnit_Meter");
    assert.equal(url.searchParams.get("returnCountOnly"), "true");
  }

  assert.equal(
    redactSpatialQueryUrl(queries.lot),
    `${AUTHORITATIVE_SPATIAL_SOURCES.lot}/query`,
  );
  assert.equal(redactSpatialQueryUrl(queries.lot).includes("geometry="), false);
});

test("normalizes cadastral hectares and never carries parcel identifiers", () => {
  const result = parseLotEvidence(
    {
      features: [
        {
          attributes: {
            planlotarea: 2.5,
            planlotareaunits: "ha",
            lastupdate: Date.parse("2026-08-20T00:00:00.000Z"),
            lotnumber: "SENSITIVE",
            planlabel: "SENSITIVE",
            lotidstring: "SENSITIVE",
          },
          geometry: { rings: ["SENSITIVE"] },
        },
      ],
    },
    CHECKED_AT,
  );

  assert.equal(result.status, "SITE_CONFIRMED");
  assert.equal(result.value.areaSquareMetres, 25_000);
  assert.match(result.evidenceHash, /^[a-f0-9]{64}$/);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("SENSITIVE"), false);
  assert.equal(serialized.includes("lotnumber"), false);
  assert.equal(serialized.includes("geometry"), false);
});

test("fails closed for ambiguous lots and unsupported area units", () => {
  assert.throws(
    () => parseLotEvidence({ features: [] }, CHECKED_AT),
    /exactly one lot/,
  );
  assert.throws(
    () =>
      parseLotEvidence(
        {
          features: [
            {
              attributes: {
                planlotarea: 10,
                planlotareaunits: "acres",
              },
            },
          ],
        },
        CHECKED_AT,
      ),
    /unsupported/,
  );
});

test("labels bushfire intersections without claiming absence of risk", () => {
  const mapped = parseBushfireEvidence(
    {
      features: [
        {
          attributes: {
            d_category: "Vegetation Category 1",
            lastupdate: Date.parse("2026-08-20T00:00:00.000Z"),
          },
        },
      ],
    },
    CHECKED_AT,
  );
  const noIntersection = parseBushfireEvidence(
    { features: [] },
    CHECKED_AT,
  );

  assert.equal(mapped.status, "LAYER_INTERSECTION");
  assert.equal(
    mapped.value.interpretation,
    "POINT_INTERSECTS_STATEWIDE_BUSHFIRE_LAYER",
  );
  assert.equal(noIntersection.status, "NO_LAYER_INTERSECTION");
  assert.equal(
    noIntersection.value.interpretation,
    "NO_POINT_INTERSECTION_IN_STATEWIDE_BUSHFIRE_LAYER",
  );
});

test("uses all configured water layers and reports only a 50 metre layer check", () => {
  const result = parseWaterProximityEvidence(
    [{ count: 0 }, { count: 1 }, { count: 0 }, { count: 2 }],
    CHECKED_AT,
  );

  assert.equal(result.status, "WITHIN_50M");
  assert.equal(result.value.radiusMetres, 50);
  assert.equal(result.value.queriedLayerCount, 4);
  assert.equal(result.value.intersectingLayerCount, 2);
  assert.throws(
    () => parseWaterProximityEvidence([{ count: 0 }], CHECKED_AT),
    /Every configured NSW water layer/,
  );
});

test("road reference codes never become DCP road classification", () => {
  const result = parseRoadReferenceEvidence(
    {
      features: [
        {
          attributes: {
            functionhierarchy: 2,
            roadontype: 4,
            roadnamebase: "SENSITIVE",
            lastupdate: Date.parse("2026-08-20T00:00:00.000Z"),
          },
        },
      ],
    },
    CHECKED_AT,
  );

  assert.equal(result.status, "MORE_EVIDENCE_REQUIRED");
  assert.equal(
    result.value.interpretation,
    "REFERENCE_CODES_ONLY_NOT_DCP_CLASSIFIED_ROAD_EVIDENCE",
  );
  assert.equal(JSON.stringify(result).includes("SENSITIVE"), false);
});
