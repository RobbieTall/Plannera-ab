import { describe, expect, it } from "vitest";

import {
  PATHWAY_CUSTOMER_RESULT_VERSION,
  toPathwayCustomerResult,
  unavailablePathwayCustomerResult,
  type PathwayCustomerResultInput,
} from "./pathway-customer-result";

const asOf = new Date("2026-08-26T12:00:00.000Z");

const input = (): PathwayCustomerResultInput & Record<string, unknown> => ({
  decision: "MORE_EVIDENCE_REQUIRED",
  trustLevel: "SITE_CONFIRMED",
  isCurrent: true,
  assessedAt: new Date("2026-08-26T10:00:00.000Z"),
  staleAt: null,
  result: { summary: "Free result only" },
  pathwayDefinition: {
    versionKey: "byron-ru2-shed-v1",
    status: "ACTIVE",
  },
  spatialProvenance: {
    authority: "NSW Spatial Services",
    datasetName: "Planning layer",
    sourceUrl: "https://example.nsw.gov.au/spatial",
    sourceVersion: "2026-08",
    retrievedAt: new Date("2026-08-26T09:00:00.000Z"),
    effectiveAt: new Date("2026-08-01T00:00:00.000Z"),
    trustLevel: "EVIDENCE_VERIFIED",
    staleAt: new Date("2026-09-26T00:00:00.000Z"),
  },
  evidenceSnapshots: [
    {
      evidenceKind: "LEP",
      authority: "NSW legislation",
      sourceUrl: "https://legislation.nsw.gov.au/lep",
      sourceVersion: "2025-12",
      retrievedAt: new Date("2026-08-26T09:00:00.000Z"),
      effectiveFrom: new Date("2025-12-01T00:00:00.000Z"),
      staleAt: new Date("2026-09-26T00:00:00.000Z"),
      isCurrentAtAssessment: true,
    },
    {
      evidenceKind: "DCP",
      authority: "Byron Shire Council",
      sourceUrl: "https://www.byron.nsw.gov.au/dcp",
      sourceVersion: "D2",
      retrievedAt: new Date("2026-08-26T09:00:00.000Z"),
      effectiveFrom: new Date("2024-01-01T00:00:00.000Z"),
      staleAt: new Date("2026-09-26T00:00:00.000Z"),
      isCurrentAtAssessment: true,
    },
  ],
  controlSnapshots: [
    {
      label: "Road setback",
      operator: "GTE",
      numericValue: 55,
      lowerBound: null,
      upperBound: null,
      textValue: null,
      unit: "m",
      sourceReference: "Byron DCP 2014, Chapter D2",
      isCurrentAtAssessment: true,
      staleAt: new Date("2026-09-26T00:00:00.000Z"),
    },
  ],
  proposalAttestation: {
    trust: "USER_ATTESTED",
    decision: "MORE_EVIDENCE_REQUIRED",
    paidArtefactsEligible: false,
    input: {
      proposalPurpose:
        "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE",
      landAreaHectares: 2.5,
      proposedBuildingFootprintSquareMetres: 80,
      existingFarmBuildingFootprintSquareMetres: 0,
      proposedBuildingHeightMetres: 3.5,
      roadSetbackMetres: 100,
      sideSetbackMetres: 10,
      otherBoundarySetbackMetres: 50,
      roadCategory: "UNRESOLVED",
    },
  },
  gateSnapshots: [
    {
      sequence: 1,
      question: "Are proposal measurements evidence verified?",
      outcome: "MORE_EVIDENCE_REQUIRED",
      reason: "The supplied dimensions remain user-attested.",
    },
    {
      sequence: 0,
      question: "Is the address and RU2 zone confirmed?",
      outcome: "PROCEED",
      reason: "Authoritative address and zone evidence is current.",
    },
  ],
  rawAddress: "10 Private Road",
  addressFingerprint: "secret-fingerprint",
  latitude: -28.6,
  longitude: 153.6,
  parcelId: "private-parcel",
  rawSpatialPayload: { geometry: "private" },
  evidenceDigest: "private-digest",
});

describe("Item 74H customer pathway result", () => {
  it("projects a deterministic result without returning private site data", () => {
    const result = toPathwayCustomerResult(input(), asOf);
    expect(result).toMatchObject({
      version: PATHWAY_CUSTOMER_RESULT_VERSION,
      status: "available",
      decision: "MORE_EVIDENCE_REQUIRED",
      current: true,
      commercial: {
        freePathwayCheckAvailable: true,
        planningControlsPackEligible: false,
        submissionSeeEligible: false,
        productionCheckoutEnabled: false,
      },
      proposal: {
        trust: "USER_ATTESTED",
        evidenceState: "MORE_EVIDENCE_REQUIRED",
        landAreaHectares: 2.5,
        proposedBuildingFootprintSquareMetres: 80,
        existingFarmBuildingFootprintSquareMetres: 0,
        proposedBuildingHeightMetres: 3.5,
        roadSetbackMetres: 100,
        sideSetbackMetres: 10,
        otherBoundarySetbackMetres: 50,
        roadCategory: "UNRESOLVED",
        paidEligibilityUnlocked: false,
      },
      privacy: {
        rawAddressReturned: false,
        coordinatesReturned: false,
        rawSpatialPayloadReturned: false,
      },
    });
    if (result.status !== "available") throw new Error("Expected result");
    expect(result.gates.map((gate) => gate.order)).toEqual([0, 1]);
    expect(result.sources.map((source) => source.kind)).toEqual([
      "LEP",
      "DCP",
      "SPATIAL",
    ]);
    const serialized = JSON.stringify(result);
    for (const secret of [
      "10 Private Road",
      "secret-fingerprint",
      "-28.6",
      "153.6",
      "private-parcel",
      "private-digest",
      "geometry",
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("rejects an attestation with any unsupported field", () => {
    const unsafe = input();
    unsafe.proposalAttestation = {
      ...unsafe.proposalAttestation!,
      input: {
        ...(unsafe.proposalAttestation!.input as Record<string, unknown>),
        privateSurveyNote: "must not render",
      },
    };
    const result = toPathwayCustomerResult(unsafe, asOf);
    expect(result).toMatchObject({ status: "available", proposal: null });
    expect(JSON.stringify(result)).not.toContain("privateSurveyNote");
  });

  it("marks stale evidence as non-current and keeps paid products locked", () => {
    const stale = input();
    stale.evidenceSnapshots[0].staleAt = new Date(
      "2026-08-26T11:00:00.000Z",
    );
    const result = toPathwayCustomerResult(stale, asOf);
    expect(result).toMatchObject({
      status: "available",
      current: false,
      commercial: {
        planningControlsPackEligible: false,
        submissionSeeEligible: false,
        productionCheckoutEnabled: false,
      },
    });
  });

  it("returns an explicit fail-closed response outside Preview", () => {
    expect(unavailablePathwayCustomerResult("PREVIEW_ONLY")).toEqual({
      version: PATHWAY_CUSTOMER_RESULT_VERSION,
      status: "not_available",
      decision: "MORE_EVIDENCE_REQUIRED",
      reason: "PREVIEW_ONLY",
      message:
        "The protected Item 74H Pathway Check is available in Preview only.",
      commercial: {
        freePathwayCheckAvailable: false,
        planningControlsPackEligible: false,
        submissionSeeEligible: false,
        productionCheckoutEnabled: false,
      },
    });
  });
});
