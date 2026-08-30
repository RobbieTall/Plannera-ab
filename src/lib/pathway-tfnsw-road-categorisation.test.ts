import assert from "node:assert/strict";

import {
  TFNSW_ROAD_CATEGORISATION,
  buildTfnswArcgisItemMetadataRequest,
  buildTfnswFeatureServiceMetadataRequest,
  buildTfnswSpatialCountRequest,
  parseTfnswArcgisItemMetadata,
  parseTfnswFeatureServiceLayers,
  parseTfnswRoadCategorisation,
} from "./pathway-tfnsw-road-categorisation";

const sourceUpdatedOn = "2026-07-17T00:57:00.000Z";
const checkedAt = "2026-08-26T10:00:00.000Z";
const serviceUrl =
  "https://portal.spatial.nsw.gov.au/server/rest/services/Transport/NSW_Roads/FeatureServer";

const itemRequest = buildTfnswArcgisItemMetadataRequest();
assert.equal(
  itemRequest.url,
  "https://www.arcgis.com/sharing/rest/content/items/a72722ea615445f1aa10deb1ffe02e9b?f=json",
);
assert.equal(itemRequest.init.method, "GET");

const item = parseTfnswArcgisItemMetadata({
  id: TFNSW_ROAD_CATEGORISATION.arcgisItemId,
  type: "Feature Service",
  url: serviceUrl,
  modified: Date.parse(sourceUpdatedOn),
});
assert.deepEqual(item, { serviceUrl, itemModifiedOn: sourceUpdatedOn });

assert.throws(
  () =>
    parseTfnswArcgisItemMetadata({
      id: TFNSW_ROAD_CATEGORISATION.arcgisItemId,
      type: "Feature Service",
      url: "https://example.com/FeatureServer",
      modified: Date.parse(sourceUpdatedOn),
    }),
  /not trusted/,
);
assert.throws(
  () =>
    parseTfnswArcgisItemMetadata({
      id: "different-item",
      type: "Feature Service",
      url: serviceUrl,
      modified: Date.parse(sourceUpdatedOn),
    }),
  /metadata is invalid/,
);

const serviceRequest = buildTfnswFeatureServiceMetadataRequest(serviceUrl);
assert.equal(serviceRequest.url, `${serviceUrl}?f=json`);
assert.equal(serviceRequest.init.method, "GET");

const layers = parseTfnswFeatureServiceLayers({
  layers: [
    { id: 0, name: "State Roads" },
    { id: 1, name: "Regional Roads" },
    { id: 2, name: "Reference only" },
  ],
});
assert.deepEqual(layers, [
  { id: 0, adminClass: "STATE" },
  { id: 1, adminClass: "REGIONAL" },
]);
assert.throws(
  () =>
    parseTfnswFeatureServiceLayers({
      layers: [
        { id: 0, name: "State Roads" },
        { id: 2, name: "Reference only" },
      ],
    }),
  /could not be verified/,
);
assert.throws(
  () =>
    parseTfnswFeatureServiceLayers({
      layers: [
        { id: 0, name: "State Roads" },
        { id: 1, name: "State Roads" },
        { id: 2, name: "Regional Roads" },
      ],
    }),
  /could not be verified/,
);

const protectedFrontagePoint = {
  latitude: -33.00000001,
  longitude: 151.00000001,
};
const query = buildTfnswSpatialCountRequest({
  serviceUrl,
  layer: layers[0],
  protectedFrontagePoint,
});
assert.equal(query.url, `${serviceUrl}/0/query`);
assert.equal(query.url.includes("151.00000001"), false);
assert.equal(query.init.method, "POST");
const queryBody = new URLSearchParams(query.init.body);
assert.equal(queryBody.get("geometry"), "151.00000001,-33.00000001");
assert.equal(queryBody.get("geometryType"), "esriGeometryPoint");
assert.equal(queryBody.get("spatialRel"), "esriSpatialRelIntersects");
assert.equal(queryBody.get("returnCountOnly"), "true");
assert.equal(queryBody.get("returnGeometry"), "false");
assert.equal(queryBody.get("outFields"), null);

