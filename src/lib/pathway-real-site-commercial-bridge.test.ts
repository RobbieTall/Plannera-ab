import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { ByronRoadClassificationEvidence } from "./pathway-byron-rural-setbacks";
import { evaluatePaidArtefactBindingPolicy } from "./pathway-paid-artefact-policy";
import { evaluatePathwayCommercialBindingPersistence } from "./pathway-persisted-commercial-binding";
import {
  evaluatePathwayRealSiteCommercialBridge,
  formatPathwaySideRearSetbacks,
} from "./pathway-real-site-commercial-bridge";
import {
  assessPathwayRealSiteEvidence,
  PATHWAY_REAL_SITE_EVIDENCE_VERSION,
  type PathwayRealSiteEvidencePackage,
} from "./pathway-real-site-evidence";
import {
  createPathwaySiteEvidenceManifest,
  hashPathwaySiteEvidenceValue,
  PATHWAY_SITE_EVIDENCE_MANIFEST_VERSION,
  type PathwaySiteEvidenceManifest,
  type PathwaySiteEvidenceObservation,
  type PathwaySiteEvidenceSourceKind,
  type PathwaySiteEvidenceTrustLevel,
  type PathwaySiteEvidenceValue,
  type PathwaySiteFactKey,
} from "./pathway-site-evidence";

const NOW = new Date("2026-08-25T12:00:00.000Z");
const ROAD_URL =
  "https://data.nsw.gov.au/data/dataset/2-nsw-roads-network-categorisation";
const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const hash = (character: string) => character.repeat(64);

const evidencePackage = (): PathwayRealSiteEvidencePackage => {
  const roadReferenceHash = sha256(ROAD_URL);
  return {
    version: PATHWAY_REAL_SITE_EVIDENCE_VERSION,
    projectRef: "project_opaque_74h",
    documents: [
      {
        role: "ROAD_CLASSIFICATION",
        uploadRef: "upload_road_74h",
        contentHash: hash("1"),
        evidenceStatus: "READY",
        indexingStatus: "READY",
        authority: "TRANSPORT_FOR_NSW",
        sourceVersion: "Current NSW road categorisation snapshot",
        sourceReferenceHash: roadReferenceHash,
        issuedAt: "2026-08-01T00:00:00.000Z",
        retrievedAt: "2026-08-24T00:00:00.000Z",
        staleAt: "2026-11-24T00:00:00.000Z",
        basisContentHash: null,
        verification: {
          status: "EVIDENCE_VERIFIED",
          reviewerRef: "reviewer_opaque_01",
          reviewedAt: "2026-08-24T01:00:00.000Z",
          reviewNotesHash: hash("4"),
        },
      },
      {
        role: "CADASTRAL_SURVEY",
        uploadRef: "upload_survey_74h",
        contentHash: hash("2"),
        evidenceStatus: "IMAGE_ONLY",
        indexingStatus: "NOT_APPLICABLE",
        authority: "REGISTERED_SURVEYOR",
        sourceVersion: "Current signed survey",
        sourceReferenceHash: hash("5"),
        issuedAt: "2026-07-15T00:00:00.000Z",
        retrievedAt: "2026-08-24T00:00:00.000Z",
        staleAt: "2027-02-24T00:00:00.000Z",
        basisContentHash: null,
        verification: {
          status: "EVIDENCE_VERIFIED",
          reviewerRef: "reviewer_opaque_01",
          reviewedAt: "2026-08-24T01:05:00.000Z",
          reviewNotesHash: hash("6"),
        },
      },
      {
        role: "PROPOSED_SHED_LAYOUT",
        uploadRef: "upload_layout_74h",
        contentHash: hash("3"),
        evidenceStatus: "IMAGE_ONLY",
        indexingStatus: "NOT_APPLICABLE",
        authority: "APPLICANT",
        sourceVersion: "Marked-up proposal bound to current survey",
        sourceReferenceHash: hash("7"),
        issuedAt: "2026-08-20T00:00:00.000Z",
        retrievedAt: "2026-08-24T00:00:00.000Z",
        staleAt: "2027-02-24T00:00:00.000Z",
        basisContentHash: hash("2"),
        verification: {
          status: "EVIDENCE_VERIFIED",
          reviewerRef: "reviewer_opaque_01",
          reviewedAt: "2026-08-24T01:10:00.000Z",
          reviewNotesHash: hash("8"),
        },
      },
    ],
    roadClassification: {
      category: "CLASSIFIED_ROAD",
      sourceRole: "ROAD_CLASSIFICATION",
      sourceReferenceHash: roadReferenceHash,
      matchMethod: "POSITIVE_TFNSW_STATE_OR_REGIONAL_MATCH",
    },
    measurements: [
      {
        key: "SHED_FOOTPRINT_SQM",
        value: 120,
        unit: "sqm",
        sourceRole: "PROPOSED_SHED_LAYOUT",
        pageReference: "sheet-A1",
        method: "PLAN_DIMENSION",
      },
      {
        key: "SHED_HEIGHT_M",
        value: 4.8,
        unit: "m",
        sourceRole: "PROPOSED_SHED_LAYOUT",
        pageReference: "sheet-A2",
        method: "DOCUMENT_STATED",
      },
      {
        key: "ROAD_SETBACK_M",
        value: 62,
        unit: "m",
        sourceRole: "PROPOSED_SHED_LAYOUT",
        pageReference: "sheet-A1",
        method: "SURVEY_MEASUREMENT",
      },
      {
        key: "SIDE_SETBACK_M",
        value: 18,
        unit: "m",
        sourceRole: "PROPOSED_SHED_LAYOUT",
        pageReference: "sheet-A1",
        method: "SURVEY_MEASUREMENT",
      },
      {
        key: "REAR_SETBACK_M",
        value: 24,
        unit: "m",
        sourceRole: "PROPOSED_SHED_LAYOUT",
        pageReference: "sheet-A1",
        method: "SURVEY_MEASUREMENT",
      },
    ],
  };
};

