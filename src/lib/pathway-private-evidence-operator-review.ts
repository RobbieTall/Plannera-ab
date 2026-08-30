import { createHash } from "node:crypto";

import type { PathwayPrivateEvidenceRole } from "./pathway-private-evidence-upload";

export const PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION =
  "item74h-private-evidence-operator-review.v1" as const;

export type PathwayPrivateEvidenceOperatorReviewStatus =
  | "PENDING"
  | "EVIDENCE_VERIFIED"
  | "REJECTED";

export type PathwayPrivateEvidenceOperatorReviewRejectionCode =
  | "UNREADABLE"
  | "WRONG_DOCUMENT"
  | "STALE"
  | "UNBOUND_TO_SITE"
  | "MEASUREMENTS_UNVERIFIABLE"
  | "AUTHORITY_UNVERIFIABLE"
  | "OTHER_STRUCTURED";

export type PathwayPrivateEvidenceOperatorReviewBlocker =
  | "PREVIEW_ONLY"
  | "FEATURE_DISABLED"
  | "OPERATOR_AUTH_REQUIRED"
  | "UNSUPPORTED_FIELD"
  | "OPAQUE_EVIDENCE_REF_REQUIRED"
  | "CONTENT_HASH_REQUIRED"
  | "UNSUPPORTED_DOCUMENT_ROLE"
  | "IDEMPOTENCY_KEY_REQUIRED"
  | "INVALID_REVIEW_TIME"
  | "PAGE_REFERENCE_REQUIRED"
  | "REJECTION_CODE_REQUIRED"
  | "REVIEW_PENDING_REQUIRED"
  | "QUEUE_ALREADY_EXISTS"
  | "TERMINAL_REVIEW_IMMUTABLE"
  | "IDEMPOTENCY_CONFLICT"
  | "PERSISTED_RECORD_MISMATCH"
  | "INVALID_REVIEW_SEQUENCE"
  | "PERSISTENCE_REQUIRED";

export type PathwayPrivateEvidenceOperatorReviewInput = {
  version: typeof PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION;
  environment: "preview" | "production" | "development";
  featureEnabled: boolean;
  submittedAt: string;
  operatorAuth: {
    authEnabled: boolean;
    operatorAuthorized: boolean;
    operatorRef: string | null;
  };
  evidenceRef: string;
  contentHash: string;
  role: PathwayPrivateEvidenceRole;
  idempotencyKey: string;
  transition:
    | {
        status: "PENDING";
        pageReferences: [];
        rejectionCode: null;
      }
    | {
        status: "EVIDENCE_VERIFIED";
        pageReferences: string[];
        rejectionCode: null;
      }
    | {
        status: "REJECTED";
        pageReferences: [];
        rejectionCode: PathwayPrivateEvidenceOperatorReviewRejectionCode;
      };
};

export type PathwayPrivateEvidenceOperatorReviewPersistedRecord = {
  recordSource: "SERVER_OPERATOR_REVIEW";
  environment: "PREVIEW";
  evidenceRef: string;
  contentHash: string;
  role: PathwayPrivateEvidenceRole;
  status: PathwayPrivateEvidenceOperatorReviewStatus;
  actorRef: string;
  reviewerRef: string | null;
  reviewedAt: string | null;
  pageReferences: string[];
  rejectionCode: PathwayPrivateEvidenceOperatorReviewRejectionCode | null;
  reviewVersion: typeof PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION;
  revision: number;
  idempotencyKey: string;
  requestHash: string;
  recordHash: string;
  previousRecordHash: string | null;
  createdAt: string;
};

export type PathwayPrivateEvidenceOperatorReviewDependencies = {
  loadByIdempotencyKey: (
    idempotencyKey: string,
  ) => Promise<PathwayPrivateEvidenceOperatorReviewPersistedRecord | null>;
  loadLatest: (input: {
    evidenceRef: string;
    contentHash: string;
  }) => Promise<PathwayPrivateEvidenceOperatorReviewPersistedRecord | null>;
  append: (
    record: PathwayPrivateEvidenceOperatorReviewPersistedRecord,
  ) => Promise<{
    created: boolean;
    record: PathwayPrivateEvidenceOperatorReviewPersistedRecord;
  }>;
};

