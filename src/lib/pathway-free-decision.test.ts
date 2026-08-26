import assert from "node:assert/strict";
import test from "node:test";

import {
  PATHWAY_CHECK_CONTRACT_VERSION,
  PATHWAY_CHECK_GRAPH_VERSION,
  type PathwayCheckCandidate,
} from "./pathway-check-acceptance";
import { evaluateFreeByronShedPathway } from "./pathway-free-decision";
import type { PathwayTfnswRoadEvidenceBridgeResult } from "./pathway-tfnsw-road-evidence-bridge";

const HASH = "a".repeat(64);
const generatedAt = "2026-08-26T10:00:00.000Z";

const candidate = (): PathwayCheckCandidate => ({
  contractVersion: PATHWAY_CHECK_CONTRACT_VERSION,
  commercialMode: "preview",
  target: "pathway_preview",
  trustLevel: "GENERAL_GUIDANCE",
  generatedAt,
  site: {
    label: "Byron RU2 orientation",
    confirmedSiteId: null,
    addressFingerprint: null,
    lgaCode: "BYRON",
    zoneCode: "RU2",
    lotAreaSqm: 25_000,
    spatialProvenance: {
      status: "unresolved",
      authoritative: false,
      serviceUrl: null,
      featureIdentifier: null,
      resolvedAt: null,
      limitations: ["Site-specific evidence is not complete."],
      fixture: true,
    },
  },
  proposal: {
    type: "shed_outbuilding",
    ancillaryUse: "agriculture",
  },
  graph: {
    id: "byron-ru2-shed-orientation",
    version: PATHWAY_CHECK_GRAPH_VERSION,
    contentHash: HASH,
  },
  sources: ([
    ["lep", "LEP", "clause"],
    ["dcp", "DCP", "chapter"],
    ["spatial", "SPATIAL", null],
  ] as const).map(([id, type, clauseRef]) => ({
    id,
    type,
    title: "Synthetic " + type + " orientation source",
    officialUrl: "https://example.invalid/" + id,
    clauseRef,
    contentHash: HASH,
    retrievedAt: "2026-08-25T00:00:00.000Z",
    effectiveFrom: null,
    effectiveTo: null,
    staleAt: null,
    authoritative: false,
    current: true,
    verificationStatus: "unverified",
    verifiedAt: null,
    fixture: true,
  })),
  controls: [],
  gates: [
    {
      id: "gate-00",
      order: 0,
      title: "Confirm remaining evidence",
      question: "Is the remaining site and proposal evidence verified?",
      predicateState: "unknown",
      outcome: "MORE_EVIDENCE_REQUIRED",
      stopCondition: false,
      reasoning:
        "The free orientation can explain the pathway while the remaining site and proposal evidence is unresolved.",
      sourceIds: ["lep", "dcp", "spatial"],
      controlIds: [],
    },
  ],
});

const proposalAttestation = {
  proposalPurpose: "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE" as const,
  landAreaHectares: 3.2,
  proposedBuildingFootprintSquareMetres: 96,
  existingFarmBuildingFootprintSquareMetres: 0,
  proposedBuildingHeightMetres: 4.2,
  roadSetbackMetres: 72,
  sideSetbackMetres: 24,
  otherBoundarySetbackMetres: 35,
  roadCategory: "UNRESOLVED" as const,
};

const redactedSummary = {
  frontageBound: false,
  matchingFeatureCount: 0,
  matchedAdminClasses: [],
  coordinatesReturned: false as const,
  geometryReturned: false as const,
  rawResponsesReturned: false as const,
  packEligibilityUnlocked: false as const,
  submissionSeeEligibilityUnlocked: false as const,
  productionCheckoutEnabled: false as const,
};

const unresolvedRoad: PathwayTfnswRoadEvidenceBridgeResult = {
  status: "MORE_EVIDENCE_REQUIRED",
  observation: null,
  reasons: ["No positive frontage intersection."],
  redactedSummary,
};

