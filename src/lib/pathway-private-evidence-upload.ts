export const PATHWAY_PRIVATE_EVIDENCE_UPLOAD_VERSION =
  "item74h-private-evidence-upload.v1" as const;

export type PathwayPrivateEvidenceRole =
  | "ROAD_CLASSIFICATION"
  | "CADASTRAL_SURVEY"
  | "PROPOSED_SHED_LAYOUT";

export type PathwayPrivateEvidenceUploadBlocker =
  | "PREVIEW_ONLY"
  | "FEATURE_DISABLED"
  | "AUTH_REQUIRED"
  | "PROJECT_SCOPE_MISMATCH"
  | "PRIVATE_STORAGE_REQUIRED"
  | "PRIVATE_BLOB_SDK_TOO_OLD"
  | "PRIVATE_BLOB_HOST_REQUIRED"
  | "OPAQUE_OBJECT_REFERENCE_REQUIRED"
  | "INVALID_SIGNED_ACCESS_TTL"
  | "UNSUPPORTED_DOCUMENT_ROLE"
  | "UNSUPPORTED_FILE_TYPE"
  | "INVALID_FILE_SIZE"
  | "CONTENT_HASH_REQUIRED"
  | "SECURITY_SCAN_REQUIRED"
  | "EVIDENCE_REVIEW_REQUIRED"
  | "UNSUPPORTED_FIELD";

export type PathwayPrivateEvidenceUploadInput = {
  version: typeof PATHWAY_PRIVATE_EVIDENCE_UPLOAD_VERSION;
  environment: "preview" | "production" | "development";
  featureEnabled: boolean;
  auth: {
    authEnabled: boolean;
    sessionUserRef: string | null;
    projectOwnerRef: string | null;
  };
  storage: {
    access: "private" | "public" | "unknown";
    sdkVersion: string;
    host: string;
    objectRef: string;
    signedAccessTtlSeconds: number | null;
  };
  document: {
    role: PathwayPrivateEvidenceRole;
    contentHash: string;
    mimeType:
      | "application/pdf"
      | "application/json"
      | "text/csv"
      | "image/png"
      | "image/jpeg";
    fileSizeBytes: number;
    securityScanStatus: "PENDING" | "CLEAN" | "FAILED" | "UNAVAILABLE";
    evidenceReviewStatus: "PENDING" | "EVIDENCE_VERIFIED" | "REJECTED";
  };
};

export type PathwayPrivateEvidenceUploadEvaluation = {
  version: typeof PATHWAY_PRIVATE_EVIDENCE_UPLOAD_VERSION;
  privateUploadAuthorized: boolean;
  quarantineRequired: boolean;
  evidenceAccepted: boolean;
  blockers: PathwayPrivateEvidenceUploadBlocker[];
  redactedSummary: {
    role: PathwayPrivateEvidenceRole | null;
    privateStorageConfirmed: boolean;
    authenticatedProjectScopeConfirmed: boolean;
    contentIntegrityConfirmed: boolean;
    securityScanClean: boolean;
    evidenceReviewComplete: boolean;
    containsRawSiteIdentifiers: false;
    returnsDirectObjectUrl: false;
    paidEligibilityUnlocked: false;
    productionCheckoutEnabled: false;
  };
};

const INPUT_KEYS = new Set([
  "version",
  "environment",
  "featureEnabled",
  "auth",
  "storage",
  "document",
]);
const AUTH_KEYS = new Set([
  "authEnabled",
  "sessionUserRef",
  "projectOwnerRef",
]);
const STORAGE_KEYS = new Set([
  "access",
  "sdkVersion",
  "host",
  "objectRef",
  "signedAccessTtlSeconds",
]);
const DOCUMENT_KEYS = new Set([
  "role",
  "contentHash",
  "mimeType",
  "fileSizeBytes",
  "securityScanStatus",
  "evidenceReviewStatus",
]);

const ALLOWED_ROLES: PathwayPrivateEvidenceRole[] = [
  "ROAD_CLASSIFICATION",
  "CADASTRAL_SURVEY",
  "PROPOSED_SHED_LAYOUT",
];
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/json",
  "text/csv",
  "image/png",
  "image/jpeg",
]);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const OPAQUE_REF = /^[A-Za-z0-9_-]{8,160}$/;
const PRIVATE_OBJECT_REF = /^ev_[A-Za-z0-9_-]{16,160}$/;
const PRIVATE_BLOB_HOST =
  /^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/;

