import { createHash, randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

import {
  PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
  recordPathwayPrivateEvidenceOperatorReview,
  type PathwayPrivateEvidenceOperatorReviewDependencies,
  type PathwayPrivateEvidenceOperatorReviewPersistedRecord,
  type PathwayPrivateEvidenceOperatorReviewRejectionCode,
  type PathwayPrivateEvidenceOperatorReviewStatus,
} from "../src/lib/pathway-private-evidence-operator-review";
import {
  PATHWAY_PRIVATE_EVIDENCE_REVIEW_VERSION,
  promotePathwayPrivateEvidence,
} from "../src/lib/pathway-private-evidence-review";
import type { PathwayPrivateEvidenceRole } from "../src/lib/pathway-private-evidence-upload";

const EXPECTED_REFS = new Set([
  "agent/item74h-pathway-check",
  "integration/item74h-resolution-20260830",
  "integration/item74h-public-da-20260830",
  "agent/item74h-evidence-refinement-20260830",
  "agent/item74h-layout-evidence-20260831",
  "agent/item74h-setback-evidence-20260831",
  "agent/item74h-cadastral-provenance-20260901",
]);
const EXPECTED_NEON_ENDPOINTS = new Set([
  "ep-misty-dream-a7l6wcp8",
  "ep-bold-shadow-a7y8j17d",
  "ep-frosty-star-a7gsaexu",
  "ep-damp-recipe-a7wm9fuq",
  "ep-rapid-shape-a72cicyh",
  "ep-late-sun-a7r48wn4",
  "ep-old-flower-a7swrkp3",
]);
const ENABLE_FLAG = "ITEM74H_OPERATOR_REVIEW_ACCEPTANCE_ENABLED";
const PROMOTION_VERSION = "item74h-private-evidence-promotion.v1";

type ReviewRow = {
  environment: string;
  evidenceRef: string;
  contentHash: string;
  role: string;
  status: string;
  actorRef: string;
  reviewerRef: string | null;
  reviewedAt: Date | string | null;
  pageReferences: unknown;
  rejectionCode: string | null;
  reviewVersion: string;
  revision: number;
  idempotencyKey: string;
  requestHash: string;
  recordHash: string;
  previousRecordHash: string | null;
  createdAt: Date | string;
};

class AcceptanceError extends Error {
  constructor(readonly stage: string) {
    super(stage);
  }
}

const enabled = (value: string | undefined) =>
  ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());

const assert: (condition: unknown, stage: string) => asserts condition = (
  condition,
  stage,
) => {
  if (!condition) throw new AcceptanceError(stage);
};

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const iso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const asRecord = (
  row: ReviewRow,
): PathwayPrivateEvidenceOperatorReviewPersistedRecord => {
  assert(row.environment === "PREVIEW", "ROW_ENVIRONMENT");
  assert(
    ["ROAD_CLASSIFICATION", "CADASTRAL_SURVEY", "PROPOSED_SHED_LAYOUT"].includes(
      row.role,
    ),
    "ROW_ROLE",
  );
  assert(
    ["PENDING", "EVIDENCE_VERIFIED", "REJECTED"].includes(row.status),
    "ROW_STATUS",
  );
  assert(Array.isArray(row.pageReferences), "ROW_PAGE_REFERENCES");

  return {
    recordSource: "SERVER_OPERATOR_REVIEW",
    environment: "PREVIEW",
    evidenceRef: row.evidenceRef,
    contentHash: row.contentHash,
    role: row.role as PathwayPrivateEvidenceRole,
    status: row.status as PathwayPrivateEvidenceOperatorReviewStatus,
    actorRef: row.actorRef,
    reviewerRef: row.reviewerRef,
    reviewedAt: row.reviewedAt ? iso(row.reviewedAt) : null,
    pageReferences: row.pageReferences as string[],
    rejectionCode:
      row.rejectionCode as PathwayPrivateEvidenceOperatorReviewRejectionCode | null,
    reviewVersion: PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
    revision: row.revision,
    idempotencyKey: row.idempotencyKey,
    requestHash: row.requestHash,
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
    createdAt: iso(row.createdAt),
  };
};