export type PathwayPrivateEvidenceOperatorReviewResult = {
  version: typeof PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION;
  operation: "CREATED" | "REPLAYED" | "DENIED";
  reviewStatus: PathwayPrivateEvidenceOperatorReviewStatus | null;
  blockers: PathwayPrivateEvidenceOperatorReviewBlocker[];
  revision: number | null;
  pageReferenceCount: number;
  rejectionCode: PathwayPrivateEvidenceOperatorReviewRejectionCode | null;
  readyForEvidencePackagePromotion: boolean;
  redactedSummary: {
    role: PathwayPrivateEvidenceRole | null;
    authenticatedOperatorConfirmed: boolean;
    immutableTerminalDecision: boolean;
    containsEvidenceReference: false;
    containsContentHash: false;
    containsReviewerReference: false;
    containsPageReference: false;
    planningControlsPackEligible: false;
    submissionSeeEligible: false;
    productionCheckoutEnabled: false;
  };
};

const INPUT_KEYS = new Set([
  "version",
  "environment",
  "featureEnabled",
  "submittedAt",
  "operatorAuth",
  "evidenceRef",
  "contentHash",
  "role",
  "idempotencyKey",
  "transition",
]);
const AUTH_KEYS = new Set([
  "authEnabled",
  "operatorAuthorized",
  "operatorRef",
]);
const TRANSITION_KEYS = new Set([
  "status",
  "pageReferences",
  "rejectionCode",
]);
const RECORD_KEYS = new Set([
  "recordSource",
  "environment",
  "evidenceRef",
  "contentHash",
  "role",
  "status",
  "actorRef",
  "reviewerRef",
  "reviewedAt",
  "pageReferences",
  "rejectionCode",
  "reviewVersion",
  "revision",
  "idempotencyKey",
  "requestHash",
  "recordHash",
  "previousRecordHash",
  "createdAt",
]);

const ALLOWED_ROLES: PathwayPrivateEvidenceRole[] = [
  "ROAD_CLASSIFICATION",
  "CADASTRAL_SURVEY",
  "PROPOSED_SHED_LAYOUT",
];
const REJECTION_CODES: PathwayPrivateEvidenceOperatorReviewRejectionCode[] = [
  "UNREADABLE",
  "WRONG_DOCUMENT",
  "STALE",
  "UNBOUND_TO_SITE",
  "MEASUREMENTS_UNVERIFIABLE",
  "AUTHORITY_UNVERIFIABLE",
  "OTHER_STRUCTURED",
];
const OPAQUE_REF = /^[A-Za-z0-9_-]{8,160}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9:_-]{12,200}$/;
const PAGE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9 ._:/()-]{0,79}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasOnlyKeys = (value: unknown, allowed: Set<string>) =>
  isRecord(value) && Object.keys(value).every((key) => allowed.has(key));

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value;
};

const digest = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");

const parsedTime = (value: string | null) => {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
};

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const denied = (
  blockers: PathwayPrivateEvidenceOperatorReviewBlocker[],
  role: PathwayPrivateEvidenceRole | null,
  authenticatedOperatorConfirmed = false,
): PathwayPrivateEvidenceOperatorReviewResult => ({
  version: PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
  operation: "DENIED",
  reviewStatus: null,
  blockers: unique(blockers),
  revision: null,
  pageReferenceCount: 0,
  rejectionCode: null,
  readyForEvidencePackagePromotion: false,
  redactedSummary: {
    role,
    authenticatedOperatorConfirmed,
    immutableTerminalDecision: false,
    containsEvidenceReference: false,
    containsContentHash: false,
    containsReviewerReference: false,
    containsPageReference: false,
    planningControlsPackEligible: false,
    submissionSeeEligible: false,
    productionCheckoutEnabled: false,
  },
});

const accepted = (
  operation: "CREATED" | "REPLAYED",
  record: PathwayPrivateEvidenceOperatorReviewPersistedRecord,
): PathwayPrivateEvidenceOperatorReviewResult => ({
  version: PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
  operation,
  reviewStatus: record.status,
  blockers: [],
  revision: record.revision,
  pageReferenceCount: record.pageReferences.length,
  rejectionCode: record.rejectionCode,
  readyForEvidencePackagePromotion: record.status === "EVIDENCE_VERIFIED",
  redactedSummary: {
    role: record.role,
    authenticatedOperatorConfirmed: true,
    immutableTerminalDecision: record.status !== "PENDING",
    containsEvidenceReference: false,
    containsContentHash: false,
    containsReviewerReference: false,
    containsPageReference: false,
    planningControlsPackEligible: false,
    submissionSeeEligible: false,
    productionCheckoutEnabled: false,
  },
});

const recordHashInput = (
  record: Omit<
    PathwayPrivateEvidenceOperatorReviewPersistedRecord,
    "recordHash"
  >,
) => record;

