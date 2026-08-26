import assert from "node:assert/strict";

import {
  buildTfnswRoadCategorisationRequest,
  parseTfnswRoadCategorisation,
} from "./pathway-tfnsw-road-categorisation";

const sourceUpdatedOn = "2026-07-17T00:57:00.000Z";
const checkedAt = "2026-08-26T10:00:00.000Z";

const request = buildTfnswRoadCategorisationRequest(" Example Road ");
assert.equal(request.url.startsWith("https://"), true);
assert.equal(request.init.method, "POST");
assert.deepEqual(JSON.parse(request.init.body), {
  resource_id: "2bff2775-4949-4ae1-89c6-0159662fc0c2",
  limit: 100,
  q: "EXAMPLE ROAD",
});

const state = parseTfnswRoadCategorisation({
  protectedRoadName: "Example Road",
  sourceUpdatedOn,
  checkedAt,
  payload: {
    success: true,
    result: {
      records: [
        {
          road_name: "EXAMPLE ROAD",
          admin_class: "State",
          road_number: 1,
          ne_unique: "not-returned",
        },
      ],
    },
  },
});
assert.equal(state.status, "CLASSIFIED_ROAD_CONFIRMED");
assert.equal(state.evidence.category, "CLASSIFIED_ROAD");
assert.equal(
  state.evidence.basis,
  "TFNSW_POSITIVE_STATE_OR_REGIONAL_MATCH",
);
assert.deepEqual(state.matchedAdminClasses, ["STATE"]);
assert.deepEqual(state.privacy, {
  roadNameReturned: false,
  rawRecordsReturned: false,
  networkIdentifiersReturned: false,
});
assert.equal(JSON.stringify(state).includes("EXAMPLE ROAD"), false);
assert.equal(JSON.stringify(state).includes("not-returned"), false);

const regional = parseTfnswRoadCategorisation({
  protectedRoadName: "Sample Street",
  sourceUpdatedOn,
  checkedAt,
  payload: {
    success: true,
    result: {
      records: [
        { road_name: "sample   street", admin_class: "Regional" },
        { road_name: "SAMPLE STREET", admin_class: "REGIONAL" },
      ],
    },
  },
});
assert.equal(regional.status, "CLASSIFIED_ROAD_CONFIRMED");
assert.deepEqual(regional.matchedAdminClasses, ["REGIONAL"]);

const absent = parseTfnswRoadCategorisation({
  protectedRoadName: "Local Lane",
  sourceUpdatedOn,
  checkedAt,
  payload: { success: true, result: { records: [] } },
});
assert.equal(absent.status, "MORE_EVIDENCE_REQUIRED");
assert.equal(absent.evidence.category, "UNRESOLVED");
assert.equal(absent.evidence.basis, "DATASET_ABSENCE_ONLY");

const unsupported = parseTfnswRoadCategorisation({
  protectedRoadName: "Local Lane",
  sourceUpdatedOn,
  checkedAt,
  payload: {
    success: true,
    result: {
      records: [{ road_name: "LOCAL LANE", admin_class: "Local" }],
    },
  },
});
assert.equal(unsupported.status, "MORE_EVIDENCE_REQUIRED");
assert.equal(unsupported.evidence.category, "UNRESOLVED");
assert.equal(unsupported.evidence.basis, "MISSING");

const mixed = parseTfnswRoadCategorisation({
  protectedRoadName: "Mixed Road",
  sourceUpdatedOn,
  checkedAt,
  payload: {
    success: true,
    result: {
      records: [
        { road_name: "MIXED ROAD", admin_class: "State" },
        { road_name: "MIXED ROAD", admin_class: "Unknown" },
      ],
    },
  },
});
assert.equal(mixed.status, "MORE_EVIDENCE_REQUIRED");
assert.equal(mixed.evidence.category, "UNRESOLVED");

assert.throws(
  () =>
    parseTfnswRoadCategorisation({
      protectedRoadName: "Example Road",
      sourceUpdatedOn: "2026-09-01T00:00:00.000Z",
      checkedAt,
      payload: { success: true, result: { records: [] } },
    }),
  /source dates are invalid/,
);

assert.throws(
  () =>
    parseTfnswRoadCategorisation({
      protectedRoadName: "Example Road",
      sourceUpdatedOn,
      checkedAt,
      payload: { success: false },
    }),
  /response is invalid/,
);

console.log(
  JSON.stringify({
    contract: "item74h-tfnsw-road-categorisation",
    passed: true,
    positiveStateMatch: "CLASSIFIED_ROAD_CONFIRMED",
    positiveRegionalMatch: "CLASSIFIED_ROAD_CONFIRMED",
    absence: "MORE_EVIDENCE_REQUIRED",
    unsupportedClass: "MORE_EVIDENCE_REQUIRED",
    mixedEvidence: "MORE_EVIDENCE_REQUIRED",
    roadNameReturned: false,
    productionCheckoutEnabled: false,
    productionMutationPerformed: false,
  }),
);
