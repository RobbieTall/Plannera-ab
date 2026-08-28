import {
  type PathwayPrivateEvidenceRole,
} from "./pathway-private-evidence-upload";
import {
  PATHWAY_PRIVATE_EVIDENCE_DEFINITION_FRESHNESS_MS,
  type PathwayPrivateEvidenceScanRecord,
} from "./pathway-private-evidence-scan";

export type { PathwayPrivateEvidenceScanRecord } from "./pathway-private-evidence-scan";

export const PATHWAY_PRIVATE_EVIDENCE_REVIEW_VERSION =
  "item74h-private-evidence-review.v1" as const;

export type PathwayPrivateEvidenceReviewBlocker =
  | "PREVIEW_ONLY"
  | "FEATURE_DISABLED"
  | "OPERATOR_AUTH_REQUIRED"
  | "UNSUPPORTED_FIELD"
  | "OPAQUE_EVIDENCE_REF_REQUIRED"
  | "AUTHORITATIVE_RECORDS_REQUIRED"
  | "CONTENT_HASH_REQUIRED"
  | "PRIVATE_STORAGE_REQUIRED"
  | "NOT_QUARANTINED"
  | "SCAN_RECORD_MISMATCH"
  | "SECURITY_SCAN_PENDING"
  | "SECURITY_SCAN_FAILED"
  | "MALWARE_DETECTED"
  | "SCANNER_PROVENANCE_REQUIRED"
  | "REVIEW_RECORD_MISMATCH"
  | "EVIDENCE_REVIEW_REQUIRED"
  | "REVIEW_REJECTED"
  | "REVIEWER_REFERENCE_REQUIRED"
  | "INVALID_REVIEW_SEQUENCE"
  | "PAGE_REFERENCE_REQUIRED"
  | "PROMOTION_PERSISTENCE_REQUIRED";

export type PathwayPrivateEvidenceRecord = {
  evidenceRef: string;
  role: PathwayPrivateEvidenceRole;
  contentHash: string;
  storageAccess: "private" | "public" | "unknown";
  quarantineStatus: "QUARANTINED" | "READY" | "REJECTED";
};

export type PathwayPrivateEvidenceOperatorReviewRecord = {
  recordSource: "SERVER_OPERATOR_REVIEW";
  evidenceRef: string;
  contentHash: string;
  status: "PENDING" | "EVIDENCE_VERIFIED" | "REJECTED";
  reviewerRef: string | null;
  reviewedAt: string | null;
  pageReferences: string[];
};

export type PathwayPrivateEvidenceReviewRequest = {
  version: typeof PATHWAY_PRIVATE_EVIDENCE_REVIEW_VERSION;
  environment: "preview" | "production" | "development";
  featureEnabled: boolean;
  evaluatedAt: string;
  operatorAuth: {
    authEnabled: boolean;
    operatorAuthorized: boolean;
    operatorRef: string | null;
  };
  evidenceRef: string;
};

export type PathwayPrivateEvidenceReviewDependencies = {
  loadEvidence: (
    evidenceRef: string,
  ) => Promise<PathwayPrivateEvidenceRecord | null>;
  loadSecurityScan: (
    evidenceRef: string,
  ) => Promise<PathwayPrivateEvidenceScanRecord | null>;
  loadOperatorReview: (
    evidenceRef: string,
  ) => Promise<PathwayPrivateEvidenceOperatorReviewRecord | null>;
  markReadyForEvidencePackage: (input: {
    evidenceRef: string;
    contentHash: string;
    role: PathwayPrivateEvidenceRole;
    reviewedAt: string;
  }) => Promise<void>;
};

export type PathwayPrivateEvidenceReviewResult = {
  version: typeof PATHWAY_PRIVATE_EVIDENCE_REVIEW_VERSION;
  status:
    | "DENIED"
    | "QUARANTINED"
    | "REJECTED"
    | "READY_FOR_EVIDENCE_PACKAGE";
  blockers: PathwayPrivateEvidenceReviewBlocker[];
  deletionRequired: boolean;
  evidencePackageCandidate: boolean;
  redactedSummary: {
    role: PathwayPrivateEvidenceRole | null;
    privateStorageConfirmed: boolean;
    scanRecordMatched: boolean;
    securityScanClean: boolean;
    operatorReviewMatched: boolean;
    operatorReviewComplete: boolean;
    pageReferenceCount: number;
    containsRawSiteIdentifiers: false;
    returnsDirectObjectUrl: false;
    planningControlsPackEligible: false;
    submissionSeeEligible: false;
    productionCheckoutEnabled: false;
  };
};

