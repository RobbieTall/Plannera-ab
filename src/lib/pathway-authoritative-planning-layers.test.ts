import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTHORITATIVE_PLANNING_LAYER_SOURCES,
  buildAuthoritativePlanningLayerQueries,
  parseBiodiversityValuesEvidence,
  parseFloodPlanningLayerEvidence,
  parseHeritageLayerEvidence,
} from "./pathway-authoritative-planning-layers";

const CHECKED_AT = "2026-08-25T00:00:00.000Z";

test("builds identifier-minimized read-only planning layer queries", () => {
  const queries = buildAuthoritativePlanningLayerQueries(-30.5, 153.5);

  for (const query of Object.values(queries)) {
    const url = new URL(query);
    assert.equal(url.pathname.endsWith("/query"), true);
    assert.equal(url.searchParams.get("returnGeometry"), "false");
    assert.equal(url.searchParams.get("inSR"), "4326");
    assert.equal(query.includes("H_ID"), false);
    assert.equal(query.includes("H_NAME"), false);
    assert.equal(query.includes("OBJECTID"), false);
    assert.equal(query.includes("COMMENT"), false);
  }

  assert.equal(
    queries.heritage.startsWith(
      AUTHORITATIVE_PLANNING_LAYER_SOURCES.heritage,
    ),
    true,
  );
});

test("reports heritage intersection without carrying item identifiers", () => {
  const result = parseHeritageLayerEvidence(
    {
      features: [
        {
          attributes: {
            EPI_NAME: "Byron Local Environmental Plan 2014",
            LAY_CLASS: "Item - General",
            SIG: "Local",
            CURRENCY_DATE: Date.parse("2026-08-20T00:00:00.000Z"),
            H_ID: "SENSITIVE",
            H_NAME: "SENSITIVE",
          },
          geometry: { rings: ["SENSITIVE"] },
        },
      ],
    },
    CHECKED_AT,
  );

  assert.equal(result.status, "LAYER_INTERSECTION");
  assert.equal(
    result.value.interpretation,
    "POINT_INTERSECTS_PRIMARY_EPI_HERITAGE_LAYER",
  );
  assert.match(result.evidenceHash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result).includes("SENSITIVE"), false);
});

test("no heritage intersection is not described as no heritage risk", () => {
  const result = parseHeritageLayerEvidence({ features: [] }, CHECKED_AT);
  assert.equal(result.status, "NO_LAYER_INTERSECTION");
  assert.equal(
    result.value.interpretation,
    "NO_POINT_INTERSECTION_IN_PRIMARY_EPI_HERITAGE_LAYER",
  );
});

test("reports flood planning layer classes and currency", () => {
  const result = parseFloodPlanningLayerEvidence(
    {
      features: [
        {
          attributes: {
            EPI_NAME: "Byron Local Environmental Plan 2014",
            LAY_CLASS: "Flood Planning Area",
            CURRENCY_DATE: Date.parse("2026-08-18T00:00:00.000Z"),
          },
        },
      ],
    },
    CHECKED_AT,
  );

  assert.equal(result.status, "LAYER_INTERSECTION");
  assert.deepEqual(result.value.classes, ["Flood Planning Area"]);
  assert.equal(result.sourceUpdatedAt, "2026-08-18T00:00:00.000Z");
});

test("reports biodiversity map intersection with version date", () => {
  const result = parseBiodiversityValuesEvidence(
    {
      features: [
        {
          attributes: {
            Criteria: "Mapped criterion",
            BV_Category: "Biodiversity Values",
            VerDate: Date.parse("2026-08-19T00:00:00.000Z"),
            OBJECTID: 123,
          },
        },
      ],
    },
    CHECKED_AT,
  );

  assert.equal(result.status, "LAYER_INTERSECTION");
  assert.deepEqual(result.value.categories, ["Biodiversity Values"]);
  assert.equal(result.sourceUpdatedAt, "2026-08-19T00:00:00.000Z");
  assert.equal(JSON.stringify(result).includes("OBJECTID"), false);
});

test("fails closed on ArcGIS errors and malformed responses", () => {
  assert.throws(
    () =>
      parseFloodPlanningLayerEvidence(
        { error: { message: "failure" } },
        CHECKED_AT,
      ),
    /returned an error/,
  );
  assert.throws(
    () => parseBiodiversityValuesEvidence({}, CHECKED_AT),
    /feature array/,
  );
});