const validPersistedRecord = (
  record: PathwayPrivateEvidenceOperatorReviewPersistedRecord,
) => {
  if (!hasOnlyKeys(record, RECORD_KEYS)) return false;
  if (
    record.recordSource !== "SERVER_OPERATOR_REVIEW" ||
    record.environment !== "PREVIEW" ||
    record.reviewVersion !== PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION ||
    !OPAQUE_REF.test(record.evidenceRef) ||
    !SHA256.test(record.contentHash) ||
    !ALLOWED_ROLES.includes(record.role) ||
    !OPAQUE_REF.test(record.actorRef) ||
    !IDEMPOTENCY_KEY.test(record.idempotencyKey) ||
    !SHA256.test(record.requestHash) ||
    !SHA256.test(record.recordHash) ||
    !Number.isInteger(record.revision) ||
    record.revision < 1 ||
    parsedTime(record.createdAt) === null
  ) {
    return false;
  }

  if (
    record.previousRecordHash !== null &&
    !SHA256.test(record.previousRecordHash)
  ) {
    return false;
  }
  if (
    (record.revision === 1 && record.previousRecordHash !== null) ||
    (record.revision > 1 && record.previousRecordHash === null)
  ) {
    return false;
  }

  const referencesValid =
    record.pageReferences.length <= 20 &&
    new Set(record.pageReferences).size === record.pageReferences.length &&
    record.pageReferences.every((reference) =>
      PAGE_REFERENCE.test(reference),
    );
  if (!referencesValid) return false;

  if (record.status === "PENDING") {
    if (
      record.revision !== 1 ||
      record.reviewerRef !== null ||
      record.reviewedAt !== null ||
      record.pageReferences.length !== 0 ||
      record.rejectionCode !== null
    ) {
      return false;
    }
  } else {
    if (
      !record.reviewerRef ||
      !OPAQUE_REF.test(record.reviewerRef) ||
      parsedTime(record.reviewedAt) === null
    ) {
      return false;
    }
    if (
      record.status === "EVIDENCE_VERIFIED" &&
      (record.pageReferences.length < 1 || record.rejectionCode !== null)
    ) {
      return false;
    }
    if (
      record.status === "REJECTED" &&
      (record.pageReferences.length !== 0 ||
        !record.rejectionCode ||
        !REJECTION_CODES.includes(record.rejectionCode))
    ) {
      return false;
    }
  }

  const { recordHash, ...withoutRecordHash } = record;
  return digest(recordHashInput(withoutRecordHash)) === recordHash;
};

const validPageReferences = (references: string[]) =>
  references.length > 0 &&
  references.length <= 20 &&
  new Set(references).size === references.length &&
  references.every((reference) => PAGE_REFERENCE.test(reference));

