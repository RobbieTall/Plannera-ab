import { createHash } from "node:crypto";

import {
  assessPathwayRealSiteEvidence,
  type PathwayRealSiteDocument,
  type PathwayRealSiteDocumentRole,
  type PathwayRealSiteEvidencePackage,
} from "./pathway-real-site-evidence";
import type { PathwayPrivateEvidenceOperatorReviewPersistedRecord } from "./pathway-private-evidence-operator-review";

export const PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION =
  "item74h-private-evidence-package-assembly.v1" as const;

export type PathwayPrivateEvidencePackageAssemblyBlocker =
  | "PREVIEW_ONLY"
  | "FEATURE_DISABLED"
  | "OPERATOR_AUTH_REQUIRED"
  | "UNSUPPORTED_FIELD"
  | "OPAQUE_PACKAGE_REF_REQUIRED"
  | "IDEMPOTENCY_KEY_REQUIRED"
  | "INVALID_EVALUATION_TIME"
  | "AUTHORITATIVE_PACKAGE_RECORDS_REQUIRED"
  | "DOCUMENT_ROLE_SET_INCOMPLETE"
  | "PROMOTION_RECORD_MISMATCH"
  | "OPERATOR_REVIEW_RECORD_MISMATCH"
  | "REAL_SITE_EVIDENCE_NOT_CONFIRMED"
  | "IDEMPOTENCY_CONFLICT"
  | "PERSISTED_RECORD_MISMATCH"
  | "PERSISTENCE_REQUIRED";

export type PathwayPrivateEvidencePackageAssemblyInput = {
  version: typeof PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION;
  environment: "preview" | "production" | "development";
  featureEnabled: boolean;
  evaluatedAt: string;
  operatorAuth: {
    authEnabled: boolean;
    operatorAuthorized: boolean;
    operatorRef: string | null;
  };
  packageRef: string;
  idempotencyKey: string;
};

export type PathwayPrivateEvidencePromotionRecord = {
  id: string;
  environment: "PREVIEW";
  evidenceRef: string;
  contentHash: string;
  role: PathwayRealSiteDocumentRole;
  reviewRecordHash: string;
  status: "READY_FOR_EVIDENCE_PACKAGE";
  promotionVersion: string;
  idempotencyKey: string;
  createdAt: string;
};

export type PathwayPrivateEvidencePackageItemRecord = {
  role: PathwayRealSiteDocumentRole;
  evidenceRef: string;
  contentHash: string;
  promotionId: string;
  reviewRecordHash: string;
};

export type PathwayPrivateEvidencePackageAssemblyPersistedRecord = {
  recordSource: "SERVER_EVIDENCE_PACKAGE_ASSEMBLY";
  environment: "PREVIEW";
  packageRef: string;
  assemblyVersion: typeof PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION;
  status: "READY_FOR_REAL_SITE_ASSESSMENT";
  documentCount: 3;
  reviewSetDigest: string;
  siteEvidenceDigest: string;
  idempotencyKey: string;
  requestHash: string;
  recordHash: string;
  createdAt: string;
  items: PathwayPrivateEvidencePackageItemRecord[];
};

export type PathwayPrivateEvidencePackageAssemblyDependencies = {
  loadPackageDraft: (
    packageRef: string,
  ) => Promise<PathwayRealSiteEvidencePackage | null>;
  loadPromotions: (input: {
    packageRef: string;
    evidenceRefs: string[];
  }) => Promise<PathwayPrivateEvidencePromotionRecord[]>;
  loadVerifiedReviews: (
    reviewRecordHashes: string[],
  ) => Promise<PathwayPrivateEvidenceOperatorReviewPersistedRecord[]>;
  loadByIdempotencyKey: (
    idempotencyKey: string,
  ) => Promise<PathwayPrivateEvidencePackageAssemblyPersistedRecord | null>;
  persist: (
    record: PathwayPrivateEvidencePackageAssemblyPersistedRecord,
  ) => Promise<{
    created: boolean;
    record: PathwayPrivateEvidencePackageAssemblyPersistedRecord;
  }>;
};