const roadEvidence = (): ByronRoadClassificationEvidence => ({
  category: "CLASSIFIED_ROAD",
  basis: "TFNSW_POSITIVE_STATE_OR_REGIONAL_MATCH",
  status: "CURRENT",
  sourceUrl: ROAD_URL,
  sourcePublishedOn: "2026-08-01T00:00:00.000Z",
  checkedAt: "2026-08-24T00:00:00.000Z",
});

const observation = ({
  factKey,
  value,
  sourceKind,
  trustLevel,
  suffix,
}: {
  factKey: PathwaySiteFactKey;
  value: PathwaySiteEvidenceValue;
  sourceKind: PathwaySiteEvidenceSourceKind;
  trustLevel: PathwaySiteEvidenceTrustLevel;
  suffix: string;
}): PathwaySiteEvidenceObservation => ({
  factKey,
  value,
  valueHash: hashPathwaySiteEvidenceValue(value),
  sourceKind,
  trustLevel,
  sourceUrl:
    sourceKind === "ADDRESS_RESOLVER" ||
    sourceKind === "AUTHORITATIVE_SPATIAL" ||
    sourceKind === "AUTHORITATIVE_INSTRUMENT"
      ? "https://evidence.example/" + suffix
      : undefined,
  sourceReference: "opaque-" + suffix,
  retrievedAt: "2026-08-24T00:00:00.000Z",
  staleAt: "2026-11-24T00:00:00.000Z",
});