export const recordPathwayPrivateEvidenceOperatorReview = async (
  input: PathwayPrivateEvidenceOperatorReviewInput,
  deps: PathwayPrivateEvidenceOperatorReviewDependencies,
): Promise<PathwayPrivateEvidenceOperatorReviewResult> => {
  const role = ALLOWED_ROLES.includes(input.role) ? input.role : null;
  const shapeValid =
    hasOnlyKeys(input, INPUT_KEYS) &&
    hasOnlyKeys(input.operatorAuth, AUTH_KEYS) &&
    hasOnlyKeys(input.transition, TRANSITION_KEYS);

  if (
    input.version !== PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION ||
    !shapeValid
  ) {
    return denied(["UNSUPPORTED_FIELD"], role);
  }
  if (input.environment !== "preview") {
    return denied(["PREVIEW_ONLY"], role);
  }
  if (!input.featureEnabled) {
    return denied(["FEATURE_DISABLED"], role);
  }

  const operatorAuthorized =
    input.operatorAuth.authEnabled &&
    input.operatorAuth.operatorAuthorized &&
    Boolean(
      input.operatorAuth.operatorRef &&
        OPAQUE_REF.test(input.operatorAuth.operatorRef),
    );
  if (!operatorAuthorized) {
    return denied(["OPERATOR_AUTH_REQUIRED"], role);
  }
  if (!OPAQUE_REF.test(input.evidenceRef)) {
    return denied(
      ["OPAQUE_EVIDENCE_REF_REQUIRED"],
      role,
      operatorAuthorized,
    );
  }
  if (!SHA256.test(input.contentHash)) {
    return denied(["CONTENT_HASH_REQUIRED"], role, operatorAuthorized);
  }
  if (!role) {
    return denied(["UNSUPPORTED_DOCUMENT_ROLE"], null, operatorAuthorized);
  }
  if (!IDEMPOTENCY_KEY.test(input.idempotencyKey)) {
    return denied(["IDEMPOTENCY_KEY_REQUIRED"], role, operatorAuthorized);
  }

  const submittedAt = parsedTime(input.submittedAt);
  if (submittedAt === null) {
    return denied(["INVALID_REVIEW_TIME"], role, operatorAuthorized);
  }

  if (
    input.transition.status === "EVIDENCE_VERIFIED" &&
    !validPageReferences(input.transition.pageReferences)
  ) {
    return denied(["PAGE_REFERENCE_REQUIRED"], role, operatorAuthorized);
  }
  if (
    input.transition.status === "REJECTED" &&
    !REJECTION_CODES.includes(input.transition.rejectionCode)
  ) {
    return denied(["REJECTION_CODE_REQUIRED"], role, operatorAuthorized);
  }
  if (
    input.transition.status === "PENDING" &&
    (input.transition.pageReferences.length !== 0 ||
      input.transition.rejectionCode !== null)
  ) {
    return denied(["UNSUPPORTED_FIELD"], role, operatorAuthorized);
  }

  const requestHash = digest(input);
  const replay = await deps.loadByIdempotencyKey(input.idempotencyKey);
  if (replay) {
    if (!validPersistedRecord(replay)) {
      return denied(
        ["PERSISTED_RECORD_MISMATCH"],
        role,
        operatorAuthorized,
      );
    }
    if (replay.requestHash !== requestHash) {
      return denied(["IDEMPOTENCY_CONFLICT"], role, operatorAuthorized);
    }
    return accepted("REPLAYED", replay);
  }

  const latest = await deps.loadLatest({
    evidenceRef: input.evidenceRef,
    contentHash: input.contentHash,
  });
  if (latest && !validPersistedRecord(latest)) {
    return denied(
      ["PERSISTED_RECORD_MISMATCH"],
      role,
      operatorAuthorized,
    );
  }

  if (input.transition.status === "PENDING" && latest) {
    return denied(
      [
        latest.status === "PENDING"
          ? "QUEUE_ALREADY_EXISTS"
          : "TERMINAL_REVIEW_IMMUTABLE",
      ],
      role,
      operatorAuthorized,
    );
  }
  if (input.transition.status !== "PENDING" && !latest) {
    return denied(["REVIEW_PENDING_REQUIRED"], role, operatorAuthorized);
  }
  if (
    input.transition.status !== "PENDING" &&
    latest?.status !== "PENDING"
  ) {
    return denied(
      ["TERMINAL_REVIEW_IMMUTABLE"],
      role,
      operatorAuthorized,
    );
  }
  if (
    latest &&
    (latest.evidenceRef !== input.evidenceRef ||
      latest.contentHash !== input.contentHash ||
      latest.role !== role)
  ) {
    return denied(
      ["PERSISTED_RECORD_MISMATCH"],
      role,
      operatorAuthorized,
    );
  }
  if (
    latest &&
    parsedTime(latest.createdAt)! > submittedAt
  ) {
    return denied(["INVALID_REVIEW_SEQUENCE"], role, operatorAuthorized);
  }

  const withoutHash: Omit<
    PathwayPrivateEvidenceOperatorReviewPersistedRecord,
    "recordHash"
  > = {
    recordSource: "SERVER_OPERATOR_REVIEW",
    environment: "PREVIEW",
    evidenceRef: input.evidenceRef,
    contentHash: input.contentHash,
    role,
    status: input.transition.status,
    actorRef: input.operatorAuth.operatorRef!,
    reviewerRef:
      input.transition.status === "PENDING"
        ? null
        : input.operatorAuth.operatorRef!,
    reviewedAt:
      input.transition.status === "PENDING" ? null : input.submittedAt,
    pageReferences: [...input.transition.pageReferences],
    rejectionCode: input.transition.rejectionCode,
    reviewVersion: PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
    revision: latest ? latest.revision + 1 : 1,
    idempotencyKey: input.idempotencyKey,
    requestHash,
    previousRecordHash: latest?.recordHash ?? null,
    createdAt: input.submittedAt,
  };
  const candidate: PathwayPrivateEvidenceOperatorReviewPersistedRecord = {
    ...withoutHash,
    recordHash: digest(recordHashInput(withoutHash)),
  };

  try {
    const persisted = await deps.append(candidate);
    if (
      !validPersistedRecord(persisted.record) ||
      persisted.record.requestHash !== requestHash ||
      persisted.record.recordHash !== candidate.recordHash
    ) {
      return denied(
        ["PERSISTED_RECORD_MISMATCH"],
        role,
        operatorAuthorized,
      );
    }
    return accepted(persisted.created ? "CREATED" : "REPLAYED", persisted.record);
  } catch {
    return denied(["PERSISTENCE_REQUIRED"], role, operatorAuthorized);
  }
};