const REQUEST_KEYS = new Set([
  "version",
  "environment",
  "featureEnabled",
  "evaluatedAt",
  "operatorAuth",
  "evidenceRef",
]);
const OPERATOR_AUTH_KEYS = new Set([
  "authEnabled",
  "operatorAuthorized",
  "operatorRef",
]);
const EVIDENCE_KEYS = new Set([
  "evidenceRef",
  "role",
  "contentHash",
  "storageAccess",
  "quarantineStatus",
]);
const SCAN_KEYS = new Set([
  "recordSource",
  "evidenceRef",
  "contentHash",
  "status",
  "scannerEngine",
  "engineVersion",
  "definitionVersion",
  "scannerSnapshotRef",
  "snapshotCreatedAt",
  "definitionsRetrievedAt",
  "scannedAt",
  "targetFileCount",
  "maxFileSizeBytes",
  "maxScanSizeBytes",
  "maxRecursionDepth",
  "maxScanTimeMs",
  "fileSizeLimitHit",
  "scanSizeLimitHit",
  "recursionLimitHit",
  "timeLimitHit",
  "encryptedContent",
  "networkDenied",
  "sandboxStopped",
]);
const REVIEW_KEYS = new Set([
  "recordSource",
  "evidenceRef",
  "contentHash",
  "status",
  "reviewerRef",
  "reviewedAt",
  "pageReferences",
]);

const OPAQUE_REF = /^[A-Za-z0-9_-]{8,160}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const VERSION_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:+/-]{0,127}$/;
const PAGE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9 ._:/()-]{0,79}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasOnlyKeys = (value: unknown, allowed: Set<string>) =>
  isRecord(value) && Object.keys(value).every((key) => allowed.has(key));

const parsedTime = (value: string | null) => {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
};

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const baseResult = (
  status: PathwayPrivateEvidenceReviewResult["status"],
  blockers: PathwayPrivateEvidenceReviewBlocker[],
  evidence: PathwayPrivateEvidenceRecord | null,
  scan: PathwayPrivateEvidenceScanRecord | null,
  review: PathwayPrivateEvidenceOperatorReviewRecord | null,
  deletionRequired = false,
): PathwayPrivateEvidenceReviewResult => {
  const scanMatched =
    Boolean(evidence && scan) &&
    scan!.recordSource === "SERVER_SECURITY_SCAN" &&
    scan!.evidenceRef === evidence!.evidenceRef &&
    scan!.contentHash === evidence!.contentHash;
  const reviewMatched =
    Boolean(evidence && review) &&
    review!.recordSource === "SERVER_OPERATOR_REVIEW" &&
    review!.evidenceRef === evidence!.evidenceRef &&
    review!.contentHash === evidence!.contentHash;
  const validPageReferences =
    review?.pageReferences.filter((reference) =>
      PAGE_REFERENCE.test(reference),
    ) ?? [];

  return {
    version: PATHWAY_PRIVATE_EVIDENCE_REVIEW_VERSION,
    status,
    blockers: unique(blockers),
    deletionRequired,
    evidencePackageCandidate: status === "READY_FOR_EVIDENCE_PACKAGE",
    redactedSummary: {
      role: evidence?.role ?? null,
      privateStorageConfirmed: evidence?.storageAccess === "private",
      scanRecordMatched: scanMatched,
      securityScanClean: scanMatched && scan?.status === "CLEAN",
      operatorReviewMatched: reviewMatched,
      operatorReviewComplete:
        reviewMatched && review?.status === "EVIDENCE_VERIFIED",
      pageReferenceCount: validPageReferences.length,
      containsRawSiteIdentifiers: false,
      returnsDirectObjectUrl: false,
      planningControlsPackEligible: false,
      submissionSeeEligible: false,
      productionCheckoutEnabled: false,
    },
  };
};

