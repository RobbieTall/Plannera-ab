import { describe, expect, it } from "vitest";

import {
  assessPathwayRealSiteEvidence,
  PATHWAY_REAL_SITE_EVIDENCE_VERSION,
  type PathwayRealSiteEvidencePackage,
} from "./pathway-real-site-evidence";

const HASH = {
  road: "1".repeat(64),
  survey: "2".repeat(64),
  layout: "3".repeat(64),
  sourceRoad: "4".repeat(64),
  sourceSurvey: "5".repeat(64),
  sourceLayout: "6".repeat(64),
  reviewRoad: "7".repeat(64),
  reviewSurvey: "8".repeat(64),
  reviewLayout: "9".repeat(64),
};

const NOW = new Date("2026-08-25T12:00:00.000Z");

const validPackage = (): PathwayRealSiteEvidencePackage => ({
  version: PATHWAY_REAL_SITE_EVIDENCE_VERSION,
  projectRef: "project_opaque_74h",
  documents: [
    {
      role: "ROAD_CLASSIFICATION",
      uploadRef: "upload_road_74h",
      contentHash: HASH.road,
      evidenceStatus: "READY",
      indexingStatus: "READY",
      authority: "TRANSPORT_FOR_NSW",
      sourceVersion: "NSW Roads Network Categorisation current snapshot",
      sourceReferenceHash: HASH.sourceRoad,
      issuedAt: "2026-08-01T00:00:00.000Z",
      retrievedAt: "2026-08-24T00:00:00.000Z",
      staleAt: "2026-11-24T00:00:00.000Z",
      basisContentHash: null,
      verification: {
        status: "EVIDENCE_VERIFIED",
        reviewerRef: "reviewer_opaque_01",
        reviewedAt: "2026-08-24T01:00:00.000Z",
        reviewNotesHash: HASH.reviewRoad,
      },
    },
    {
      role: "CADASTRAL_SURVEY",
      uploadRef: "upload_survey_74h",
      contentHash: HASH.survey,
      evidenceStatus: "IMAGE_ONLY",
      indexingStatus: "NOT_APPLICABLE",
      authority: "REGISTERED_SURVEYOR",
      sourceVersion: "Current signed survey",
      sourceReferenceHash: HASH.sourceSurvey,
      issuedAt: "2026-07-15T00:00:00.000Z",
      retrievedAt: "2026-08-24T00:00:00.000Z",
      staleAt: "2027-02-24T00:00:00.000Z",
      basisContentHash: null,
      verification: {
        status: "EVIDENCE_VERIFIED",
        reviewerRef: "reviewer_opaque_01",
        reviewedAt: "2026-08-24T01:05:00.000Z",
        reviewNotesHash: HASH.reviewSurvey,
      },
    },
    {
      role: "PROPOSED_SHED_LAYOUT",
      uploadRef: "upload_layout_74h",
      contentHash: HASH.layout,
      evidenceStatus: "IMAGE_ONLY",
      indexingStatus: "NOT_APPLICABLE",
      authority: "APPLICANT",
      sourceVersion: "Marked-up proposal bound to current survey",
      sourceReferenceHash: HASH.sourceLayout,
      issuedAt: "2026-08-20T00:00:00.000Z",
      retrievedAt: "2026-08-24T00:00:00.000Z",
      staleAt: "2027-02-24T00:00:00.000Z",
      basisContentHash: HASH.survey,
      verification: {
        status: "EVIDENCE_VERIFIED",
        reviewerRef: "reviewer_opaque_01",
        reviewedAt: "2026-08-24T01:10:00.000Z",
        reviewNotesHash: HASH.reviewLayout,
      },
    },
  ],
  roadClassification: {
    category: "CLASSIFIED_ROAD",
    sourceRole: "ROAD_CLASSIFICATION",
    sourceReferenceHash: HASH.sourceRoad,
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
});

describe("Item 74H real-site evidence intake", () => {
  it("confirms a fully source-bound package but does not unlock a paid stage", () => {
    const result = assessPathwayRealSiteEvidence(validPackage(), NOW);

    expect(result.status).toBe("EVIDENCE_CONFIRMED");
    expect(result.confirmedEvidence).toMatchObject({
      roadCategory: "CLASSIFIED_ROAD",
      shedFootprintSqm: 120,
      shedHeightM: 4.8,
      roadSetbackM: 62,
      sideSetbackM: 18,
      rearSetbackM: 24,
    });
    expect(result.confirmedEvidence?.siteEvidenceDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(result.redactedSummary).toMatchObject({
      acceptedDocumentCount: 3,
      manuallyReviewedRoles: ["CADASTRAL_SURVEY", "PROPOSED_SHED_LAYOUT"],
      containsRawSiteIdentifiers: false,
      packEligibilityUnlocked: false,
      submissionSeeEligibilityUnlocked: false,
      productionCheckoutEnabled: false,
    });
    expect(JSON.stringify(result.redactedSummary)).not.toContain("upload_");
    expect(JSON.stringify(result.redactedSummary)).not.toContain("project_");
  });

  it("does not treat TfNSW dataset absence as other-road evidence", () => {
    const input = validPackage();
    input.roadClassification = {
      category: "OTHER_ROAD",
      sourceRole: "ROAD_CLASSIFICATION",
      sourceReferenceHash: HASH.sourceRoad,
      matchMethod: "POSITIVE_TFNSW_STATE_OR_REGIONAL_MATCH",
    };

    const result = assessPathwayRealSiteEvidence(input, NOW);

    expect(result.status).toBe("MORE_EVIDENCE_REQUIRED");
    expect(result.reasons).toContain(
      "An other road requires explicit current Byron Council confirmation.",
    );
    expect(result.confirmedEvidence).toBeNull();
  });

  it("accepts an other road only with explicit current Byron Council confirmation", () => {
    const input = validPackage();
    input.documents[0] = {
      ...input.documents[0],
      authority: "BYRON_SHIRE_COUNCIL",
    };
    input.roadClassification = {
      category: "OTHER_ROAD",
      sourceRole: "ROAD_CLASSIFICATION",
      sourceReferenceHash: HASH.sourceRoad,
      matchMethod: "EXPLICIT_BYRON_COUNCIL_CONFIRMATION",
    };

    expect(assessPathwayRealSiteEvidence(input, NOW).status).toBe(
      "EVIDENCE_CONFIRMED",
    );
  });

  it("keeps image-only evidence blocked until manual verification is complete", () => {
    const input = validPackage();
    input.documents[1] = {
      ...input.documents[1],
      evidenceStatus: "NEEDS_REVIEW",
    };

    const result = assessPathwayRealSiteEvidence(input, NOW);

    expect(result.status).toBe("MORE_EVIDENCE_REQUIRED");
    expect(result.reasons).toContain(
      "CADASTRAL_SURVEY still needs evidence review.",
    );
  });

  it("rejects stale evidence and a layout not bound to the current survey", () => {
    const input = validPackage();
    input.documents[0] = {
      ...input.documents[0],
      staleAt: "2026-08-25T11:00:00.000Z",
    };
    input.documents[2] = {
      ...input.documents[2],
      basisContentHash: "a".repeat(64),
    };

    const result = assessPathwayRealSiteEvidence(input, NOW);

    expect(result.status).toBe("MORE_EVIDENCE_REQUIRED");
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "ROAD_CLASSIFICATION evidence is stale or has no valid currentness boundary.",
        "The proposed shed layout must bind to the current cadastral survey hash.",
      ]),
    );
  });

  it("rejects missing, duplicate, non-positive and unbound measurements", () => {
    const input = validPackage();
    input.measurements = [
      ...input.measurements.filter(
        (measurement) => measurement.key !== "REAR_SETBACK_M",
      ),
      {
        key: "ROAD_SETBACK_M",
        value: 0,
        unit: "m",
        sourceRole: "PROPOSED_SHED_LAYOUT",
        pageReference: "the address is here",
        method: "PLAN_DIMENSION",
      },
    ];

    const result = assessPathwayRealSiteEvidence(input, NOW);

    expect(result.status).toBe("MORE_EVIDENCE_REQUIRED");
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "REAR_SETBACK_M must be supplied exactly once.",
        "ROAD_SETBACK_M must be supplied exactly once.",
        "ROAD_SETBACK_M must be a positive finite number.",
        "ROAD_SETBACK_M requires a non-identifying page or sheet reference.",
      ]),
    );
  });

  it("rejects raw or unsupported fields instead of hashing them into accepted scope", () => {
    const input = validPackage() as PathwayRealSiteEvidencePackage & {
      address?: string;
    };
    input.address = "private site address";
    (input.documents[1] as PathwayRealSiteEvidencePackage["documents"][number] & {
      publicUrl?: string;
    }).publicUrl = "https://storage.example/private-plan.pdf";

    const result = assessPathwayRealSiteEvidence(input, NOW);

    expect(result.status).toBe("MORE_EVIDENCE_REQUIRED");
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "Evidence package contains unsupported field address.",
        "Document 2 contains unsupported field publicUrl.",
      ]),
    );
    expect(result.confirmedEvidence).toBeNull();
  });

  it("changes the evidence digest when an accepted measurement changes", () => {
    const first = assessPathwayRealSiteEvidence(validPackage(), NOW);
    const changed = validPackage();
    changed.measurements = changed.measurements.map((measurement) =>
      measurement.key === "ROAD_SETBACK_M"
        ? { ...measurement, value: measurement.value + 1 }
        : measurement,
    );
    const second = assessPathwayRealSiteEvidence(changed, NOW);

    expect(first.status).toBe("EVIDENCE_CONFIRMED");
    expect(second.status).toBe("EVIDENCE_CONFIRMED");
    expect(first.confirmedEvidence?.siteEvidenceDigest).not.toBe(
      second.confirmedEvidence?.siteEvidenceDigest,
    );
  });
});