export type PathwayPrivateEvidencePackageAssemblyResult = {
  version: typeof PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION;
  operation: "CREATED" | "REPLAYED" | "DENIED";
  status: "READY_FOR_REAL_SITE_ASSESSMENT" | "BLOCKED";
  blockers: PathwayPrivateEvidencePackageAssemblyBlocker[];
  redactedSummary: {
    acceptedDocumentCount: number;
    acceptedRoles: PathwayRealSiteDocumentRole[];
    realSiteEvidenceConfirmed: boolean;
    containsPackageReference: false;
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
  "evaluatedAt",
  "operatorAuth",
  "packageRef",
  "idempotencyKey",
]);
const AUTH_KEYS = new Set([
  "authEnabled",
  "operatorAuthorized",
  "operatorRef",
]);
const REQUIRED_ROLES: PathwayRealSiteDocumentRole[] = [
  "ROAD_CLASSIFICATION",
  "CADASTRAL_SURVEY",
  "PROPOSED_SHED_LAYOUT",
];
const SHA256 = /^[a-f0-9]{64}$/;
const OPAQUE_REF = /^[A-Za-z0-9_-]{8,160}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9:_-]{8,200}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
};

const digest = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");

const unknownKeys = (value: unknown, allowed: Set<string>) =>
  isRecord(value)
    ? Object.keys(value).filter((key) => !allowed.has(key))
    : ["<not-an-object>"];

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const baseSummary = (
  acceptedRoles: PathwayRealSiteDocumentRole[] = [],
  confirmed = false,
): PathwayPrivateEvidencePackageAssemblyResult["redactedSummary"] => ({
  acceptedDocumentCount: acceptedRoles.length,
  acceptedRoles,
  realSiteEvidenceConfirmed: confirmed,
  containsPackageReference: false,
  containsEvidenceReference: false,
  containsContentHash: false,
  containsReviewerReference: false,
  containsPageReference: false,
  planningControlsPackEligible: false,
  submissionSeeEligible: false,
  productionCheckoutEnabled: false,
});

const denied = (
  blockers: PathwayPrivateEvidencePackageAssemblyBlocker[],
  acceptedRoles: PathwayRealSiteDocumentRole[] = [],
): PathwayPrivateEvidencePackageAssemblyResult => ({
  version: PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION,
  operation: "DENIED",
  status: "BLOCKED",
  blockers: unique(blockers),
  redactedSummary: baseSummary(acceptedRoles),
});

const persistedHash = (
  record: PathwayPrivateEvidencePackageAssemblyPersistedRecord,
) =>
  digest({
    recordSource: record.recordSource,
    environment: record.environment,
    packageRef: record.packageRef,
    assemblyVersion: record.assemblyVersion,
    status: record.status,
    documentCount: record.documentCount,
    reviewSetDigest: record.reviewSetDigest,
    siteEvidenceDigest: record.siteEvidenceDigest,
    idempotencyKey: record.idempotencyKey,
    requestHash: record.requestHash,
    createdAt: record.createdAt,
    items: record.items,
  });

const samePersistedRecord = (
  left: PathwayPrivateEvidencePackageAssemblyPersistedRecord,
  right: PathwayPrivateEvidencePackageAssemblyPersistedRecord,
) => digest(left) === digest(right);

const replayResult = (
  record: PathwayPrivateEvidencePackageAssemblyPersistedRecord,
): PathwayPrivateEvidencePackageAssemblyResult => ({
  version: PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION,
  operation: "REPLAYED",
  status: "READY_FOR_REAL_SITE_ASSESSMENT",
  blockers: [],
  redactedSummary: baseSummary(
    record.items.map((item) => item.role),
    true,
  ),
});