const evaluateRecords = (
  request: PathwayPrivateEvidenceReviewRequest,
  evidence: PathwayPrivateEvidenceRecord,
  scan: PathwayPrivateEvidenceScanRecord,
  review: PathwayPrivateEvidenceOperatorReviewRecord,
): PathwayPrivateEvidenceReviewResult => {
  const blockers: PathwayPrivateEvidenceReviewBlocker[] = [];
  const evaluatedAt = parsedTime(request.evaluatedAt);
  const scannedAt = parsedTime(scan.scannedAt);
  const snapshotCreatedAt = parsedTime(scan.snapshotCreatedAt);
  const definitionsRetrievedAt = parsedTime(scan.definitionsRetrievedAt);
  const reviewedAt = parsedTime(review.reviewedAt);

  if (
    !hasOnlyKeys(evidence, EVIDENCE_KEYS) ||
    !hasOnlyKeys(scan, SCAN_KEYS) ||
    !hasOnlyKeys(review, REVIEW_KEYS)
  ) {
    blockers.push("UNSUPPORTED_FIELD");
  }
  if (!SHA256.test(evidence.contentHash)) {
    blockers.push("CONTENT_HASH_REQUIRED");
  }
  if (evidence.storageAccess !== "private") {
    blockers.push("PRIVATE_STORAGE_REQUIRED");
  }
  if (evidence.quarantineStatus !== "QUARANTINED") {
    blockers.push("NOT_QUARANTINED");
  }

  const scanMatched =
    scan.recordSource === "SERVER_SECURITY_SCAN" &&
    scan.evidenceRef === evidence.evidenceRef &&
    scan.contentHash === evidence.contentHash;
  if (!scanMatched) {
    blockers.push("SCAN_RECORD_MISMATCH");
  }

  if (scan.status === "PENDING") {
    blockers.push("SECURITY_SCAN_PENDING");
  } else if (scan.status === "ERROR") {
    blockers.push("SECURITY_SCAN_FAILED");
  } else if (scan.status === "INFECTED") {
    blockers.push("MALWARE_DETECTED");
  }

  const scannerProvenanceValid =
    scan.status === "PENDING" ||
    (Boolean(scan.scannerEngine && VERSION_TOKEN.test(scan.scannerEngine)) &&
      Boolean(scan.engineVersion && VERSION_TOKEN.test(scan.engineVersion)) &&
      Boolean(
        scan.definitionVersion && VERSION_TOKEN.test(scan.definitionVersion),
      ) &&
      Boolean(
        scan.scannerSnapshotRef && OPAQUE_REF.test(scan.scannerSnapshotRef),
      ) &&
      definitionsRetrievedAt !== null &&
      snapshotCreatedAt !== null &&
      scannedAt !== null &&
      evaluatedAt !== null &&
      definitionsRetrievedAt <= snapshotCreatedAt &&
      snapshotCreatedAt <= scannedAt &&
      scannedAt <= evaluatedAt &&
      evaluatedAt - definitionsRetrievedAt <=
        PATHWAY_PRIVATE_EVIDENCE_DEFINITION_FRESHNESS_MS &&
      scan.targetFileCount === 1 &&
      Number.isInteger(scan.maxFileSizeBytes) &&
      scan.maxFileSizeBytes! > 0 &&
      Number.isInteger(scan.maxScanSizeBytes) &&
      scan.maxScanSizeBytes! > 0 &&
      Number.isInteger(scan.maxRecursionDepth) &&
      scan.maxRecursionDepth! > 0 &&
      Number.isInteger(scan.maxScanTimeMs) &&
      scan.maxScanTimeMs! > 0 &&
      scan.fileSizeLimitHit === false &&
      scan.scanSizeLimitHit === false &&
      scan.recursionLimitHit === false &&
      scan.timeLimitHit === false &&
      scan.encryptedContent === false &&
      scan.networkDenied === true &&
      scan.sandboxStopped === true);
  if (!scannerProvenanceValid) {
    blockers.push("SCANNER_PROVENANCE_REQUIRED");
  }

  const reviewMatched =
    review.recordSource === "SERVER_OPERATOR_REVIEW" &&
    review.evidenceRef === evidence.evidenceRef &&
    review.contentHash === evidence.contentHash;
  if (!reviewMatched) {
    blockers.push("REVIEW_RECORD_MISMATCH");
  }

  if (review.status === "PENDING") {
    blockers.push("EVIDENCE_REVIEW_REQUIRED");
  } else if (review.status === "REJECTED") {
    blockers.push("REVIEW_REJECTED");
  }

  const reviewerValid =
    review.status === "PENDING" ||
    Boolean(review.reviewerRef && OPAQUE_REF.test(review.reviewerRef));
  if (!reviewerValid) {
    blockers.push("REVIEWER_REFERENCE_REQUIRED");
  }

  const pageReferencesValid =
    review.status === "PENDING" ||
    (review.pageReferences.length > 0 &&
      review.pageReferences.length <= 20 &&
      new Set(review.pageReferences).size === review.pageReferences.length &&
      review.pageReferences.every((reference) =>
        PAGE_REFERENCE.test(reference),
      ));
  if (!pageReferencesValid) {
    blockers.push("PAGE_REFERENCE_REQUIRED");
  }

  const reviewSequenceValid =
    review.status === "PENDING" ||
    (evaluatedAt !== null &&
      scannedAt !== null &&
      reviewedAt !== null &&
      scannedAt <= reviewedAt &&
      reviewedAt <= evaluatedAt);
  if (!reviewSequenceValid) {
    blockers.push("INVALID_REVIEW_SEQUENCE");
  }

  const uniqueBlockers = unique(blockers);
  if (
    uniqueBlockers.includes("MALWARE_DETECTED") ||
    uniqueBlockers.includes("REVIEW_REJECTED")
  ) {
    return baseResult(
      "REJECTED",
      uniqueBlockers,
      evidence,
      scan,
      review,
      uniqueBlockers.includes("MALWARE_DETECTED"),
    );
  }

  if (uniqueBlockers.length > 0) {
    return baseResult(
      "QUARANTINED",
      uniqueBlockers,
      evidence,
      scan,
      review,
    );
  }

  return baseResult(
    "READY_FOR_EVIDENCE_PACKAGE",
    [],
    evidence,
    scan,
    review,
  );
};