test("renders a safe free result from the supplied shed estimates", () => {
  const result = evaluateFreeByronShedPathway({
    candidate: candidate(),
    proposalAttestation,
    roadEvidence: unresolvedRoad,
  });
  assert.equal(result.status, "ready");
  assert.equal(result.freeOutputEligible, true);
  assert.equal(result.decision, "MORE_EVIDENCE_REQUIRED");
  assert.equal(result.proposal.trust, "USER_ATTESTED");
  assert.equal(result.proposal.landAreaSquareMetres, 25_000);
  assert.equal(
    result.proposal.aggregateFarmBuildingFootprintSquareMetres,
    80,
  );
  assert.equal(result.proposal.aggregateSiteCoveragePercent, 0.32);
  assert.equal(result.proposal.roadDistanceRobustToUnresolvedCategory, true);
  assert.equal(result.planningControlsPackEligible, false);
  assert.equal(result.submissionSeeEligible, false);
  assert.equal(
    result.gates.find((gate) => gate.id === "ROAD_CLASSIFICATION")?.outcome,
    "MORE_EVIDENCE_REQUIRED",
  );
});

test("verified frontage evidence clears only the road gate", () => {
  const verifiedRoad: PathwayTfnswRoadEvidenceBridgeResult = {
    status: "EVIDENCE_VERIFIED",
    observation: {
      factKey: "ROAD_CLASSIFICATION",
      value: "CLASSIFIED_ROAD",
      valueHash: HASH,
      sourceKind: "AUTHORITATIVE_SPATIAL",
      trustLevel: "EVIDENCE_VERIFIED",
      sourceUrl:
        "https://data.nsw.gov.au/data/dataset/2-nsw-roads-network-categorisation",
      sourceReference: "tfnsw-spatial:" + HASH,
      retrievedAt: generatedAt,
      effectiveFrom: "2026-07-17T00:57:00.000Z",
      staleAt: "2027-07-17T00:57:00.000Z",
    },
    reasons: [],
    redactedSummary: {
      ...redactedSummary,
      frontageBound: true,
      matchingFeatureCount: 1,
      matchedAdminClasses: ["STATE"],
    },
  };
  const result = evaluateFreeByronShedPathway({
    candidate: candidate(),
    proposalAttestation,
    roadEvidence: verifiedRoad,
  });
  assert.equal(
    result.gates.find((gate) => gate.id === "ROAD_CLASSIFICATION")?.outcome,
    "PROCEED",
  );
  assert.equal(
    result.gates.find((gate) => gate.id === "PROPOSAL_MEASUREMENTS")?.outcome,
    "MORE_EVIDENCE_REQUIRED",
  );
  assert.equal(result.decision, "MORE_EVIDENCE_REQUIRED");
  assert.equal(result.planningControlsPackEligible, false);
  assert.equal(result.submissionSeeEligible, false);
});

test("rejects an inconsistent verified road result", () => {
  assert.throws(
    () =>
      evaluateFreeByronShedPathway({
        candidate: candidate(),
        proposalAttestation,
        roadEvidence: {
          ...unresolvedRoad,
          status: "EVIDENCE_VERIFIED",
        },
      }),
    /inconsistent with the shared evidence graph/,
  );
});

test("does not render a paid target through the free adapter", () => {
  const paidCandidate = candidate();
  paidCandidate.target = "planning_controls_pack";
  const result = evaluateFreeByronShedPathway({
    candidate: paidCandidate,
    proposalAttestation,
    roadEvidence: unresolvedRoad,
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.freeOutputEligible, false);
  assert.equal(result.planningControlsPackEligible, false);
});

test("returns no raw address, coordinate or spatial response", () => {
  const result = evaluateFreeByronShedPathway({
    candidate: candidate(),
    proposalAttestation,
    roadEvidence: unresolvedRoad,
  });
  assert.deepEqual(result.privacy, {
    rawAddressReturned: false,
    coordinatesReturned: false,
    rawSpatialResponsesReturned: false,
  });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("latitude"), false);
  assert.equal(serialized.includes("longitude"), false);
  assert.equal(serialized.includes("rawAddress"), true);
});