assert.throws(
  () =>
    buildTfnswSpatialCountRequest({
      serviceUrl,
      layer: layers[0],
      protectedFrontagePoint: {
        latitude: Number.NaN,
        longitude: 151,
      },
    }),
  /valid protected frontage point/,
);

const state = parseTfnswRoadCategorisation({
  sourceUpdatedOn,
  checkedAt,
  layerCounts: [
    { adminClass: "STATE", payload: { count: 1 } },
    { adminClass: "REGIONAL", payload: { count: 0 } },
  ],
});
assert.equal(state.status, "CLASSIFIED_ROAD_CONFIRMED");
assert.equal(state.evidence.category, "CLASSIFIED_ROAD");
assert.equal(
  state.evidence.basis,
  "TFNSW_POSITIVE_STATE_OR_REGIONAL_MATCH",
);
assert.equal(state.matchingFeatureCount, 1);
assert.deepEqual(state.matchedAdminClasses, ["STATE"]);
assert.deepEqual(state.privacy, {
  frontageCoordinatesReturned: false,
  roadNameReturned: false,
  rawResponsesReturned: false,
  geometryReturned: false,
  networkIdentifiersReturned: false,
});
assert.equal(JSON.stringify(state).includes("151.00000001"), false);
assert.equal(JSON.stringify(state).includes("State Roads"), false);

const regional = parseTfnswRoadCategorisation({
  sourceUpdatedOn,
  checkedAt,
  layerCounts: [
    { adminClass: "STATE", payload: { count: 0 } },
    { adminClass: "REGIONAL", payload: { count: 2 } },
  ],
});
assert.equal(regional.status, "CLASSIFIED_ROAD_CONFIRMED");
assert.deepEqual(regional.matchedAdminClasses, ["REGIONAL"]);

const absent = parseTfnswRoadCategorisation({
  sourceUpdatedOn,
  checkedAt,
  layerCounts: [
    { adminClass: "STATE", payload: { count: 0 } },
    { adminClass: "REGIONAL", payload: { count: 0 } },
  ],
});
assert.equal(absent.status, "MORE_EVIDENCE_REQUIRED");
assert.equal(absent.evidence.category, "UNRESOLVED");
assert.equal(absent.evidence.basis, "DATASET_ABSENCE_ONLY");

assert.throws(
  () =>
    parseTfnswRoadCategorisation({
      sourceUpdatedOn,
      checkedAt,
      layerCounts: [
        { adminClass: "STATE", payload: { count: 0 } },
        { adminClass: "STATE", payload: { count: 1 } },
      ],
    }),
  /response is invalid/,
);
assert.throws(
  () =>
    parseTfnswRoadCategorisation({
      sourceUpdatedOn,
      checkedAt,
      layerCounts: [
        { adminClass: "STATE", payload: { count: 0 } },
        { adminClass: "REGIONAL", payload: { error: { code: 500 } } },
      ],
    }),
  /response is invalid/,
);
assert.throws(
  () =>
    parseTfnswRoadCategorisation({
      sourceUpdatedOn: "2026-09-01T00:00:00.000Z",
      checkedAt,
      layerCounts: [
        { adminClass: "STATE", payload: { count: 0 } },
        { adminClass: "REGIONAL", payload: { count: 0 } },
      ],
    }),
  /source dates are invalid/,
);

console.log(
  JSON.stringify({
    contract: "item74h-tfnsw-road-categorisation",
    passed: true,
    matchScope: "PROTECTED_FRONTAGE_POINT",
    positiveStateIntersection: "CLASSIFIED_ROAD_CONFIRMED",
    positiveRegionalIntersection: "CLASSIFIED_ROAD_CONFIRMED",
    absence: "MORE_EVIDENCE_REQUIRED",
    serviceAndLayersDynamicallyVerified: true,
    countOnly: true,
    geometryReturned: false,
    coordinatesReturned: false,
    productionCheckoutEnabled: false,
    productionMutationPerformed: false,
  }),
);
