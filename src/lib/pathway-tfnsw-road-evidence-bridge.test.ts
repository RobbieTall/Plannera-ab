import assert from "node:assert/strict";

import {
  PATHWAY_TFNSW_FRONTAGE_BINDING_VERSION,
  createPathwayTfnswRoadEvidencePlan,
  finalizePathwayTfnswRoadEvidence,
} from "./pathway-tfnsw-road-evidence-bridge";

const serviceUrl =
  "https://portal.spatial.nsw.gov.au/server/rest/services/Transport/NSW_Roads/FeatureServer";
const layers = [
  { id: 0, adminClass: "STATE" as const },
  { id: 1, adminClass: "REGIONAL" as const },
];
const binding = {
  version: PATHWAY_TFNSW_FRONTAGE_BINDING_VERSION,
  evidenceDigest: "a".repeat(64),
  status: "EVIDENCE_VERIFIED" as const,
  method: "SURVEYED_FRONTAGE_POINT" as const,
  verifiedAt: "2026-08-25T00:00:00.000Z",
  staleAt: "2027-08-25T00:00:00.000Z",
  protectedFrontagePoint: {
    latitude: -33.00000001,
    longitude: 151.00000001,
  },
};

const plan = createPathwayTfnswRoadEvidencePlan({
  serviceUrl,
  layers,
  frontageBinding: binding,
});
assert.equal(plan.privateRequests.length, 2);
assert.equal(plan.planDigest.length, 64);
for (const { request } of plan.privateRequests) {
  assert.equal(request.url.includes("151.00000001"), false);
  const body = new URLSearchParams(request.init.body);
  assert.equal(body.get("geometry"), "151.00000001,-33.00000001");
  assert.equal(body.get("returnCountOnly"), "true");
  assert.equal(body.get("returnGeometry"), "false");
}

const common = {
  plan,
  sourceUpdatedOn: "2026-07-17T00:57:00.000Z",
  sourceStaleAt: "2027-07-17T00:57:00.000Z",
  checkedAt: "2026-08-26T10:00:00.000Z",
};

const positive = finalizePathwayTfnswRoadEvidence({
  ...common,
  layerResponses: [
    { layerId: 0, adminClass: "STATE", payload: { count: 1 } },
    { layerId: 1, adminClass: "REGIONAL", payload: { count: 0 } },
  ],
});
assert.equal(positive.status, "EVIDENCE_VERIFIED");
assert.equal(positive.observation?.factKey, "ROAD_CLASSIFICATION");
assert.equal(positive.observation?.value, "CLASSIFIED_ROAD");
assert.equal(positive.observation?.sourceKind, "AUTHORITATIVE_SPATIAL");
assert.equal(positive.observation?.trustLevel, "EVIDENCE_VERIFIED");
assert.equal(positive.observation?.valueHash.length, 64);
assert.equal(positive.redactedSummary.packEligibilityUnlocked, false);
assert.equal(positive.redactedSummary.submissionSeeEligibilityUnlocked, false);
const serialized = JSON.stringify(positive);
assert.equal(serialized.includes("151.00000001"), false);
assert.equal(serialized.includes(binding.evidenceDigest), false);

const absent = finalizePathwayTfnswRoadEvidence({
  ...common,
  layerResponses: [
    { layerId: 0, adminClass: "STATE", payload: { count: 0 } },
    { layerId: 1, adminClass: "REGIONAL", payload: { count: 0 } },
  ],
});
assert.equal(absent.status, "MORE_EVIDENCE_REQUIRED");
assert.equal(absent.observation, null);
assert.equal(absent.redactedSummary.packEligibilityUnlocked, false);

assert.throws(
  () =>
    finalizePathwayTfnswRoadEvidence({
      ...common,
      layerResponses: [
        { layerId: 99, adminClass: "STATE", payload: { count: 1 } },
        { layerId: 1, adminClass: "REGIONAL", payload: { count: 0 } },
      ],
    }),
  /do not match the protected plan/,
);

assert.throws(
  () =>
    finalizePathwayTfnswRoadEvidence({
      ...common,
      checkedAt: "2028-08-26T10:00:00.000Z",
      layerResponses: [
        { layerId: 0, adminClass: "STATE", payload: { count: 1 } },
        { layerId: 1, adminClass: "REGIONAL", payload: { count: 0 } },
      ],
    }),
  /is not current/,
);

assert.throws(
  () =>
    createPathwayTfnswRoadEvidencePlan({
      serviceUrl,
      layers,
      frontageBinding: {
        ...binding,
        rawAddress: "must-not-be-accepted",
      } as typeof binding,
    }),
  /unsupported fields/,
);

console.log(
  JSON.stringify({
    contract: "item74h-tfnsw-road-evidence-bridge",
    passed: true,
    positiveIntersection: "EVIDENCE_VERIFIED",
    absence: "MORE_EVIDENCE_REQUIRED",
    frontageBindingRequired: true,
    coordinatesReturned: false,
    paidEligibilityUnlocked: false,
    productionCheckoutEnabled: false,
    productionMutationPerformed: false,
  }),
);
