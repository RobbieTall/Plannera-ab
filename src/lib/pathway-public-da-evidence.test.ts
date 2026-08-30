import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  PATHWAY_PUBLIC_DA_EVIDENCE_VERSION,
  assessPathwayPublicDaEvidenceCatalog,
  type PathwayPublicDaEvidenceCatalog,
} from "./pathway-public-da-evidence";

const sha = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const catalog = (): PathwayPublicDaEvidenceCatalog => ({
  version: PATHWAY_PUBLIC_DA_EVIDENCE_VERSION,
  authority: "BYRON_SHIRE_COUNCIL",
  applicationType: "DEVELOPMENT_APPLICATION",
  applicationNumber: "10.2025.340.1",
  proposalKind: "FARM_SHED",
  trackerUrl:
    "https://datracker.byron.nsw.gov.au/masterviewui-external/application/applicationdetails/010.2025.00000340.001/",
  addressFingerprint: sha("controlled-public-address"),
  propertyLotRefHash: sha("controlled-public-lot"),
  proposalDescriptionHash: sha("construction-of-three-farm-sheds"),
  determination: {
    status: "APPROVED",
    determinedAt: "2025-09-24T00:00:00.000Z",
  },
  documents: [
    {
      recordNumber: "E2025/105887",
      role: "APPROVED_PLANS",
      contentType: "application/pdf",
      sizeBytes: 480_000,
      labelHash: sha("approved-plans"),
    },
    {
      recordNumber: "E2025/108172",
      role: "DETERMINATION",
      contentType: "application/pdf",
      sizeBytes: 300_000,
      labelHash: sha("notice-of-determination"),
    },
    {
      recordNumber: "E2025/86989",
      role: "FLOOR_ELEVATION_PLAN",
      contentType: "application/pdf",
      sizeBytes: 240_000,
      labelHash: sha("floor-and-elevation-plans"),
    },
    {
      recordNumber: "E2025/86994",
      role: "SITE_PLAN",
      contentType: "application/pdf",
      sizeBytes: 220_000,
      labelHash: sha("site-plans"),
    },
    {
      recordNumber: "E2025/86995",
      role: "PLANNING_REPORT",
      contentType: "application/pdf",
      sizeBytes: 2_280_000,
      labelHash: sha("planning-report"),
    },
    {
      recordNumber: "E2025/86986",
      role: "SUPPORTING",
      contentType: "application/pdf",
      sizeBytes: 230_000,
      labelHash: sha("fire-safety-certificate-one"),
    },
    {
      recordNumber: "E2025/86988",
      role: "SUPPORTING",
      contentType: "application/pdf",
      sizeBytes: 230_000,
      labelHash: sha("fire-safety-certificate-two"),
    },
  ],
  sourceObservedAt: "2026-08-26T00:00:00.000Z",
  sourceStaleAt: "2026-09-26T00:00:00.000Z",
  rawAddressRetained: false,
  directDownloadTokensRetained: false,
});

describe("public Byron DA evidence catalog", () => {
  it("confirms the official catalog without unlocking paid products", () => {
    const result = assessPathwayPublicDaEvidenceCatalog(
      catalog(),
      new Date("2026-08-26T12:00:00.000Z"),
    );

    expect(result.status).toBe("CATALOG_CONFIRMED");
    expect(result.reasons).toEqual([]);
    expect(result.catalogDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(result.redactedSummary).toMatchObject({
      applicationNumber: "10.2025.340.1",
      proposalKind: "FARM_SHED",
      documentCount: 7,
      rawAddressRetained: false,
      directDownloadTokensRetained: false,
      proposalMeasurementsVerified: false,
      planningControlsPackEligible: false,
      submissionSeeEligible: false,
      productionCheckoutEnabled: false,
    });
  });

  it("is replay-stable when official records arrive in a different order", () => {
    const first = assessPathwayPublicDaEvidenceCatalog(
      catalog(),
      new Date("2026-08-26T12:00:00.000Z"),
    );
    const reversed = catalog();
    reversed.documents.reverse();
    const second = assessPathwayPublicDaEvidenceCatalog(
      reversed,
      new Date("2026-08-26T12:00:00.000Z"),
    );

    expect(second.catalogDigest).toBe(first.catalogDigest);
  });

  it("rejects raw-address and direct-download fields fail closed", () => {
    const unsafe = {
      ...catalog(),
      rawAddress: "not permitted",
      documents: catalog().documents.map((document, index) =>
        index === 0
          ? { ...document, downloadUrl: "https://example.invalid/token" }
          : document,
      ),
    } as unknown as PathwayPublicDaEvidenceCatalog;

    const result = assessPathwayPublicDaEvidenceCatalog(
      unsafe,
      new Date("2026-08-26T12:00:00.000Z"),
    );

    expect(result.status).toBe("MORE_EVIDENCE_REQUIRED");
    expect(result.catalogDigest).toBeNull();
    expect(result.reasons).toContain(
      "Catalog contains unsupported field rawAddress.",
    );
    expect(result.reasons).toContain(
      "Document 1 contains unsupported field downloadUrl.",
    );
  });

  it("rejects stale or incomplete official inventories", () => {
    const incomplete = catalog();
    incomplete.sourceStaleAt = "2026-08-25T00:00:00.000Z";
    incomplete.documents = incomplete.documents.filter(
      (document) => document.role !== "APPROVED_PLANS",
    );

    const result = assessPathwayPublicDaEvidenceCatalog(
      incomplete,
      new Date("2026-08-26T12:00:00.000Z"),
    );

    expect(result.status).toBe("MORE_EVIDENCE_REQUIRED");
    expect(result.reasons).toContain(
      "The official application inventory is stale.",
    );
    expect(result.reasons).toContain(
      "APPROVED_PLANS must be represented exactly once.",
    );
    expect(result.redactedSummary.planningControlsPackEligible).toBe(false);
    expect(result.redactedSummary.submissionSeeEligible).toBe(false);
  });

  it("rejects tracker URLs that contain download tokens or do not match the application", () => {
    const unsafeUrl = catalog();
    unsafeUrl.trackerUrl += "?key=temporary-token";

    const result = assessPathwayPublicDaEvidenceCatalog(
      unsafeUrl,
      new Date("2026-08-26T12:00:00.000Z"),
    );

    expect(result.status).toBe("MORE_EVIDENCE_REQUIRED");
    expect(result.reasons).toContain(
      "The tracker URL must be the token-free official application page.",
    );
  });
});