export const assemblePathwayPrivateEvidencePackage = async (
  input: PathwayPrivateEvidencePackageAssemblyInput,
  dependencies: PathwayPrivateEvidencePackageAssemblyDependencies,
): Promise<PathwayPrivateEvidencePackageAssemblyResult> => {
  const blockers: PathwayPrivateEvidencePackageAssemblyBlocker[] = [];

  if (unknownKeys(input, INPUT_KEYS).length) blockers.push("UNSUPPORTED_FIELD");
  if (unknownKeys(input.operatorAuth, AUTH_KEYS).length) {
    blockers.push("UNSUPPORTED_FIELD");
  }
  if (input.version !== PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION) {
    blockers.push("UNSUPPORTED_FIELD");
  }
  if (input.environment !== "preview") blockers.push("PREVIEW_ONLY");
  if (!input.featureEnabled) blockers.push("FEATURE_DISABLED");
  if (
    !input.operatorAuth.authEnabled ||
    !input.operatorAuth.operatorAuthorized ||
    !input.operatorAuth.operatorRef ||
    !OPAQUE_REF.test(input.operatorAuth.operatorRef)
  ) {
    blockers.push("OPERATOR_AUTH_REQUIRED");
  }
  if (!OPAQUE_REF.test(input.packageRef)) {
    blockers.push("OPAQUE_PACKAGE_REF_REQUIRED");
  }
  if (!IDEMPOTENCY_KEY.test(input.idempotencyKey)) {
    blockers.push("IDEMPOTENCY_KEY_REQUIRED");
  }

  const evaluatedAtMs = Date.parse(input.evaluatedAt);
  if (!Number.isFinite(evaluatedAtMs)) blockers.push("INVALID_EVALUATION_TIME");
  if (blockers.length) return denied(blockers);

  const requestHash = digest({
    version: input.version,
    environment: input.environment,
    evaluatedAt: input.evaluatedAt,
    operatorRef: input.operatorAuth.operatorRef,
    packageRef: input.packageRef,
    idempotencyKey: input.idempotencyKey,
  });

  const prior = await dependencies.loadByIdempotencyKey(input.idempotencyKey);
  if (prior) {
    if (prior.requestHash !== requestHash) {
      return denied(["IDEMPOTENCY_CONFLICT"]);
    }
    if (prior.recordHash !== persistedHash(prior)) {
      return denied(["PERSISTED_RECORD_MISMATCH"]);
    }
    return replayResult(prior);
  }

  const packageDraft = await dependencies.loadPackageDraft(input.packageRef);
  if (!packageDraft || packageDraft.projectRef !== input.packageRef) {
    return denied(["AUTHORITATIVE_PACKAGE_RECORDS_REQUIRED"]);
  }

  const documents = Array.isArray(packageDraft.documents)
    ? packageDraft.documents
    : [];
  const roles = documents
    .map((document) => document.role)
    .filter((role): role is PathwayRealSiteDocumentRole =>
      REQUIRED_ROLES.includes(role),
    );
  const exactRoleSet =
    documents.length === REQUIRED_ROLES.length &&
    REQUIRED_ROLES.every(
      (role) => documents.filter((document) => document.role === role).length === 1,
    );
  if (!exactRoleSet) return denied(["DOCUMENT_ROLE_SET_INCOMPLETE"], unique(roles));

  const promotions = await dependencies.loadPromotions({
    packageRef: input.packageRef,
    evidenceRefs: documents.map((document) => document.uploadRef),
  });
  if (promotions.length !== REQUIRED_ROLES.length) {
    return denied(["PROMOTION_RECORD_MISMATCH"]);
  }

  const promotionByRole = new Map(
    promotions.map((promotion) => [promotion.role, promotion] as const),
  );
  for (const document of documents) {
    const promotion = promotionByRole.get(document.role);
    if (
      !promotion ||
      promotion.environment !== "PREVIEW" ||
      promotion.status !== "READY_FOR_EVIDENCE_PACKAGE" ||
      promotion.evidenceRef !== document.uploadRef ||
      promotion.contentHash !== document.contentHash ||
      promotion.role !== document.role ||
      !SHA256.test(promotion.reviewRecordHash)
    ) {
      return denied(["PROMOTION_RECORD_MISMATCH"]);
    }
  }

  const reviews = await dependencies.loadVerifiedReviews(
    promotions.map((promotion) => promotion.reviewRecordHash),
  );
  if (reviews.length !== REQUIRED_ROLES.length) {
    return denied(["OPERATOR_REVIEW_RECORD_MISMATCH"]);
  }
  const reviewByHash = new Map(
    reviews.map((review) => [review.recordHash, review] as const),
  );

  const authoritativeDocuments: PathwayRealSiteDocument[] = [];
  const items: PathwayPrivateEvidencePackageItemRecord[] = [];
  for (const document of documents) {
    const promotion = promotionByRole.get(document.role)!;
    const review = reviewByHash.get(promotion.reviewRecordHash);
    if (
      !review ||
      review.environment !== "PREVIEW" ||
      review.status !== "EVIDENCE_VERIFIED" ||
      review.evidenceRef !== document.uploadRef ||
      review.contentHash !== document.contentHash ||
      review.role !== document.role ||
      !review.reviewerRef ||
      !OPAQUE_REF.test(review.reviewerRef) ||
      !review.reviewedAt ||
      !SHA256.test(review.recordHash)
    ) {
      return denied(["OPERATOR_REVIEW_RECORD_MISMATCH"]);
    }
    authoritativeDocuments.push({
      ...document,
      verification: {
        status: "EVIDENCE_VERIFIED",
        reviewerRef: review.reviewerRef,
        reviewedAt: review.reviewedAt,
        reviewNotesHash: digest({
          recordHash: review.recordHash,
          pageReferences: review.pageReferences,
          rejectionCode: review.rejectionCode,
        }),
      },
    });
    items.push({
      role: document.role,
      evidenceRef: document.uploadRef,
      contentHash: document.contentHash,
      promotionId: promotion.id,
      reviewRecordHash: review.recordHash,
    });
  }

  const assessment = assessPathwayRealSiteEvidence(
    {...packageDraft, documents: authoritativeDocuments},
    new Date(evaluatedAtMs),
  );
  if (
    assessment.status !== "EVIDENCE_CONFIRMED" ||
    !assessment.confirmedEvidence
  ) {
    return denied(["REAL_SITE_EVIDENCE_NOT_CONFIRMED"], REQUIRED_ROLES);
  }

  const normalizedItems = [...items].sort((left, right) =>
    left.role.localeCompare(right.role),
  );
  const createdAt = new Date(evaluatedAtMs).toISOString();
  const recordWithoutHash = {
    recordSource: "SERVER_EVIDENCE_PACKAGE_ASSEMBLY" as const,
    environment: "PREVIEW" as const,
    packageRef: input.packageRef,
    assemblyVersion: PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION,
    status: "READY_FOR_REAL_SITE_ASSESSMENT" as const,
    documentCount: 3 as const,
    reviewSetDigest: digest(
      normalizedItems.map((item) => item.reviewRecordHash),
    ),
    siteEvidenceDigest: assessment.confirmedEvidence.siteEvidenceDigest,
    idempotencyKey: input.idempotencyKey,
    requestHash,
    createdAt,
    items: normalizedItems,
  };
  const proposed: PathwayPrivateEvidencePackageAssemblyPersistedRecord = {
    ...recordWithoutHash,
    recordHash: digest(recordWithoutHash),
  };

  let persisted:
    | {
        created: boolean;
        record: PathwayPrivateEvidencePackageAssemblyPersistedRecord;
      }
    | undefined;
  try {
    persisted = await dependencies.persist(proposed);
  } catch {
    return denied(["PERSISTENCE_REQUIRED"], REQUIRED_ROLES);
  }
  if (!persisted || !samePersistedRecord(persisted.record, proposed)) {
    return denied(["PERSISTED_RECORD_MISMATCH"], REQUIRED_ROLES);
  }

  return {
    version: PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION,
    operation: persisted.created ? "CREATED" : "REPLAYED",
    status: "READY_FOR_REAL_SITE_ASSESSMENT",
    blockers: [],
    redactedSummary: baseSummary(REQUIRED_ROLES, true),
  };
};