const manifest = (
  uploadSetDigest: string,
  overrides: Partial<Record<PathwaySiteFactKey, PathwaySiteEvidenceValue>> = {},
): PathwaySiteEvidenceManifest => {
  const value = (
    key: PathwaySiteFactKey,
    fallback: PathwaySiteEvidenceValue,
  ) => overrides[key] ?? fallback;

  const observations: PathwaySiteEvidenceObservation[] = [
    observation({ factKey: "ADDRESS_CONFIRMED", value: true, sourceKind: "ADDRESS_RESOLVER", trustLevel: "SITE_CONFIRMED", suffix: "address" }),
    observation({ factKey: "ZONE_CONFIRMED", value: "RU2", sourceKind: "AUTHORITATIVE_SPATIAL", trustLevel: "EVIDENCE_VERIFIED", suffix: "zone" }),
    observation({ factKey: "INSTRUMENT_CURRENT", value: true, sourceKind: "AUTHORITATIVE_INSTRUMENT", trustLevel: "EVIDENCE_VERIFIED", suffix: "instrument" }),
    observation({ factKey: "AGRICULTURAL_ANCILLARY_USE", value: true, sourceKind: "USER_ATTESTATION", trustLevel: "SITE_CONFIRMED", suffix: "ancillary-user" }),
    observation({ factKey: "AGRICULTURAL_ANCILLARY_USE", value: true, sourceKind: "SITE_PLAN", trustLevel: "EVIDENCE_VERIFIED", suffix: "ancillary-plan" }),
    observation({ factKey: "NON_HABITABLE_DESIGN", value: true, sourceKind: "SITE_PLAN", trustLevel: "EVIDENCE_VERIFIED", suffix: "non-habitable" }),
    observation({ factKey: "PROPOSAL_FOOTPRINT_SQM", value: value("PROPOSAL_FOOTPRINT_SQM", 120), sourceKind: "SITE_PLAN", trustLevel: "EVIDENCE_VERIFIED", suffix: "footprint" }),
    observation({ factKey: "PROPOSAL_HEIGHT_M", value: value("PROPOSAL_HEIGHT_M", 4.8), sourceKind: "SITE_PLAN", trustLevel: "EVIDENCE_VERIFIED", suffix: "height" }),
    observation({ factKey: "LANDHOLDING_AREA_SQM", value: 40000, sourceKind: "TITLE_OR_SURVEY", trustLevel: "EVIDENCE_VERIFIED", suffix: "landholding" }),
    observation({ factKey: "EXISTING_FARM_BUILDING_AREA_SQM", value: 20, sourceKind: "SITE_PLAN", trustLevel: "EVIDENCE_VERIFIED", suffix: "existing-plan" }),
    observation({ factKey: "EXISTING_FARM_BUILDING_AREA_SQM", value: 20, sourceKind: "USER_ATTESTATION", trustLevel: "SITE_CONFIRMED", suffix: "existing-user" }),
    observation({ factKey: "ROAD_CLASSIFICATION", value: value("ROAD_CLASSIFICATION", "CLASSIFIED_ROAD"), sourceKind: "AUTHORITATIVE_SPATIAL", trustLevel: "EVIDENCE_VERIFIED", suffix: "road" }),
    observation({ factKey: "ROAD_BOUNDARY_SETBACK_M", value: value("ROAD_BOUNDARY_SETBACK_M", 62), sourceKind: "SITE_PLAN", trustLevel: "EVIDENCE_VERIFIED", suffix: "road-setback" }),
    observation({ factKey: "SIDE_REAR_SETBACK_M", value: value("SIDE_REAR_SETBACK_M", formatPathwaySideRearSetbacks({ sideSetbackM: 18, rearSetbackM: 24 })), sourceKind: "SITE_PLAN", trustLevel: "EVIDENCE_VERIFIED", suffix: "side-rear" }),
    observation({ factKey: "WATERBODY_SETBACK_M", value: 45, sourceKind: "AUTHORITATIVE_SPATIAL", trustLevel: "EVIDENCE_VERIFIED", suffix: "water-spatial" }),
    observation({ factKey: "WATERBODY_SETBACK_M", value: 45, sourceKind: "SITE_PLAN", trustLevel: "EVIDENCE_VERIFIED", suffix: "water-plan" }),
    observation({ factKey: "HERITAGE_STATUS", value: "NO_PRIMARY_LAYER_INTERSECTION", sourceKind: "AUTHORITATIVE_SPATIAL", trustLevel: "EVIDENCE_VERIFIED", suffix: "heritage" }),
    observation({ factKey: "ENVIRONMENTAL_SENSITIVITY", value: "REVIEWED", sourceKind: "AUTHORITATIVE_SPATIAL", trustLevel: "EVIDENCE_VERIFIED", suffix: "environment" }),
    observation({ factKey: "MAPPED_CONSTRAINTS", value: ["BUSHFIRE_REVIEWED", "FLOOD_REVIEWED"], sourceKind: "AUTHORITATIVE_SPATIAL", trustLevel: "EVIDENCE_VERIFIED", suffix: "constraints" }),
    observation({ factKey: "RIDGELINE_VISUAL_IMPACT", value: "LOW", sourceKind: "AUTHORITATIVE_SPATIAL", trustLevel: "EVIDENCE_VERIFIED", suffix: "ridgeline-spatial" }),
    observation({ factKey: "RIDGELINE_VISUAL_IMPACT", value: "LOW", sourceKind: "SITE_PLAN", trustLevel: "EVIDENCE_VERIFIED", suffix: "ridgeline-plan" }),
    observation({ factKey: "EVIDENCE_UPLOAD_SET", value: uploadSetDigest, sourceKind: "WORKSPACE_UPLOAD", trustLevel: "EVIDENCE_VERIFIED", suffix: "uploads" }),
    observation({ factKey: "OPERATOR_REVIEW", value: true, sourceKind: "OPERATOR_REVIEW", trustLevel: "OPERATOR_APPROVED", suffix: "operator" }),
  ];

  return createPathwaySiteEvidenceManifest({
    manifestVersion: PATHWAY_SITE_EVIDENCE_MANIFEST_VERSION,
    lgaCode: "BYRON",
    zoneCode: "RU2",
    proposalType: "SHED_OUTBUILDING",
    assessedAt: NOW.toISOString(),
    observations,
  });
};

const acceptedInput = () => {
  const packageInput = evidencePackage();
  const evidenceDigest = assessDigest(packageInput);
  return {
    manifest: manifest(evidenceDigest),
    evidencePackage: packageInput,
    roadEvidence: roadEvidence(),
    asOf: NOW,
  };
};