const assertProtectedPreview = () => {
  assert(process.env.VERCEL === "1", "HOSTED_VERCEL_REQUIRED");
  assert(process.env.VERCEL_ENV === "preview", "PREVIEW_ONLY");
  assert(
    EXPECTED_REFS.has(process.env.VERCEL_GIT_COMMIT_REF ?? ""),
    "PROTECTED_BRANCH_REQUIRED",
  );
  assert(
    !enabled(process.env.PLANNING_PACK_CHECKOUT_ENABLED),
    "PLANNING_PACK_CHECKOUT_MUST_BE_DISABLED",
  );
  assert(
    !enabled(process.env.SUBMISSION_SEE_CHECKOUT_ENABLED),
    "SUBMISSION_SEE_CHECKOUT_MUST_BE_DISABLED",
  );

  const databaseUrl = process.env.DATABASE_URL;
  assert(databaseUrl, "DATABASE_URL_REQUIRED");
  let host = "";
  try {
    host = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new AcceptanceError("DATABASE_URL_INVALID");
  }
  assert(
    [...EXPECTED_NEON_ENDPOINTS].some((endpoint) => host.startsWith(endpoint)) && host.endsWith(".neon.tech"),
    "ISOLATED_PREVIEW_DATABASE_REQUIRED",
  );
};

const cleanup = async (prisma: PrismaClient, prefix: string) => {
  await prisma.$executeRawUnsafe(
    'DELETE FROM "PathwayPrivateEvidencePromotion" WHERE "evidenceRef" LIKE $1',
    prefix + "%",
  );
  await prisma.$executeRawUnsafe(
    'DELETE FROM "PathwayPrivateEvidenceOperatorReview" WHERE "evidenceRef" LIKE $1',
    prefix + "%",
  );
};

const residualCounts = async (prisma: PrismaClient, prefix: string) => {
  const reviews = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    'SELECT COUNT(*)::bigint AS count FROM "PathwayPrivateEvidenceOperatorReview" WHERE "evidenceRef" LIKE $1',
    prefix + "%",
  );
  const promotions = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    'SELECT COUNT(*)::bigint AS count FROM "PathwayPrivateEvidencePromotion" WHERE "evidenceRef" LIKE $1',
    prefix + "%",
  );
  return {
    reviews: Number(reviews[0]?.count ?? 0n),
    promotions: Number(promotions[0]?.count ?? 0n),
  };
};

const dependencies = (
  prisma: PrismaClient,
): PathwayPrivateEvidenceOperatorReviewDependencies => {
  const loadByIdempotencyKey = async (idempotencyKey: string) => {
    const rows = await prisma.$queryRawUnsafe<ReviewRow[]>(
      'SELECT * FROM "PathwayPrivateEvidenceOperatorReview" WHERE "idempotencyKey" = $1 LIMIT 1',
      idempotencyKey,
    );
    return rows[0] ? asRecord(rows[0]) : null;
  };

  const loadLatest = async ({
    evidenceRef,
    contentHash,
  }: {
    evidenceRef: string;
    contentHash: string;
  }) => {
    const rows = await prisma.$queryRawUnsafe<ReviewRow[]>(
      'SELECT * FROM "PathwayPrivateEvidenceOperatorReview" WHERE "evidenceRef" = $1 AND "contentHash" = $2 ORDER BY "revision" DESC LIMIT 1',
      evidenceRef,
      contentHash,
    );
    return rows[0] ? asRecord(rows[0]) : null;
  };

  return {
    loadByIdempotencyKey,
    loadLatest,
    append: async (record) => {
      const rows = await prisma.$queryRawUnsafe<ReviewRow[]>(
        'INSERT INTO "PathwayPrivateEvidenceOperatorReview" ("id", "environment", "evidenceRef", "contentHash", "role", "status", "actorRef", "reviewerRef", "reviewedAt", "pageReferences", "rejectionCode", "reviewVersion", "revision", "idempotencyKey", "requestHash", "recordHash", "previousRecordHash", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18::timestamptz) ON CONFLICT ("idempotencyKey") DO NOTHING RETURNING *',
        "review_" + randomUUID().replaceAll("-", ""),
        record.environment,
        record.evidenceRef,
        record.contentHash,
        record.role,
        record.status,
        record.actorRef,
        record.reviewerRef,
        record.reviewedAt,
        JSON.stringify(record.pageReferences),
        record.rejectionCode,
        record.reviewVersion,
        record.revision,
        record.idempotencyKey,
        record.requestHash,
        record.recordHash,
        record.previousRecordHash,
        record.createdAt,
      );
      if (rows[0]) return { created: true, record: asRecord(rows[0]) };
      const existing = await loadByIdempotencyKey(record.idempotencyKey);
      assert(existing, "IDEMPOTENT_RECORD_RELOAD");
      return { created: false, record: existing };
    },
  };
};