const UPLOAD_STAGE_BLOCKERS = new Set<PathwayPrivateEvidenceUploadBlocker>([
  "PREVIEW_ONLY",
  "FEATURE_DISABLED",
  "AUTH_REQUIRED",
  "PROJECT_SCOPE_MISMATCH",
  "PRIVATE_STORAGE_REQUIRED",
  "PRIVATE_BLOB_SDK_TOO_OLD",
  "PRIVATE_BLOB_HOST_REQUIRED",
  "OPAQUE_OBJECT_REFERENCE_REQUIRED",
  "INVALID_SIGNED_ACCESS_TTL",
  "UNSUPPORTED_DOCUMENT_ROLE",
  "UNSUPPORTED_FILE_TYPE",
  "INVALID_FILE_SIZE",
  "CONTENT_HASH_REQUIRED",
  "UNSUPPORTED_FIELD",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasUnsupportedFields = (value: unknown, allowed: Set<string>) =>
  !isRecord(value) ||
  Object.keys(value).some((key) => !allowed.has(key));

const privateBlobSdkSupported = (version: string) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > 2 || (major === 2 && minor >= 3);
};

const validSignedAccessTtl = (value: number | null) =>
  value === null ||
  (Number.isInteger(value) && value >= 60 && value <= 600);

export const evaluatePathwayPrivateEvidenceUpload = (
  input: PathwayPrivateEvidenceUploadInput,
): PathwayPrivateEvidenceUploadEvaluation => {
  const blockers: PathwayPrivateEvidenceUploadBlocker[] = [];

  if (
    hasUnsupportedFields(input, INPUT_KEYS) ||
    hasUnsupportedFields(input.auth, AUTH_KEYS) ||
    hasUnsupportedFields(input.storage, STORAGE_KEYS) ||
    hasUnsupportedFields(input.document, DOCUMENT_KEYS)
  ) {
    blockers.push("UNSUPPORTED_FIELD");
  }
  if (input.version !== PATHWAY_PRIVATE_EVIDENCE_UPLOAD_VERSION) {
    blockers.push("UNSUPPORTED_FIELD");
  }
  if (input.environment !== "preview") {
    blockers.push("PREVIEW_ONLY");
  }
  if (!input.featureEnabled) {
    blockers.push("FEATURE_DISABLED");
  }

  const sessionUserValid =
    typeof input.auth.sessionUserRef === "string" &&
    OPAQUE_REF.test(input.auth.sessionUserRef);
  const projectOwnerValid =
    typeof input.auth.projectOwnerRef === "string" &&
    OPAQUE_REF.test(input.auth.projectOwnerRef);

  if (!input.auth.authEnabled || !sessionUserValid) {
    blockers.push("AUTH_REQUIRED");
  }
  if (
    !sessionUserValid ||
    !projectOwnerValid ||
    input.auth.sessionUserRef !== input.auth.projectOwnerRef
  ) {
    blockers.push("PROJECT_SCOPE_MISMATCH");
  }

  if (input.storage.access !== "private") {
    blockers.push("PRIVATE_STORAGE_REQUIRED");
  }
  if (!privateBlobSdkSupported(input.storage.sdkVersion)) {
    blockers.push("PRIVATE_BLOB_SDK_TOO_OLD");
  }
  if (!PRIVATE_BLOB_HOST.test(input.storage.host)) {
    blockers.push("PRIVATE_BLOB_HOST_REQUIRED");
  }
  if (!PRIVATE_OBJECT_REF.test(input.storage.objectRef)) {
    blockers.push("OPAQUE_OBJECT_REFERENCE_REQUIRED");
  }
  if (!validSignedAccessTtl(input.storage.signedAccessTtlSeconds)) {
    blockers.push("INVALID_SIGNED_ACCESS_TTL");
  }

  if (!ALLOWED_ROLES.includes(input.document.role)) {
    blockers.push("UNSUPPORTED_DOCUMENT_ROLE");
  }
  if (!ALLOWED_MIME_TYPES.has(input.document.mimeType)) {
    blockers.push("UNSUPPORTED_FILE_TYPE");
  }
  if (
    !Number.isInteger(input.document.fileSizeBytes) ||
    input.document.fileSizeBytes <= 0 ||
    input.document.fileSizeBytes > MAX_FILE_SIZE_BYTES
  ) {
    blockers.push("INVALID_FILE_SIZE");
  }
  if (!SHA256.test(input.document.contentHash)) {
    blockers.push("CONTENT_HASH_REQUIRED");
  }
  if (input.document.securityScanStatus !== "CLEAN") {
    blockers.push("SECURITY_SCAN_REQUIRED");
  }
  if (input.document.evidenceReviewStatus !== "EVIDENCE_VERIFIED") {
    blockers.push("EVIDENCE_REVIEW_REQUIRED");
  }

  const uniqueBlockers = Array.from(new Set(blockers));
  const privateUploadAuthorized = !uniqueBlockers.some((blocker) =>
    UPLOAD_STAGE_BLOCKERS.has(blocker),
  );
  const evidenceAccepted =
    privateUploadAuthorized &&
    !uniqueBlockers.includes("SECURITY_SCAN_REQUIRED") &&
    !uniqueBlockers.includes("EVIDENCE_REVIEW_REQUIRED");

  return {
    version: PATHWAY_PRIVATE_EVIDENCE_UPLOAD_VERSION,
    privateUploadAuthorized,
    quarantineRequired: privateUploadAuthorized && !evidenceAccepted,
    evidenceAccepted,
    blockers: uniqueBlockers,
    redactedSummary: {
      role: ALLOWED_ROLES.includes(input.document.role)
        ? input.document.role
        : null,
      privateStorageConfirmed:
        input.storage.access === "private" &&
        privateBlobSdkSupported(input.storage.sdkVersion) &&
        PRIVATE_BLOB_HOST.test(input.storage.host),
      authenticatedProjectScopeConfirmed:
        input.auth.authEnabled &&
        sessionUserValid &&
        projectOwnerValid &&
        input.auth.sessionUserRef === input.auth.projectOwnerRef,
      contentIntegrityConfirmed: SHA256.test(input.document.contentHash),
      securityScanClean: input.document.securityScanStatus === "CLEAN",
      evidenceReviewComplete:
        input.document.evidenceReviewStatus === "EVIDENCE_VERIFIED",
      containsRawSiteIdentifiers: false,
      returnsDirectObjectUrl: false,
      paidEligibilityUnlocked: false,
      productionCheckoutEnabled: false,
    },
  };
};
