import { createHash, randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

import {
  PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION,
  assemblePathwayPrivateEvidencePackage,
  type PathwayPrivateEvidencePackageAssemblyDependencies,
  type PathwayPrivateEvidencePackageAssemblyPersistedRecord,
  type PathwayPrivateEvidencePromotionRecord,
} from "../src/lib/pathway-private-evidence-package-assembly";
import {
  PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
  type PathwayPrivateEvidenceOperatorReviewPersistedRecord,
} from "../src/lib/pathway-private-evidence-operator-review";
import {
  PATHWAY_REAL_SITE_EVIDENCE_VERSION,
  type PathwayRealSiteDocumentRole,
  type PathwayRealSiteEvidencePackage,
} from "../src/lib/pathway-real-site-evidence";

const EXPECTED_REFS = new Set([
  "agent/item74h-pathway-check",
  "integration/item74h-resolution-20260830",
  "integration/item74h-public-da-20260830",
  "agent/item74h-evidence-refinement-20260830",
  "agent/item74h-layout-evidence-20260831",
  "agent/item74h-setback-evidence-20260831",
  "agent/item74h-registered-plan-proof-20260901",
]);
const EXPECTED_NEON_ENDPOINTS = new Set([
  "ep-misty-dream-a7l6wcp8",
  "ep-bold-shadow-a7y8j17d",
  "ep-frosty-star-a7gsaexu",
  "ep-damp-recipe-a7wm9fuq",
  "ep-rapid-shape-a72cicyh",
  "ep-late-sun-a7r48wn4",
  "ep-old-flower-a7swrkp3",
  "ep-twilight-tooth-a75ar21y",
]);
const ENABLE_FLAG = "ITEM74H_EVIDENCE_PACKAGE_ACCEPTANCE_ENABLED";
const PROMOTION_VERSION = "item74h-private-evidence-promotion.v1";
const ROLES: PathwayRealSiteDocumentRole[] = [
  "ROAD_CLASSIFICATION",
  "REGISTERED_CADASTRAL_PLAN",
  "CADASTRAL_SURVEY",
  "PROPOSED_SHED_LAYOUT",
];

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

type PromotionRow = {
  id: string;
  environment: string;
  evidenceRef: string;
  contentHash: string;
  role: string;
  reviewRecordHash: string;
  status: string;
  promotionVersion: string;
  idempotencyKey: string;
  createdAt: Date | string;
};

type AssemblyRow = {
  environment: string;
  packageRef: string;
  assemblyVersion: string;
  status: string;
  documentCount: number;
  reviewSetDigest: string;
  siteEvidenceDigest: string;
  idempotencyKey: string;
  requestHash: string;
  recordHash: string;
  createdAt: Date | string;
};

type ItemRow = {
  role: string;
  evidenceRef: string;
  contentHash: string;
  promotionId: string;
  reviewRecordHash: string;
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

const assertRole = (role: string): PathwayRealSiteDocumentRole => {
  assert(ROLES.includes(role as PathwayRealSiteDocumentRole), "ROW_ROLE");
  return role as PathwayRealSiteDocumentRole;
};

const asReview = (
  row: ReviewRow,
): PathwayPrivateEvidenceOperatorReviewPersistedRecord => {
  assert(row.environment === "PREVIEW", "REVIEW_ENVIRONMENT");
  assert(row.status === "EVIDENCE_VERIFIED", "REVIEW_STATUS");
  assert(Array.isArray(row.pageReferences), "REVIEW_PAGE_REFERENCES");
  return {
    recordSource: "SERVER_OPERATOR_REVIEW",
    environment: "PREVIEW",
    evidenceRef: row.evidenceRef,
    contentHash: row.contentHash,
    role: assertRole(row.role),
    status: "EVIDENCE_VERIFIED",
    actorRef: row.actorRef,
    reviewerRef: row.reviewerRef,
    reviewedAt: row.reviewedAt ? iso(row.reviewedAt) : null,
    pageReferences: row.pageReferences as string[],
    rejectionCode: null,
    reviewVersion: PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
    revision: row.revision,
    idempotencyKey: row.idempotencyKey,
    requestHash: row.requestHash,
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
    createdAt: iso(row.createdAt),
  };
};

const asPromotion = (row: PromotionRow): PathwayPrivateEvidencePromotionRecord => {
  assert(row.environment === "PREVIEW", "PROMOTION_ENVIRONMENT");
  assert(row.status === "READY_FOR_EVIDENCE_PACKAGE", "PROMOTION_STATUS");
  return {
    id: row.id,
    environment: "PREVIEW",
    evidenceRef: row.evidenceRef,
    contentHash: row.contentHash,
    role: assertRole(row.role),
    reviewRecordHash: row.reviewRecordHash,
    status: "READY_FOR_EVIDENCE_PACKAGE",
    promotionVersion: row.promotionVersion,
    idempotencyKey: row.idempotencyKey,
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

const makeDraft = (
  packageRef: string,
  evidenceRefs: Record<PathwayRealSiteDocumentRole, string>,
  hashes: Record<PathwayRealSiteDocumentRole, string>,
  now: number,
): PathwayRealSiteEvidencePackage => {
  const documents = ROLES.map((role) => ({
    role,
    uploadRef: evidenceRefs[role],
    contentHash: hashes[role],
    evidenceStatus: "READY" as const,
    indexingStatus: "READY" as const,
    authority:
      role === "ROAD_CLASSIFICATION"
        ? ("BYRON_SHIRE_COUNCIL" as const)
        : role === "REGISTERED_CADASTRAL_PLAN"
          ? ("NSW_LAND_REGISTRY_SERVICES" as const)
          : role === "CADASTRAL_SURVEY"
            ? ("REGISTERED_SURVEYOR" as const)
            : ("APPLICANT" as const),
    sourceVersion: "synthetic-current",
    sourceReferenceHash: digest("source:" + role + ":" + packageRef),
    issuedAt: new Date(now - 72 * 60 * 60_000).toISOString(),
    retrievedAt: new Date(now - 60 * 60_000).toISOString(),
    staleAt: new Date(now + 24 * 60 * 60_000).toISOString(),
    basisContentHash:
      role === "PROPOSED_SHED_LAYOUT"
        ? hashes.CADASTRAL_SURVEY
        : role === "CADASTRAL_SURVEY"
          ? hashes.REGISTERED_CADASTRAL_PLAN
          : null,
    verification: {
      status: "EVIDENCE_VERIFIED" as const,
      reviewerRef: "x",
      reviewedAt: new Date(now + 60 * 60_000).toISOString(),
      reviewNotesHash: "caller-untrusted",
    },
  }));
  return {
    version: PATHWAY_REAL_SITE_EVIDENCE_VERSION,
    projectRef: packageRef,
    documents,
    roadClassification: {
      category: "OTHER_ROAD",
      sourceRole: "ROAD_CLASSIFICATION",
      sourceReferenceHash: documents[0].sourceReferenceHash,
      matchMethod: "EXPLICIT_BYRON_COUNCIL_CONFIRMATION",
    },
    parcelAreaReconciliation: {
      registeredPlanAreaSqm: 40_000,
      detailSurveyAreaSqm: 39_470,
      resolvedAreaSqm: 40_000,
      resolutionMethod: "REGISTERED_PLAN_CONTROLS",
      registeredPlanSourceRole: "REGISTERED_CADASTRAL_PLAN",
      detailSurveySourceRole: "CADASTRAL_SURVEY",
      registeredPlanPageReference: "sheet-DP1",
      detailSurveyPageReference: "sheet-S1",
    },
    measurements: [
      ["SHED_FOOTPRINT_SQM", 80, "sqm"],
      ["SHED_HEIGHT_M", 3.5, "m"],
      ["ROAD_SETBACK_M", 100, "m"],
      ["SIDE_SETBACK_M", 10, "m"],
      ["REAR_SETBACK_M", 55, "m"],
    ].map(([key, value, unit], index) => ({
      key: key as
        | "SHED_FOOTPRINT_SQM"
        | "SHED_HEIGHT_M"
        | "ROAD_SETBACK_M"
        | "SIDE_SETBACK_M"
        | "REAR_SETBACK_M",
      value: value as number,
      unit: unit as "m" | "sqm",
      sourceRole: "PROPOSED_SHED_LAYOUT" as const,
      pageReference: "sheet-" + (index + 1),
      method:
        index >= 2
          ? ("SURVEY_MEASUREMENT" as const)
          : ("PLAN_DIMENSION" as const),
    })),
  };
};

const cleanup = async (prisma: PrismaClient, prefix: string) => {
  await prisma.$executeRawUnsafe(
    'DELETE FROM "PathwayPrivateEvidencePackageItem" WHERE "assemblyId" IN (SELECT "id" FROM "PathwayPrivateEvidencePackageAssembly" WHERE "packageRef" LIKE $1)',
    prefix + "%",
  );
  await prisma.$executeRawUnsafe(
    'DELETE FROM "PathwayPrivateEvidencePackageAssembly" WHERE "packageRef" LIKE $1',
    prefix + "%",
  );
  await prisma.$executeRawUnsafe(
    'DELETE FROM "PathwayPrivateEvidencePromotion" WHERE "evidenceRef" LIKE $1',
    prefix + "%",
  );
  await prisma.$executeRawUnsafe(
    'DELETE FROM "PathwayPrivateEvidenceOperatorReview" WHERE "evidenceRef" LIKE $1',
    prefix + "%",
  );
};

const counts = async (prisma: PrismaClient, prefix: string) => {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ reviews: bigint; promotions: bigint; assemblies: bigint; items: bigint }>
  >(
    'SELECT (SELECT COUNT(*) FROM "PathwayPrivateEvidenceOperatorReview" WHERE "evidenceRef" LIKE $1)::bigint AS reviews, (SELECT COUNT(*) FROM "PathwayPrivateEvidencePromotion" WHERE "evidenceRef" LIKE $1)::bigint AS promotions, (SELECT COUNT(*) FROM "PathwayPrivateEvidencePackageAssembly" WHERE "packageRef" LIKE $1)::bigint AS assemblies, (SELECT COUNT(*) FROM "PathwayPrivateEvidencePackageItem" WHERE "assemblyId" IN (SELECT "id" FROM "PathwayPrivateEvidencePackageAssembly" WHERE "packageRef" LIKE $1))::bigint AS items',
    prefix + "%",
  );
  return {
    reviews: Number(rows[0]?.reviews ?? 0n),
    promotions: Number(rows[0]?.promotions ?? 0n),
    assemblies: Number(rows[0]?.assemblies ?? 0n),
    items: Number(rows[0]?.items ?? 0n),
  };
};

const dependencies = (
  prisma: PrismaClient,
  draft: PathwayRealSiteEvidencePackage,
  assemblyId: string,
): PathwayPrivateEvidencePackageAssemblyDependencies => {
  const loadByIdempotencyKey = async (idempotencyKey: string) => {
    const assemblies = await prisma.$queryRawUnsafe<AssemblyRow[]>(
      'SELECT * FROM "PathwayPrivateEvidencePackageAssembly" WHERE "idempotencyKey" = $1 LIMIT 1',
      idempotencyKey,
    );
    if (!assemblies[0]) return null;
    const items = await prisma.$queryRawUnsafe<ItemRow[]>(
      'SELECT "role", "evidenceRef", "contentHash", "promotionId", "reviewRecordHash" FROM "PathwayPrivateEvidencePackageItem" WHERE "assemblyId" = $1 ORDER BY "role"',
      assemblyId,
    );
    const row = assemblies[0];
    assert(row.environment === "PREVIEW", "ASSEMBLY_ENVIRONMENT");
    assert(row.status === "READY_FOR_REAL_SITE_ASSESSMENT", "ASSEMBLY_STATUS");
    assert(row.documentCount === 4, "ASSEMBLY_DOCUMENT_COUNT");
    return {
      recordSource: "SERVER_EVIDENCE_PACKAGE_ASSEMBLY" as const,
      environment: "PREVIEW" as const,
      packageRef: row.packageRef,
      assemblyVersion: PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION,
      status: "READY_FOR_REAL_SITE_ASSESSMENT" as const,
      documentCount: 4 as const,
      reviewSetDigest: row.reviewSetDigest,
      siteEvidenceDigest: row.siteEvidenceDigest,
      idempotencyKey: row.idempotencyKey,
      requestHash: row.requestHash,
      recordHash: row.recordHash,
      createdAt: iso(row.createdAt),
      items: items.map((item) => ({
        role: assertRole(item.role),
        evidenceRef: item.evidenceRef,
        contentHash: item.contentHash,
        promotionId: item.promotionId,
        reviewRecordHash: item.reviewRecordHash,
      })),
    };
  };

  return {
    loadPackageDraft: async (packageRef) =>
      packageRef === draft.projectRef ? draft : null,
    loadPromotions: async ({evidenceRefs}) => {
      assert(evidenceRefs.length === 4, "PROMOTION_LOOKUP_SHAPE");
      const rows = await prisma.$queryRawUnsafe<PromotionRow[]>(
        'SELECT * FROM "PathwayPrivateEvidencePromotion" WHERE "evidenceRef" IN ($1, $2, $3, $4) ORDER BY "role"',
        evidenceRefs[0],
        evidenceRefs[1],
        evidenceRefs[2],
        evidenceRefs[3],
      );
      return rows.map(asPromotion);
    },
    loadVerifiedReviews: async (reviewRecordHashes) => {
      assert(reviewRecordHashes.length === 4, "REVIEW_LOOKUP_SHAPE");
      const rows = await prisma.$queryRawUnsafe<ReviewRow[]>(
        'SELECT * FROM "PathwayPrivateEvidenceOperatorReview" WHERE "recordHash" IN ($1, $2, $3, $4) ORDER BY "role"',
        reviewRecordHashes[0],
        reviewRecordHashes[1],
        reviewRecordHashes[2],
        reviewRecordHashes[3],
      );
      return rows.map(asReview);
    },
    loadByIdempotencyKey,
    persist: async (record) => {
      const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        'INSERT INTO "PathwayPrivateEvidencePackageAssembly" ("id", "environment", "packageRef", "assemblyVersion", "status", "documentCount", "reviewSetDigest", "siteEvidenceDigest", "idempotencyKey", "requestHash", "recordHash", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz) ON CONFLICT ("idempotencyKey") DO NOTHING RETURNING "id"',
        assemblyId,
        record.environment,
        record.packageRef,
        record.assemblyVersion,
        record.status,
        record.documentCount,
        record.reviewSetDigest,
        record.siteEvidenceDigest,
        record.idempotencyKey,
        record.requestHash,
        record.recordHash,
        record.createdAt,
      );
      if (!rows[0]) {
        const prior = await loadByIdempotencyKey(record.idempotencyKey);
        assert(prior, "IDEMPOTENT_ASSEMBLY_RELOAD");
        return {created: false, record: prior};
      }
      for (let index = 0; index < record.items.length; index += 1) {
        const item = record.items[index];
        await prisma.$executeRawUnsafe(
          'INSERT INTO "PathwayPrivateEvidencePackageItem" ("id", "assemblyId", "role", "evidenceRef", "contentHash", "promotionId", "reviewRecordHash") VALUES ($1, $2, $3, $4, $5, $6, $7)',
          assemblyId + "_item_" + index,
          assemblyId,
          item.role,
          item.evidenceRef,
          item.contentHash,
          item.promotionId,
          item.reviewRecordHash,
        );
      }
      return {created: true, record};
    },
  };
};

const runAcceptance = async () => {
  if (!enabled(process.env[ENABLE_FLAG])) {
    console.log(JSON.stringify({
      gate: "item74h-evidence-package-preview",
      status: "SKIPPED_FEATURE_DISABLED",
      productionCheckoutEnabled: false,
    }));
    return;
  }

  assertProtectedPreview();
  const prisma = new PrismaClient({log: []});
  const suffix = randomUUID().replaceAll("-", "");
  const prefix = "item74h_package_synth_" + suffix;
  const packageRef = prefix + "_package";
  const operatorRef = "operator_" + suffix;
  const now = Date.now();
  const reviewedAt = new Date(now - 20 * 60_000).toISOString();
  const evaluatedAt = new Date(now).toISOString();
  const evidenceRefs = Object.fromEntries(
    ROLES.map((role) => [role, prefix + "_" + role.toLowerCase()]),
  ) as Record<PathwayRealSiteDocumentRole, string>;
  const hashes = Object.fromEntries(
    ROLES.map((role) => [role, digest(prefix + ":content:" + role)]),
  ) as Record<PathwayRealSiteDocumentRole, string>;
  const reviewHashes = Object.fromEntries(
    ROLES.map((role) => [role, digest(prefix + ":review:" + role)]),
  ) as Record<PathwayRealSiteDocumentRole, string>;
  const draft = makeDraft(packageRef, evidenceRefs, hashes, now);
  const assemblyId = prefix + "_assembly";

  try {
    await cleanup(prisma, prefix);

    for (let index = 0; index < ROLES.length; index += 1) {
      const role = ROLES[index];
      const reviewId = prefix + "_review_" + index;
      const promotionId = prefix + "_promotion_" + index;
      await prisma.$executeRawUnsafe(
        'INSERT INTO "PathwayPrivateEvidenceOperatorReview" ("id", "environment", "evidenceRef", "contentHash", "role", "status", "actorRef", "reviewerRef", "reviewedAt", "pageReferences", "rejectionCode", "reviewVersion", "revision", "idempotencyKey", "requestHash", "recordHash", "previousRecordHash", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18::timestamptz)',
        reviewId,
        "PREVIEW",
        evidenceRefs[role],
        hashes[role],
        role,
        "EVIDENCE_VERIFIED",
        operatorRef,
        operatorRef,
        reviewedAt,
        JSON.stringify(["Sheet " + (index + 1)]),
        null,
        PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
        2,
        prefix + ":review:" + index,
        digest(prefix + ":request:" + role),
        reviewHashes[role],
        digest(prefix + ":pending:" + role),
        reviewedAt,
      );
      await prisma.$executeRawUnsafe(
        'INSERT INTO "PathwayPrivateEvidencePromotion" ("id", "environment", "evidenceRef", "contentHash", "role", "reviewRecordHash", "status", "promotionVersion", "idempotencyKey") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        promotionId,
        "PREVIEW",
        evidenceRefs[role],
        hashes[role],
        role,
        reviewHashes[role],
        "READY_FOR_EVIDENCE_PACKAGE",
        PROMOTION_VERSION,
        prefix + ":promotion:" + index,
      );
    }

    const deps = dependencies(prisma, draft, assemblyId);
    const request = {
      version: PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION,
      environment: "preview" as const,
      featureEnabled: true,
      evaluatedAt,
      operatorAuth: {
        authEnabled: true,
        operatorAuthorized: true,
        operatorRef,
      },
      packageRef,
      idempotencyKey: prefix + ":assembly",
    };
    const created = await assemblePathwayPrivateEvidencePackage(request, deps);
    const replayed = await assemblePathwayPrivateEvidencePackage(request, deps);
    assert(
      created.operation === "CREATED" &&
        created.status === "READY_FOR_REAL_SITE_ASSESSMENT" &&
        created.redactedSummary.acceptedDocumentCount === 4 &&
        created.redactedSummary.realSiteEvidenceConfirmed &&
        !created.redactedSummary.planningControlsPackEligible &&
        !created.redactedSummary.submissionSeeEligible &&
        !created.redactedSummary.productionCheckoutEnabled,
      "ASSEMBLY_CREATE",
    );
    assert(
      replayed.operation === "REPLAYED" &&
        replayed.status === "READY_FOR_REAL_SITE_ASSESSMENT",
      "ASSEMBLY_REPLAY",
    );

    const before = await counts(prisma, prefix);
    assert(
      before.reviews === 4 &&
        before.promotions === 4 &&
        before.assemblies === 1 &&
        before.items === 4,
      "EXACT_PERSISTED_SHAPE",
    );

    await cleanup(prisma, prefix);
    const after = await counts(prisma, prefix);
    assert(
      after.reviews === 0 &&
        after.promotions === 0 &&
        after.assemblies === 0 &&
        after.items === 0,
      "ZERO_RESIDUE",
    );

    console.log(JSON.stringify({
      gate: "item74h-evidence-package-preview",
      status: "PASS",
      environment: "preview",
      syntheticOnly: true,
      exactRoleSetConfirmed: true,
      immutableReviewBindingsConfirmed: true,
      callerVerificationOverridden: true,
      assemblyCreated: true,
      assemblyReplayReused: true,
      persistedDocumentCount: 4,
      realSiteEvidenceConfirmed: true,
      planningControlsPackEligible: false,
      submissionSeeEligible: false,
      productionCheckoutEnabled: false,
      residualReviewRows: 0,
      residualPromotionRows: 0,
      residualAssemblyRows: 0,
      residualItemRows: 0,
      containsSecret: false,
      containsPackageReference: false,
      containsEvidenceReference: false,
      containsContentHash: false,
      containsReviewerReference: false,
      containsPageReference: false,
    }));
  } finally {
    await cleanup(prisma, prefix).catch(() => undefined);
    await prisma.$disconnect();
  }
};

runAcceptance().catch((error) => {
  console.error(JSON.stringify({
    gate: "item74h-evidence-package-preview",
    status: "FAIL",
    stage:
      error instanceof AcceptanceError ? error.stage : "UNCLASSIFIED_ERROR",
    productionCheckoutEnabled: false,
    containsSecret: false,
    containsPackageReference: false,
    containsEvidenceReference: false,
    containsContentHash: false,
  }));
  process.exitCode = 1;
});