const runAcceptance = async () => {
  if (!enabled(process.env[ENABLE_FLAG])) {
    console.log(
      JSON.stringify({
        gate: "item74h-operator-review-preview",
        status: "SKIPPED_FEATURE_DISABLED",
        productionCheckoutEnabled: false,
      }),
    );
    return;
  }

  assertProtectedPreview();
  const prisma = new PrismaClient({ log: [] });
  const suffix = randomUUID().replaceAll("-", "");
  const prefix = "item74h_synth_" + suffix;
  const evidenceRef = prefix + "_evidence";
  const contentHash = digest(prefix + ":content");
  const operatorRef = "operator_" + suffix;
  const deps = dependencies(prisma);
  const now = Date.now();
  const pendingAt = new Date(now - 50 * 60_000).toISOString();
  const verifiedAt = new Date(now - 30 * 60_000).toISOString();

  try {
    await cleanup(prisma, prefix);

    const pendingInput = {
      version: PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
      environment: "preview" as const,
      featureEnabled: true,
      submittedAt: pendingAt,
      operatorAuth: {
        authEnabled: true,
        operatorAuthorized: true,
        operatorRef,
      },
      evidenceRef,
      contentHash,
      role: "CADASTRAL_SURVEY" as const,
      idempotencyKey: prefix + ":pending",
      transition: {
        status: "PENDING" as const,
        pageReferences: [] as [],
        rejectionCode: null,
      },
    };
    const pendingCreated =
      await recordPathwayPrivateEvidenceOperatorReview(pendingInput, deps);
    const pendingReplay =
      await recordPathwayPrivateEvidenceOperatorReview(pendingInput, deps);
    assert(
      pendingCreated.operation === "CREATED" &&
        pendingCreated.reviewStatus === "PENDING" &&
        pendingReplay.operation === "REPLAYED",
      "PENDING_CREATE_REPLAY",
    );

    const verifiedInput = {
      ...pendingInput,
      submittedAt: verifiedAt,
      idempotencyKey: prefix + ":verified",
      transition: {
        status: "EVIDENCE_VERIFIED" as const,
        pageReferences: ["Sheet 1", "Page 2"],
        rejectionCode: null,
      },
    };
    const verifiedCreated =
      await recordPathwayPrivateEvidenceOperatorReview(verifiedInput, deps);
    const verifiedReplay =
      await recordPathwayPrivateEvidenceOperatorReview(verifiedInput, deps);
    assert(
      verifiedCreated.operation === "CREATED" &&
        verifiedCreated.reviewStatus === "EVIDENCE_VERIFIED" &&
        verifiedCreated.readyForEvidencePackagePromotion &&
        verifiedReplay.operation === "REPLAYED",
      "VERIFIED_CREATE_REPLAY",
    );

    const terminalAttempt =
      await recordPathwayPrivateEvidenceOperatorReview(
        {
          ...pendingInput,
          submittedAt: new Date(now - 20 * 60_000).toISOString(),
          idempotencyKey: prefix + ":late-rejection",
          transition: {
            status: "REJECTED",
            pageReferences: [] as [],
            rejectionCode: "MEASUREMENTS_UNVERIFIABLE",
          },
        },
        deps,
      );
    assert(
      terminalAttempt.blockers.includes("TERMINAL_REVIEW_IMMUTABLE"),
      "TERMINAL_IMMUTABILITY",
    );

    const latest = await deps.loadLatest({ evidenceRef, contentHash });
    assert(
      latest?.status === "EVIDENCE_VERIFIED",
      "VERIFIED_RECORD_RELOAD",
    );

    const markReadyForEvidencePackage = async () => {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "PathwayPrivateEvidencePromotion" ("id", "environment", "evidenceRef", "contentHash", "role", "reviewRecordHash", "status", "promotionVersion", "idempotencyKey") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT ("idempotencyKey") DO NOTHING',
        "promotion_" + suffix,
        "PREVIEW",
        evidenceRef,
        contentHash,
        "CADASTRAL_SURVEY",
        latest.recordHash,
        "READY_FOR_EVIDENCE_PACKAGE",
        PROMOTION_VERSION,
        prefix + ":promotion",
      );
    };

    const evaluatedAt = new Date(now).toISOString();
    const promotionDeps = {
      loadEvidence: async () => ({
        evidenceRef,
        role: "CADASTRAL_SURVEY" as const,
        contentHash,
        storageAccess: "private" as const,
        quarantineStatus: "QUARANTINED" as const,
      }),
      loadSecurityScan: async () => ({
        recordSource: "SERVER_SECURITY_SCAN" as const,
        evidenceRef,
        contentHash,
        status: "CLEAN" as const,
        scannerEngine: "clamav",
        engineVersion: "1.4.3",
        definitionVersion: "current",
        scannerSnapshotRef: "snapshot_" + suffix,
        snapshotCreatedAt: new Date(now - 90 * 60_000).toISOString(),
        definitionsRetrievedAt: new Date(now - 120 * 60_000).toISOString(),
        scannedAt: new Date(now - 60 * 60_000).toISOString(),
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
      }),
      loadOperatorReview: async () => ({
        recordSource: "SERVER_OPERATOR_REVIEW" as const,
        evidenceRef,
        contentHash,
        status: "EVIDENCE_VERIFIED" as const,
        reviewerRef: latest.reviewerRef,
        reviewedAt: latest.reviewedAt,
        pageReferences: latest.pageReferences,
      }),
      markReadyForEvidencePackage,
    };

    const promotionCreated = await promotePathwayPrivateEvidence(
      {
        version: PATHWAY_PRIVATE_EVIDENCE_REVIEW_VERSION,
        environment: "preview",
        featureEnabled: true,
        evaluatedAt,
        operatorAuth: {
          authEnabled: true,
          operatorAuthorized: true,
          operatorRef,
        },
        evidenceRef,
      },
      promotionDeps,
    );
    const promotionReplay = await promotePathwayPrivateEvidence(
      {
        version: PATHWAY_PRIVATE_EVIDENCE_REVIEW_VERSION,
        environment: "preview",
        featureEnabled: true,
        evaluatedAt,
        operatorAuth: {
          authEnabled: true,
          operatorAuthorized: true,
          operatorRef,
        },
        evidenceRef,
      },
      promotionDeps,
    );
    assert(
      promotionCreated.status === "READY_FOR_EVIDENCE_PACKAGE" &&
        promotionCreated.evidencePackageCandidate &&
        promotionReplay.status === "READY_FOR_EVIDENCE_PACKAGE",
      "PROMOTION_CREATE_REPLAY",
    );

    const beforeCleanup = await residualCounts(prisma, prefix);
    assert(
      beforeCleanup.reviews === 2 && beforeCleanup.promotions === 1,
      "EXACT_PERSISTED_SHAPE",
    );

    await cleanup(prisma, prefix);
    const afterCleanup = await residualCounts(prisma, prefix);
    assert(
      afterCleanup.reviews === 0 && afterCleanup.promotions === 0,
      "ZERO_RESIDUE",
    );

    console.log(
      JSON.stringify({
        gate: "item74h-operator-review-preview",
        status: "PASS",
        environment: "preview",
        syntheticOnly: true,
        pendingCreated: true,
        pendingReplayReused: true,
        verifiedCreated: true,
        verifiedReplayReused: true,
        terminalDecisionImmutable: true,
        promotionPersisted: true,
        promotionReplayReused: true,
        evidencePackageCandidate: true,
        planningControlsPackEligible: false,
        submissionSeeEligible: false,
        productionCheckoutEnabled: false,
        residualReviewRows: 0,
        residualPromotionRows: 0,
        containsSecret: false,
        containsEvidenceReference: false,
        containsContentHash: false,
        containsReviewerReference: false,
        containsPageReference: false,
      }),
    );
  } finally {
    await cleanup(prisma, prefix).catch(() => undefined);
    await prisma.$disconnect();
  }
};

runAcceptance().catch((error) => {
  console.error(
    JSON.stringify({
      gate: "item74h-operator-review-preview",
      status: "FAIL",
      stage:
        error instanceof AcceptanceError ? error.stage : "UNCLASSIFIED_ERROR",
      productionCheckoutEnabled: false,
      containsSecret: false,
      containsEvidenceReference: false,
      containsContentHash: false,
    }),
  );
  process.exitCode = 1;
});