export const promotePathwayPrivateEvidence = async (
  request: PathwayPrivateEvidenceReviewRequest,
  deps: PathwayPrivateEvidenceReviewDependencies,
): Promise<PathwayPrivateEvidenceReviewResult> => {
  const requestShapeValid =
    hasOnlyKeys(request, REQUEST_KEYS) &&
    hasOnlyKeys(request.operatorAuth, OPERATOR_AUTH_KEYS);

  if (
    request.version !== PATHWAY_PRIVATE_EVIDENCE_REVIEW_VERSION ||
    !requestShapeValid
  ) {
    return baseResult("DENIED", ["UNSUPPORTED_FIELD"], null, null, null);
  }
  if (request.environment !== "preview") {
    return baseResult("DENIED", ["PREVIEW_ONLY"], null, null, null);
  }
  if (!request.featureEnabled) {
    return baseResult("DENIED", ["FEATURE_DISABLED"], null, null, null);
  }
  if (
    !request.operatorAuth.authEnabled ||
    !request.operatorAuth.operatorAuthorized ||
    !request.operatorAuth.operatorRef ||
    !OPAQUE_REF.test(request.operatorAuth.operatorRef)
  ) {
    return baseResult("DENIED", ["OPERATOR_AUTH_REQUIRED"], null, null, null);
  }
  if (!OPAQUE_REF.test(request.evidenceRef)) {
    return baseResult(
      "DENIED",
      ["OPAQUE_EVIDENCE_REF_REQUIRED"],
      null,
      null,
      null,
    );
  }

  const [evidence, scan, review] = await Promise.all([
    deps.loadEvidence(request.evidenceRef),
    deps.loadSecurityScan(request.evidenceRef),
    deps.loadOperatorReview(request.evidenceRef),
  ]);

  if (!evidence || !scan || !review) {
    return baseResult(
      "QUARANTINED",
      ["AUTHORITATIVE_RECORDS_REQUIRED"],
      evidence,
      scan,
      review,
    );
  }

  const evaluation = evaluateRecords(request, evidence, scan, review);
  if (evaluation.status !== "READY_FOR_EVIDENCE_PACKAGE") {
    return evaluation;
  }

  try {
    await deps.markReadyForEvidencePackage({
      evidenceRef: evidence.evidenceRef,
      contentHash: evidence.contentHash,
      role: evidence.role,
      reviewedAt: review.reviewedAt!,
    });
  } catch {
    return baseResult(
      "QUARANTINED",
      ["PROMOTION_PERSISTENCE_REQUIRED"],
      evidence,
      scan,
      review,
    );
  }

  return evaluation;
};
