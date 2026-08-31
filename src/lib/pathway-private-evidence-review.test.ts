import { describe, expect, it, vi } from "vitest";

import {
  PATHWAY_PRIVATE_EVIDENCE_REVIEW_VERSION,
  promotePathwayPrivateEvidence,
  type PathwayPrivateEvidenceReviewDependencies,
  type PathwayPrivateEvidenceReviewRequest,
} from "./pathway-private-evidence-review";

const EVIDENCE_REF = "evidence_opaque_74h";
const CONTENT_HASH = "a".repeat(64);

const request = (): PathwayPrivateEvidenceReviewRequest => ({
  version: PATHWAY_PRIVATE_EVIDENCE_REVIEW_VERSION,
  environment: "preview",
  featureEnabled: true,
  evaluatedAt: "2026-08-27T04:00:00.000Z",
  operatorAuth: {
    authEnabled: true,
    operatorAuthorized: true,
    operatorRef: "operator_opaque_74h",
  },
  evidenceRef: EVIDENCE_REF,
});

const dependencies = (): PathwayPrivateEvidenceReviewDependencies => ({
  loadEvidence: vi.fn(async () => ({
    evidenceRef: EVIDENCE_REF,
    role: "REGISTERED_CADASTRAL_PLAN",
    contentHash: CONTENT_HASH,
    storageAccess: "private",
    quarantineStatus: "QUARANTINED",
  })),
  loadSecurityScan: vi.fn(async () => ({
    recordSource: "SERVER_SECURITY_SCAN",
    evidenceRef: EVIDENCE_REF,
    contentHash: CONTENT_HASH,
    status: "CLEAN",
    scannerEngine: "scanner-engine",
    engineVersion: "1.2.3",
    definitionVersion: "2026.08.27",
    scannerSnapshotRef: "snapshot_opaque_74h",
    snapshotCreatedAt: "2026-08-27T01:15:00.000Z",
    definitionsRetrievedAt: "2026-08-27T01:00:00.000Z",
    scannedAt: "2026-08-27T02:00:00.000Z",
    targetFileCount: 1,
    maxFileSizeBytes: 25 * 1024 * 1024,
    maxScanSizeBytes: 50 * 1024 * 1024,
    maxRecursionDepth: 16,
    maxScanTimeMs: 120_000,
    fileSizeLimitHit: false,
    scanSizeLimitHit: false,
    recursionLimitHit: false,
    timeLimitHit: false,
    encryptedContent: false,
    networkDenied: true,
    sandboxStopped: true,
  })),
  loadOperatorReview: vi.fn(async () => ({
    recordSource: "SERVER_OPERATOR_REVIEW",
    evidenceRef: EVIDENCE_REF,
    contentHash: CONTENT_HASH,
    status: "EVIDENCE_VERIFIED",
    reviewerRef: "reviewer_opaque_74h",
    reviewedAt: "2026-08-27T03:00:00.000Z",
    pageReferences: ["Sheet 1", "Page 2"],
  })),
  markReadyForEvidencePackage: vi.fn(async () => undefined),
});

