import assert from "node:assert/strict";
import test from "node:test";

import {
  PATHWAY_CHECK_CONTRACT_VERSION,
  PATHWAY_CHECK_GRAPH_VERSION,
  assessPathwayCheck,
  type PathwayCheckCandidate,
} from "./pathway-check-acceptance";

const HASH = "a".repeat(64);

const syntheticPreview = (): PathwayCheckCandidate => ({
  contractVersion: PATHWAY_CHECK_CONTRACT_VERSION,
  commercialMode: "test",
  target: "pathway_preview",
  trustLevel: "GENERAL_GUIDANCE",
  generatedAt: "2026-08-24T00:00:00.000Z",
  site: {
    label: "Synthetic Byron RU2 orientation",
    confirmedSiteId: null,
    addressFingerprint: null,
    lgaCode: "BYRON",
    zoneCode: "RU2",
    lotAreaSqm: 10_000,
    spatialProvenance: {
      status: "unresolved",
      authoritative: false,
      serviceUrl: null,
      featureIdentifier: null,
      resolvedAt: null,
      limitations: ["Synthetic general-guidance fixture only."],
      fixture: true,
    },
  },
  proposal: {
    type: "shed_outbuilding",
    ancillaryUse: "unknown",
  },
  graph: {
    id: "synthetic-byron-ru2-shed",
    version: PATHWAY_CHECK_GRAPH_VERSION,
    contentHash: HASH,
  },
  sources: [
    {
      id: "synthetic-lep",
      type: "LEP",
      title: "Synthetic LEP fixture",
      officialUrl: "https://example.invalid/item74h/lep",
      clauseRef: "synthetic-lep-clause",
      contentHash: HASH,
      retrievedAt: "2026-08-23T00:00:00.000Z",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
      staleAt: null,
      authoritative: false,
      current: true,
      verificationStatus: "unverified",
      verifiedAt: null,
      fixture: true,
    },
    {
      id: "synthetic-dcp",
      type: "DCP",
      title: "Synthetic DCP fixture",
      officialUrl: "https://example.invalid/item74h/dcp",
      clauseRef: "synthetic-dcp-clause",
      contentHash: HASH,
      retrievedAt: "2026-08-23T00:00:00.000Z",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
      staleAt: null,
      authoritative: false,
      current: true,
      verificationStatus: "unverified",
      verifiedAt: null,
      fixture: true,
    },
    {
      id: "synthetic-spatial",
      type: "SPATIAL",
      title: "Synthetic spatial fixture",
      officialUrl: "https://example.invalid/item74h/spatial",
      clauseRef: null,
      contentHash: HASH,
      retrievedAt: "2026-08-23T00:00:00.000Z",
      effectiveFrom: null,
      effectiveTo: null,
      staleAt: null,
      authoritative: false,
      current: true,
      verificationStatus: "unverified",
      verifiedAt: null,
      fixture: true,
    },
  ],
  controls: [
    {
      id: "synthetic-max-area",
      kind: "MAX_AREA",
      label: "Synthetic maximum area control",
      comparator: "LTE",
      value: 1,
      unit: "m2",
      sourceId: "synthetic-dcp",
      status: "accepted",
      applicability: {
        lgaCode: "BYRON",
        zoneCodes: ["RU2"],
        proposalTypes: ["shed_outbuilding"],
        minLotAreaSqm: 0,
        maxLotAreaSqm: null,
      },
    },
  ],
  gates: [
    {
      id: "gate-00",
      order: 0,
      title: "Confirm site evidence",
      question: "Is authoritative site evidence available?",
      predicateState: "unknown",
      outcome: "MORE_EVIDENCE_REQUIRED",
      stopCondition: false,
      reasoning:
        "The synthetic preview identifies the evidence required but cannot decide the site-specific result.",
      sourceIds: ["synthetic-spatial"],
      controlIds: [],
    },
    {
      id: "gate-01",
      order: 1,
      title: "Classify ancillary use",
      question: "What established use is the structure ancillary to?",
      predicateState: "unknown",
      outcome: "MORE_EVIDENCE_REQUIRED",
      stopCondition: false,
      reasoning:
        "The ancillary use must be confirmed before a site-specific pathway can be selected.",
      sourceIds: ["synthetic-lep", "synthetic-dcp"],
      controlIds: [],
    },
    {
      id: "gate-02",
      order: 2,
      title: "Apply numeric controls",
      question: "Which accepted control band applies to the proposal?",
      predicateState: "unknown",
      outcome: "MORE_EVIDENCE_REQUIRED",
      stopCondition: false,
      reasoning:
        "The preview may describe the control shape but cannot represent synthetic values as accepted evidence.",
      sourceIds: ["synthetic-dcp"],
      controlIds: ["synthetic-max-area"],
    },
  ],
});

test("accepts a clearly labelled synthetic general-guidance preview", () => {
  const result = assessPathwayCheck(syntheticPreview());
  assert.equal(result.ready, true);
  assert.equal(result.status, "ready");
  assert.equal(result.evidence.fixtureSources, 3);
  assert.deepEqual(result.evidence.outcomes, ["MORE_EVIDENCE_REQUIRED"]);
});

test("blocks Production commercial mode", () => {
  const candidate = syntheticPreview();
  candidate.commercialMode = "production";
  const result = assessPathwayCheck(candidate);
  assert.equal(result.ready, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "unsafe_commercial_mode"),
  );
});

test("blocks fixture evidence from the A$49 Planning Controls Pack", () => {
  const candidate = syntheticPreview();
  candidate.target = "planning_controls_pack";
  candidate.trustLevel = "EVIDENCE_VERIFIED";
  const result = assessPathwayCheck(candidate);
  assert.equal(result.ready, false);
  assert.ok(
    result.issues.some(
      (issue) => issue.code === "fixture_evidence_for_paid_output",
    ),
  );
  assert.ok(
    result.issues.some((issue) => issue.code === "insufficient_trust"),
  );
});

test("blocks stale evidence", () => {
  const candidate = syntheticPreview();
  candidate.sources[1].staleAt = "2026-08-24T00:00:00.000Z";
  const result = assessPathwayCheck(candidate);
  assert.equal(result.ready, false);
  assert.ok(result.issues.some((issue) => issue.code === "stale_source"));
});

test("unknown or conflicting predicates require more evidence", () => {
  const candidate = syntheticPreview();
  candidate.gates[0].outcome = "PROCEED";
  const result = assessPathwayCheck(candidate);
  assert.equal(result.ready, false);
  assert.ok(
    result.issues.some(
      (issue) => issue.code === "inconsistent_gate_outcome",
    ),
  );
});

test("blocks overlapping control bands of the same kind", () => {
  const candidate = syntheticPreview();
  candidate.controls.push({
    ...candidate.controls[0],
    id: "synthetic-max-area-overlap",
    applicability: {
      ...candidate.controls[0].applicability,
      minLotAreaSqm: 5_000,
    },
  });
  const result = assessPathwayCheck(candidate);
  assert.equal(result.ready, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "overlapping_control_band"),
  );
});

test("blocks an unsupported first-slice zone", () => {
  const candidate = syntheticPreview();
  candidate.site.zoneCode = "SP3";
  const result = assessPathwayCheck(candidate);
  assert.equal(result.ready, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "unsupported_first_slice"),
  );
});
