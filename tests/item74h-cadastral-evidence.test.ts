import assert from "node:assert/strict";
import test from "node:test";

import {
  ITEM74H_CADASTRAL_PLAN_AREA_SQM,
  ITEM74H_CADASTRAL_SOURCE_URL,
  Item74hCadastralEvidenceError,
  parseItem74hCadastralEvidence,
} from "../src/lib/item74h-cadastral-evidence";

const historicalFeature = {
  type: "Feature",
  geometry: {
    type: "MultiPolygon",
    coordinates: [[[[153.4, -28.5], [153.5, -28.5], [153.4, -28.5]]]],
  },
  properties: {
    cadid: 174629509,
    planoid: 2167328,
    plannumber: 1225487,
    planlabel: "DP1225487",
    lotnumber: "11",
    planlotarea: ITEM74H_CADASTRAL_PLAN_AREA_SQM,
    planlotareaunits: "Meters",
    startdate: 1477019785000,
    enddate: 1683605441000,
    lastupdate: 1683641763583,
    itstitlestatus: 1,
    classsubtype: 1,
  },
};

const currentFeature = {
  ...historicalFeature,
  geometry: {
    type: "MultiPolygon",
    coordinates: [[[[153.41, -28.56], [153.42, -28.56], [153.41, -28.56]]]],
  },
  properties: {
    ...historicalFeature.properties,
    startdate: 1683605441000,
    enddate: 32503644000000,
    lastupdate: 1683641763604,
  },
};

const payload = (features: unknown[] = [historicalFeature, currentFeature]) => ({
  type: "FeatureCollection",
  features,
});

test("selects the single current exact NSW cadastral parcel and redacts geometry", () => {
  const result = parseItem74hCadastralEvidence(
    payload(),
    new Date("2026-09-01T00:00:00.000Z"),
  );
  assert.equal(result.sourceUrl, ITEM74H_CADASTRAL_SOURCE_URL);
  assert.equal(result.planAreaSquareMetres, ITEM74H_CADASTRAL_PLAN_AREA_SQM);
  assert.equal(result.planAreaHectares, 38.8312589);
  assert.ok(result.areaDifferenceHectares > 0.63);
  assert.ok(result.areaDifferencePercent > 1.6);
  assert.match(result.parcelRecordHash, /^[a-f0-9]{64}$/);
  assert.match(result.geometryHash, /^[a-f0-9]{64}$/);
  assert.match(result.lotReferenceHash, /^[a-f0-9]{64}$/);
  assert.equal("geometry" in result, false);
  assert.equal("coordinates" in result, false);
});

test("rejects more than one current parcel feature", () => {
  assert.throws(
    () =>
      parseItem74hCadastralEvidence(
        payload([currentFeature, { ...currentFeature }]),
        new Date("2026-09-01T00:00:00.000Z"),
      ),
    (error) =>
      error instanceof Item74hCadastralEvidenceError &&
      error.code === "CADASTRAL_CURRENT_PARCEL_CARDINALITY",
  );
});

test("rejects a changed official plan area for operator review", () => {
  const changed = {
    ...currentFeature,
    properties: {
      ...currentFeature.properties,
      planlotarea: ITEM74H_CADASTRAL_PLAN_AREA_SQM + 1,
    },
  };
  assert.throws(
    () =>
      parseItem74hCadastralEvidence(
        payload([changed]),
        new Date("2026-09-01T00:00:00.000Z"),
      ),
    (error) =>
      error instanceof Item74hCadastralEvidenceError &&
      error.code === "CADASTRAL_EXPECTED_RECORD_MISMATCH",
  );
});

test("rejects a non-current title-status record", () => {
  const changed = {
    ...currentFeature,
    properties: { ...currentFeature.properties, itstitlestatus: 0 },
  };
  assert.throws(
    () =>
      parseItem74hCadastralEvidence(
        payload([changed]),
        new Date("2026-09-01T00:00:00.000Z"),
      ),
    (error) =>
      error instanceof Item74hCadastralEvidenceError &&
      error.code === "CADASTRAL_EXPECTED_RECORD_MISMATCH",
  );
});