describe("Item 74H private evidence review promotion", () => {
  it("promotes only matching clean and operator-verified server records", async () => {
    const deps = dependencies();

    const result = await promotePathwayPrivateEvidence(request(), deps);

    expect(result).toMatchObject({
      status: "READY_FOR_EVIDENCE_PACKAGE",
      blockers: [],
      deletionRequired: false,
      evidencePackageCandidate: true,
      redactedSummary: {
        role: "REGISTERED_CADASTRAL_PLAN",
        privateStorageConfirmed: true,
        scanRecordMatched: true,
        securityScanClean: true,
        operatorReviewMatched: true,
        operatorReviewComplete: true,
        pageReferenceCount: 2,
        containsRawSiteIdentifiers: false,
        returnsDirectObjectUrl: false,
        planningControlsPackEligible: false,
        submissionSeeEligible: false,
        productionCheckoutEnabled: false,
      },
    });
    expect(deps.markReadyForEvidencePackage).toHaveBeenCalledOnce();

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(EVIDENCE_REF);
    expect(serialized).not.toContain(CONTENT_HASH);
    expect(serialized).not.toContain("reviewer_opaque");
    expect(serialized).not.toContain("scanner-engine");
    expect(serialized).not.toContain("Sheet 1");
  });

  it("keeps a pending scan quarantined and does not persist promotion", async () => {
    const deps = dependencies();
    deps.loadSecurityScan = vi.fn(async () => ({
      recordSource: "SERVER_SECURITY_SCAN",
      evidenceRef: EVIDENCE_REF,
      contentHash: CONTENT_HASH,
      status: "PENDING",
      scannerEngine: null,
      engineVersion: null,
      definitionVersion: null,
      scannerSnapshotRef: null,
      snapshotCreatedAt: null,
      definitionsRetrievedAt: null,
      scannedAt: null,
      targetFileCount: null,
      maxFileSizeBytes: null,
      maxScanSizeBytes: null,
      maxRecursionDepth: null,
      maxScanTimeMs: null,
      fileSizeLimitHit: null,
      scanSizeLimitHit: null,
      recursionLimitHit: null,
      timeLimitHit: null,
      encryptedContent: null,
      networkDenied: null,
      sandboxStopped: null,
    }));

    const result = await promotePathwayPrivateEvidence(request(), deps);

    expect(result.status).toBe("QUARANTINED");
    expect(result.blockers).toContain("SECURITY_SCAN_PENDING");
    expect(result.evidencePackageCandidate).toBe(false);
    expect(deps.markReadyForEvidencePackage).not.toHaveBeenCalled();
  });

  it("requires deletion when authoritative scanning detects malware", async () => {
    const deps = dependencies();
    deps.loadSecurityScan = vi.fn(async () => ({
      recordSource: "SERVER_SECURITY_SCAN",
      evidenceRef: EVIDENCE_REF,
      contentHash: CONTENT_HASH,
      status: "INFECTED",
      scannerEngine: "scanner-engine",
      engineVersion: "1.2.3",
      definitionVersion: "2026.08.27",
      scannerSnapshotRef: "snapshot_opaque_74h",
      snapshotCreatedAt: "2026-08-27T01:15:00.000Z",
      definitionsRetrievedAt: "2026-08-27T01:00:00.000Z",
      scannedAt: "2026-08-27T02:00:00.000Z",
      targetFileCount: 1,
      maxFileSizeBytes: 25 * 1024 * 1024,
      maxScanSizeBytes: 50 * 1024 * 1024,
      maxRecursionDepth: 16,
      maxScanTimeMs: 120_000,
      fileSizeLimitHit: false,
      scanSizeLimitHit: false,
      recursionLimitHit: false,
      timeLimitHit: false,
      encryptedContent: false,
      networkDenied: true,
      sandboxStopped: true,
    }));

    const result = await promotePathwayPrivateEvidence(request(), deps);

    expect(result.status).toBe("REJECTED");
    expect(result.blockers).toContain("MALWARE_DETECTED");
    expect(result.deletionRequired).toBe(true);
    expect(result.evidencePackageCandidate).toBe(false);
    expect(deps.markReadyForEvidencePackage).not.toHaveBeenCalled();
  });

  it("rejects caller-supplied scan fields before loading any records", async () => {
    const unsafeRequest = request() as PathwayPrivateEvidenceReviewRequest & {
      scanStatus?: string;
    };
    unsafeRequest.scanStatus = "CLEAN";
    const deps = dependencies();

    const result = await promotePathwayPrivateEvidence(unsafeRequest, deps);

    expect(result.status).toBe("DENIED");
    expect(result.blockers).toContain("UNSUPPORTED_FIELD");
    expect(deps.loadEvidence).not.toHaveBeenCalled();
    expect(deps.loadSecurityScan).not.toHaveBeenCalled();
    expect(deps.loadOperatorReview).not.toHaveBeenCalled();
  });

  it("rejects Production before loading private records", async () => {
    const unsafeRequest = request();
    unsafeRequest.environment = "production";
    const deps = dependencies();

    const result = await promotePathwayPrivateEvidence(unsafeRequest, deps);

    expect(result.status).toBe("DENIED");
    expect(result.blockers).toContain("PREVIEW_ONLY");
    expect(deps.loadEvidence).not.toHaveBeenCalled();
  });

  it("keeps digest-mismatched records quarantined", async () => {
    const deps = dependencies();
    deps.loadOperatorReview = vi.fn(async () => ({
      recordSource: "SERVER_OPERATOR_REVIEW",
      evidenceRef: EVIDENCE_REF,
      contentHash: "b".repeat(64),
      status: "EVIDENCE_VERIFIED",
      reviewerRef: "reviewer_opaque_74h",
      reviewedAt: "2026-08-27T03:00:00.000Z",
      pageReferences: ["Sheet 1"],
    }));

    const result = await promotePathwayPrivateEvidence(request(), deps);

    expect(result.status).toBe("QUARANTINED");
    expect(result.blockers).toContain("REVIEW_RECORD_MISMATCH");
    expect(deps.markReadyForEvidencePackage).not.toHaveBeenCalled();
  });

  it("rejects review that predates the authoritative scan", async () => {
    const deps = dependencies();
    deps.loadOperatorReview = vi.fn(async () => ({
      recordSource: "SERVER_OPERATOR_REVIEW",
      evidenceRef: EVIDENCE_REF,
      contentHash: CONTENT_HASH,
      status: "EVIDENCE_VERIFIED",
      reviewerRef: "reviewer_opaque_74h",
      reviewedAt: "2026-08-27T01:00:00.000Z",
      pageReferences: ["Sheet 1"],
    }));

    const result = await promotePathwayPrivateEvidence(request(), deps);

    expect(result.status).toBe("QUARANTINED");
    expect(result.blockers).toContain("INVALID_REVIEW_SEQUENCE");
    expect(deps.markReadyForEvidencePackage).not.toHaveBeenCalled();
  });

  it("preserves quarantine when ready-state persistence fails", async () => {
    const deps = dependencies();
    deps.markReadyForEvidencePackage = vi.fn(async () => {
      throw new Error("database unavailable");
    });

    const result = await promotePathwayPrivateEvidence(request(), deps);

    expect(result.status).toBe("QUARANTINED");
    expect(result.blockers).toContain("PROMOTION_PERSISTENCE_REQUIRED");
    expect(result.evidencePackageCandidate).toBe(false);
    expect(JSON.stringify(result)).not.toContain("database unavailable");
  });
});