const assessDigest = (packageInput: PathwayRealSiteEvidencePackage) => {
  const result = assessPathwayRealSiteEvidence(packageInput, NOW);
  if (!result.confirmedEvidence) {
    throw new Error("Expected a confirmed real-site evidence fixture.");
  }
  return result.confirmedEvidence.siteEvidenceDigest;
};

describe("Item 74H real-site commercial bridge", () => {
  it("binds reviewed site evidence to one paid exact scope while Production stays off", () => {
    const result = evaluatePathwayRealSiteCommercialBridge(acceptedInput());

    expect(result).toMatchObject({
      freePathwayCheckEligible: true,
      planningControlsPackEligible: true,
      submissionSeeEligible: true,
      blockers: [],
      productionCheckoutEnabled: false,
    });
    expect(result.exactScope).toMatchObject({
      roadCategory: "CLASSIFIED_ROAD",
      proposedRoadSetbackMetres: 62,
      minimumRoadSetbackMetres: 55,
      outcome: "PROCEED",
    });
    expect(result.exactScope?.siteEvidenceDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(result.exactScope?.siteEvidenceDigest).not.toBe(
      acceptedInput().manifest.siteEvidenceDigest,
    );
    expect(result.redactedEvidenceSummary.containsRawSiteIdentifiers).toBe(false);

    const binding = result.commercialBinding;
    const exactScope = binding.exactScope!;
    expect(
      evaluatePathwayCommercialBindingPersistence({
        result: { decision: "PROCEED" },
        binding,
        scopeKey: exactScope.scopeDigest,
        evidenceDigest: exactScope.siteEvidenceDigest,
        decision: "PROCEED",
      }).allowed,
    ).toBe(true);

    const currentAssessment = {
      decision: "PROCEED",
      trustLevel: "EVIDENCE_VERIFIED",
      isCurrent: true,
      evidenceCurrent: true,
      controlsCurrent: true,
    };
    expect(
      evaluatePaidArtefactBindingPolicy({
        commercialStage: "PLANNING_CONTROLS_PACK",
        scopeKey: exactScope.scopeDigest,
        evidenceDigest: exactScope.siteEvidenceDigest,
        commercialBinding: binding,
        assessment: currentAssessment,
      }).allowed,
    ).toBe(true);
    expect(
      evaluatePaidArtefactBindingPolicy({
        commercialStage: "SUBMISSION_SEE",
        scopeKey: exactScope.scopeDigest,
        evidenceDigest: exactScope.siteEvidenceDigest,
        commercialBinding: binding,
        assessment: {
          ...currentAssessment,
          trustLevel: "OPERATOR_APPROVED",
        },
      }).allowed,
    ).toBe(true);
  });

  it("blocks the pack when the manifest measurements differ from the reviewed plan", () => {
    const input = acceptedInput();
    input.manifest = manifest(
      assessDigest(input.evidencePackage),
      { ROAD_BOUNDARY_SETBACK_M: 61 },
    );

    const result = evaluatePathwayRealSiteCommercialBridge(input);

    expect(result.planningControlsPackEligible).toBe(false);
    expect(result.submissionSeeEligible).toBe(false);
    expect(result.exactScope).toBeNull();
    expect(result.blockers).toContain("REAL_SITE_MANIFEST_SCOPE_MISMATCH");
  });

  it("blocks the pack when the authoritative road source is not the reviewed source", () => {
    const input = acceptedInput();
    input.roadEvidence = {
      ...input.roadEvidence!,
      sourceUrl: "https://example.com/a-different-road-source",
    };

    const result = evaluatePathwayRealSiteCommercialBridge(input);

    expect(result.planningControlsPackEligible).toBe(false);
    expect(result.blockers).toContain("REAL_SITE_ROAD_SOURCE_MISMATCH");
  });

  it("keeps the pack eligible but blocks the SEE when the upload-set digest differs", () => {
    const input = acceptedInput();
    input.manifest = manifest(hash("a"));

    const result = evaluatePathwayRealSiteCommercialBridge(input);

    expect(result.planningControlsPackEligible).toBe(true);
    expect(result.submissionSeeEligible).toBe(false);
    expect(result.exactScope).not.toBeNull();
    expect(result.blockers).toContain("REAL_SITE_UPLOAD_SET_MISMATCH");
  });

  it("blocks both paid stages when the private evidence package becomes stale", () => {
    const input = acceptedInput();
    input.evidencePackage.documents[1] = {
      ...input.evidencePackage.documents[1],
      staleAt: "2026-08-25T11:00:00.000Z",
    };

    const result = evaluatePathwayRealSiteCommercialBridge(input);

    expect(result.planningControlsPackEligible).toBe(false);
    expect(result.submissionSeeEligible).toBe(false);
    expect(result.exactScope).toBeNull();
    expect(result.blockers).toContain("REAL_SITE_EVIDENCE_REQUIRED");
  });
});
