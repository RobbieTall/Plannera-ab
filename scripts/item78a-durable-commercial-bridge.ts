import { createHash } from "node:crypto";

import {
  Prisma,
  PrismaClient,
  type PathwayPrivateEvidenceOperatorReview,
} from "@prisma/client";

import {
  ITEM78A_DURABLE_COMMERCIAL_BRIDGE_VERSION,
  summarizeItem78aDurableCommercialBridge,
  type Item78aDurableCommercialBridgeFacts,
} from "../src/lib/item78a-durable-commercial-bridge";
import {
  PATHWAY_PRIVATE_EVIDENCE_INTAKE_VERSION,
  intakePathwayPrivateEvidence,
} from "../src/lib/pathway-private-evidence-intake";
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
import {
  PATHWAY_PRIVATE_EVIDENCE_SCAN_VERSION,
  evaluatePathwayPrivateEvidenceScan,
} from "../src/lib/pathway-private-evidence-scan";
import { PLANNING_CONTROLS_PACK_TERMS } from "../src/lib/planning-pack-commerce";
import {
  normalizePurchaseProposal,
} from "../src/lib/purchase-entitlements";
import {
  REQUIRED_SUBMISSION_SEE_SECTIONS,
  assessSubmissionSee,
  type SubmissionSeeCandidate,
} from "../src/lib/submission-see-acceptance";
import {
  buildSubmissionSeeScope,
  submissionSeeScopeKey,
  SUBMISSION_SEE_COMMERCIAL_TERMS,
  SubmissionSeeCreditError,
} from "../src/lib/submission-see-credit";
import { SubmissionSeeCreditPersistenceService } from "../src/lib/submission-see-credit-persistence";
import {
  renderWorkingSeeOutputs,
  type WorkingSeeRenderContext,
} from "../src/lib/submission-see-renderer";
import {
  runStripeTestAcceptance,
  validateAcceptanceConfiguration,
} from "../src/lib/stripe-test-acceptance";

const ENABLE_FLAG = "ITEM78A_DURABLE_BRIDGE_ACCEPTANCE_ENABLED";
const PROMOTION_VERSION = "item74h-private-evidence-promotion.v1";

type Stage =
  | "configuration"
  | "stripe_paid_source"
  | "paid_scope"
  | "evidence_intake"
  | "evidence_scan"
  | "operator_review"
  | "credit"
  | "working_see"
  | "working_see_render"
  | "working_see_persist"
  | "replay"
  | "cleanup"
  | "unhandled";

class BridgeFailure extends Error {
  constructor(readonly stage: Stage) {
    super(stage);
  }
}

const assert: (condition: unknown, stage: Stage) => asserts condition = (
  condition,
  stage,
) => {
  if (!condition) throw new BridgeFailure(stage);
};

const sha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const enabled = (value: string | undefined) =>
  value?.trim().toLowerCase() === "true";

function assertProtectedPreview() {
  assert(enabled(process.env[ENABLE_FLAG]), "configuration");
  assert(process.env.VERCEL === "1", "configuration");
  assert(process.env.VERCEL_ENV === "preview", "configuration");
  assert(process.env.GITHUB_REF_NAME !== "main", "configuration");
  assert(
    process.env.VERCEL_GIT_COMMIT_REF === process.env.GITHUB_REF_NAME,
    "configuration",
  );
  assert(
    process.env.VERCEL_GIT_COMMIT_SHA === process.env.GITHUB_SHA &&
      process.env.ITEM74H_WORKFLOW_AUTHORIZED_COMMIT === process.env.GITHUB_SHA,
    "configuration",
  );
  assert(
    !enabled(process.env.PLANNING_PACK_CHECKOUT_ENABLED) &&
      !enabled(process.env.SUBMISSION_SEE_CHECKOUT_ENABLED),
    "configuration",
  );

  const databaseUrl = process.env.DATABASE_URL;
  assert(databaseUrl, "configuration");
  let databaseHost: string;
  try {
    databaseHost = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new BridgeFailure("configuration");
  }
  const endpoint = databaseHost.split(".")[0]?.replace(/-pooler$/, "");
  assert(
    databaseHost.endsWith(".neon.tech") &&
      endpoint === process.env.ITEM74H_AUTHORIZED_DATABASE_TARGET,
    "configuration",
  );
}

function asReviewRecord(
  row: PathwayPrivateEvidenceOperatorReview,
): PathwayPrivateEvidenceOperatorReviewPersistedRecord {
  assert(Array.isArray(row.pageReferences), "operator_review");
  return {
    recordSource: "SERVER_OPERATOR_REVIEW",
    environment: "PREVIEW",
    evidenceRef: row.evidenceRef,
    contentHash: row.contentHash,
    role: row.role as "CADASTRAL_SURVEY",
    status: row.status as PathwayPrivateEvidenceOperatorReviewStatus,
    actorRef: row.actorRef,
    reviewerRef: row.reviewerRef,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    pageReferences: row.pageReferences as string[],
    rejectionCode:
      row.rejectionCode as PathwayPrivateEvidenceOperatorReviewRejectionCode | null,
    reviewVersion: PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
    revision: row.revision,
    idempotencyKey: row.idempotencyKey,
    requestHash: row.requestHash,
    recordHash: row.recordHash,
    previousRecordHash: row.previousRecordHash,
    createdAt: row.createdAt.toISOString(),
  };
}

function reviewDependencies(
  prisma: PrismaClient,
): PathwayPrivateEvidenceOperatorReviewDependencies {
  const loadByIdempotencyKey = async (idempotencyKey: string) => {
    const row = await prisma.pathwayPrivateEvidenceOperatorReview.findUnique({
      where: { idempotencyKey },
    });
    return row ? asReviewRecord(row) : null;
  };
  const loadLatest = async (input: {
    evidenceRef: string;
    contentHash: string;
  }) => {
    const row = await prisma.pathwayPrivateEvidenceOperatorReview.findFirst({
      where: input,
      orderBy: { revision: "desc" },
    });
    return row ? asReviewRecord(row) : null;
  };

  return {
    loadByIdempotencyKey,
    loadLatest,
    append: async (record) => {
      try {
        const created =
          await prisma.pathwayPrivateEvidenceOperatorReview.create({
            data: {
              id: `review_${sha256(record.recordHash).slice(0, 28)}`,
              environment: record.environment,
              evidenceRef: record.evidenceRef,
              contentHash: record.contentHash,
              role: record.role,
              status: record.status,
              actorRef: record.actorRef,
              reviewerRef: record.reviewerRef,
              reviewedAt: record.reviewedAt
                ? new Date(record.reviewedAt)
                : null,
              pageReferences: record.pageReferences,
              rejectionCode: record.rejectionCode,
              reviewVersion: record.reviewVersion,
              revision: record.revision,
              idempotencyKey: record.idempotencyKey,
              requestHash: record.requestHash,
              recordHash: record.recordHash,
              previousRecordHash: record.previousRecordHash,
              createdAt: new Date(record.createdAt),
            },
          });
        return { created: true, record: asReviewRecord(created) };
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        ) {
          throw error;
        }
        const existing = await loadByIdempotencyKey(record.idempotencyKey);
        assert(existing, "operator_review");
        return { created: false, record: existing };
      }
    },
  };
}

function buildCandidate(input: {
  generatedAt: string;
  projectId: string;
  siteContextId: string;
  addressFingerprint: string;
  lgaCode: string;
  zoneCode: string;
  qscId: string;
  packId: string;
  evidenceHash: string;
  evidenceReady: boolean;
}): SubmissionSeeCandidate {
  const uploadId = "reviewed-private-survey";
  const sourceIds = ["lep", "dcp", "spatial", uploadId];
  return {
    documentType: "statement_of_environmental_effects",
    productCode: "submission_see",
    priceAud: SUBMISSION_SEE_COMMERCIAL_TERMS.listAmountMinor / 100,
    commercialMode: "preview",
    projectId: input.projectId,
    generatedAt: input.generatedAt,
    site: {
      label: "Protected exact-scope acceptance site",
      confirmedSiteId: input.siteContextId,
      addressFingerprint: input.addressFingerprint,
      lgaCode: input.lgaCode,
      zoneCode: input.zoneCode,
      spatialProvenance: {
        status: "verified",
        authoritative: true,
        serviceUrl:
          "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
        featureIdentifier: `feature_${sha256(input.siteContextId).slice(0, 20)}`,
        resolvedAt: input.generatedAt,
        limitations: [],
      },
    },
    proposalSummary:
      "Protected synthetic acceptance of the exact paid project scope. The output remains a working document and does not assert submission readiness.",
    sourceDetailedPlanningPack: {
      projectId: input.projectId,
      artefactId: input.packId,
      commercialReady: true,
      unresolvedTopics: input.evidenceReady
        ? []
        : ["Current reviewed survey evidence is required."],
      lgaCode: input.lgaCode,
      zoneCode: input.zoneCode,
      sourceQuickSiteCheckArtefactId: input.qscId,
    },
    sources: [
      {
        id: "lep",
        type: "LEP",
        title: "Current NSW environmental planning instrument",
        officialUrl: "https://legislation.nsw.gov.au/",
        retrievedAt: input.generatedAt,
      },
      {
        id: "dcp",
        type: "DCP",
        title: "Current council development control plan",
        officialUrl: "https://www.planningportal.nsw.gov.au/",
        retrievedAt: input.generatedAt,
      },
      {
        id: "spatial",
        type: "SPATIAL",
        title: "Current NSW planning spatial evidence",
        officialUrl:
          "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
        retrievedAt: input.generatedAt,
      },
      {
        id: uploadId,
        type: "UPLOAD",
        title: input.evidenceReady
          ? "Operator-reviewed synthetic survey"
          : "Quarantined synthetic survey",
        contentHash: input.evidenceHash,
        officialUrl: null,
        retrievedAt: input.generatedAt,
      },
    ],
    sections: REQUIRED_SUBMISSION_SEE_SECTIONS.map((id) => ({
      id,
      title: id.replaceAll("_", " "),
      narrative:
        `This protected acceptance section preserves the paid project, Quick Site Check and Planning Controls Pack chain for ${id}. ` +
        (input.evidenceReady
          ? "The reviewed synthetic survey is included only to prove evidence-aware regeneration and remains non-submission evidence."
          : "The synthetic survey remains quarantined and cannot support a planning conclusion."),
      sourceIds,
    })),
    uploadEvidence: {
      reviewed: input.evidenceReady,
      uploads: [
        {
          id: uploadId,
          name: "synthetic-survey.pdf",
          kind: "site_plan",
          evidenceStatus: input.evidenceReady ? "READY" : "NEEDS_REVIEW",
          indexingStatus: input.evidenceReady ? "READY" : "PENDING",
          contentHash: input.evidenceHash,
          currentForSite: true,
          usedInSections: ["site_and_surrounds", "environmental_impacts"],
        },
      ],
    },
    outputs: [],
    limitations: [
      "WORKING SEE - NOT SUBMISSION READY",
      "Synthetic evidence is used only inside this protected acceptance and is deleted before exit.",
    ],
    operatorReview: {
      status: "not_reviewed",
      reviewedAt: null,
      checklistVersion: null,
      unresolvedIssues: ["Final operator review remains required."],
    },
  };
}

async function persistWorkingVersion(input: {
  prisma: PrismaClient;
  id: string;
  projectId: string;
  userId: string;
  payload: Prisma.InputJsonValue;
  capturedAt: Date;
}) {
  const expectedHash = sha256(JSON.stringify(input.payload));
  const existing = await input.prisma.artefact.findUnique({
    where: { id: input.id },
  });
  if (existing) {
    assert(
      existing.projectId === input.projectId &&
        sha256(JSON.stringify(existing.payload)) === expectedHash,
      "replay",
    );
    return { artefact: existing, replayed: true };
  }
  try {
    const artefact = await input.prisma.artefact.create({
      data: {
        id: input.id,
        projectId: input.projectId,
        createdById: input.userId,
        type: "pre_see_planning_memo",
        title: "Item 78A synthetic working SEE acceptance",
        source: "protected-preview-acceptance",
        overlays: [],
        notes: "WORKING SEE - NOT SUBMISSION READY",
        payload: input.payload,
        capturedAt: input.capturedAt,
      },
    });
    return { artefact, replayed: false };
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    const winner = await input.prisma.artefact.findUnique({
      where: { id: input.id },
    });
    assert(
      winner &&
        winner.projectId === input.projectId &&
        sha256(JSON.stringify(winner.payload)) === expectedHash,
      "replay",
    );
    return { artefact: winner, replayed: true };
  }
}

async function cleanupSynthetic(
  prisma: PrismaClient,
  input: {
    prefix: string;
    targetPurchaseIds: string[];
    artefactIds: string[];
  },
) {
  await prisma.pathwayPrivateEvidencePromotion.deleteMany({
    where: { evidenceRef: { startsWith: input.prefix } },
  });
  await prisma.pathwayPrivateEvidenceOperatorReview.deleteMany({
    where: { evidenceRef: { startsWith: input.prefix } },
  });
  await prisma.submissionSeeCredit.deleteMany({
    where: { targetPurchaseId: { in: input.targetPurchaseIds } },
  });
  await prisma.artefact.deleteMany({ where: { id: { in: input.artefactIds } } });
  await prisma.purchase.deleteMany({
    where: { id: { in: input.targetPurchaseIds } },
  });
}

async function syntheticResidue(
  prisma: PrismaClient,
  input: {
    prefix: string;
    targetPurchaseIds: string[];
    artefactIds: string[];
  },
) {
  const counts = await Promise.all([
    prisma.pathwayPrivateEvidencePromotion.count({
      where: { evidenceRef: { startsWith: input.prefix } },
    }),
    prisma.pathwayPrivateEvidenceOperatorReview.count({
      where: { evidenceRef: { startsWith: input.prefix } },
    }),
    prisma.submissionSeeCredit.count({
      where: { targetPurchaseId: { in: input.targetPurchaseIds } },
    }),
    prisma.artefact.count({ where: { id: { in: input.artefactIds } } }),
    prisma.purchase.count({
      where: { id: { in: input.targetPurchaseIds } },
    }),
  ]);
  return counts.reduce((total, count) => total + count, 0);
}

async function runBridge(prisma: PrismaClient) {
  let stage: Stage = "configuration";
  assertProtectedPreview();
  const stripeConfig = validateAcceptanceConfiguration(process.env);
  assert(stripeConfig.phase === "paid", stage);

  stage = "stripe_paid_source";
  const stripeAcceptance = await runStripeTestAcceptance(process.env, fetch);
  assert(
    stripeAcceptance.exitCode === 0 && stripeAcceptance.summary.passed,
    stage,
  );

  stage = "paid_scope";
  const project = await prisma.project.findFirst({
    where: {
      OR: [{ id: stripeConfig.projectId }, { publicId: stripeConfig.projectId }],
    },
    include: { siteContext: true },
  });
  assert(project?.siteContext, stage);
  const sourcePurchase = await prisma.purchase.findFirst({
    where: {
      providerName: "stripe",
      providerReference: stripeConfig.sessionId,
      status: "PAID",
      productCode: PLANNING_CONTROLS_PACK_TERMS.productCode,
      productVersion: PLANNING_CONTROLS_PACK_TERMS.productVersion,
    },
    include: { entitlement: true },
  });
  assert(sourcePurchase?.entitlement?.status === "ACTIVE", stage);
  const scope = buildSubmissionSeeScope({
    userId: sourcePurchase.userId,
    projectId: sourcePurchase.projectId,
    quickSiteCheckArtefactId: sourcePurchase.quickSiteCheckArtefactId,
    proposalBrief: stripeConfig.proposal,
  });
  const submissionScopeKey = submissionSeeScopeKey(scope);
  const planningPackScopeKey = sourcePurchase.scopeKey;
  assert(
    sourcePurchase.projectId === project.id &&
      sourcePurchase.quickSiteCheckArtefactId ===
        stripeConfig.quickSiteCheckArtefactId &&
      sourcePurchase.proposalFingerprint === scope.proposalFingerprint &&
      planningPackScopeKey !== submissionScopeKey &&
      sourcePurchase.amountMinor === PLANNING_CONTROLS_PACK_TERMS.amountMinor &&
      sourcePurchase.currency === PLANNING_CONTROLS_PACK_TERMS.currency &&
      sourcePurchase.entitlement.activeScopeKey === planningPackScopeKey,
    stage,
  );

  const packPurchasesBefore = await prisma.purchase.count({
    where: {
      scopeKey: planningPackScopeKey,
      productCode: PLANNING_CONTROLS_PACK_TERMS.productCode,
      productVersion: PLANNING_CONTROLS_PACK_TERMS.productVersion,
      status: "PAID",
    },
  });
  const packArtefacts = await prisma.artefact.findMany({
    where: { projectId: project.id, type: "detailed_planning_pack" },
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
  });
  const matchingPacks = packArtefacts.filter((artefact) => {
    const payload = isRecord(artefact.payload) ? artefact.payload : null;
    const source = payload && isRecord(payload.sourceQuickSiteCheck)
      ? payload.sourceQuickSiteCheck
      : null;
    return (
      payload?.projectId === project.id &&
      source?.artefactId === sourcePurchase.quickSiteCheckArtefactId &&
      normalizePurchaseProposal(
        typeof payload.proposalBrief === "string" ? payload.proposalBrief : null,
      ) === normalizePurchaseProposal(stripeConfig.proposal)
    );
  });
  assert(packPurchasesBefore === 1 && matchingPacks.length === 1, stage);
  const pack = matchingPacks[0];

  const runKey = sha256(
    `${process.env.GITHUB_SHA}:${sourcePurchase.id}:${planningPackScopeKey}:${submissionScopeKey}`,
  ).slice(0, 24);
  const prefix = `item78a_${runKey}`;
  const evidenceRef = `${prefix}_survey`;
  const targetPurchaseId = `${prefix}_see_purchase`;
  const mismatchPurchaseId = `${prefix}_mismatch_purchase`;
  const initialSeeId = `${prefix}_working_see_1`;
  const strengthenedSeeId = `${prefix}_working_see_2`;
  const cleanupInput = {
    prefix,
    targetPurchaseIds: [targetPurchaseId, mismatchPurchaseId],
    artefactIds: [initialSeeId, strengthenedSeeId],
  };
  const objects = new Map<string, Uint8Array>();
  await cleanupSynthetic(prisma, cleanupInput);

  try {
    stage = "evidence_intake";
    const evidenceBytes = new TextEncoder().encode(
      "Harmless synthetic survey evidence for protected Item 78A acceptance.\n",
    );
    const evidenceHash = sha256(evidenceBytes);
    const objectRef = `ev_${sha256(`${prefix}:object`).slice(0, 32)}`;
    const ownerRef = `owner_${sha256(sourcePurchase.userId).slice(0, 24)}`;
    let queuedScan:
      | { objectRef: string; contentHash: string }
      | undefined;
    const intakeInput = {
      version: PATHWAY_PRIVATE_EVIDENCE_INTAKE_VERSION,
      environment: "preview" as const,
      featureEnabled: true,
      auth: {
        authEnabled: true,
        sessionUserRef: ownerRef,
        projectOwnerRef: ownerRef,
      },
      storage: {
        access: "private" as const,
        sdkVersion: "2.3.0",
        host: "item78a.private.blob.vercel-storage.com",
        signedAccessTtlSeconds: 300,
      },
      document: {
        role: "CADASTRAL_SURVEY" as const,
        mimeType: "application/pdf" as const,
        bytes: evidenceBytes,
      },
    };
    const intakeDeps = {
      createObjectRef: () => objectRef,
      putQuarantined: async (input: {
        objectRef: string;
        bytes: Uint8Array;
        contentHash: string;
      }) => {
        objects.set(input.objectRef, input.bytes);
        return {
          access: "private" as const,
          sdkVersion: "2.3.0",
          host: "item78a.private.blob.vercel-storage.com",
          objectRef: input.objectRef,
        };
      },
      enqueueSecurityScan: async (input: {
        objectRef: string;
        contentHash: string;
      }) => {
        queuedScan = input;
      },
      deleteQuarantined: async (input: { objectRef: string }) => {
        objects.delete(input.objectRef);
      },
    };
    const intake = await intakePathwayPrivateEvidence(intakeInput, intakeDeps);
    assert(
      intake.status === "QUARANTINED" &&
        queuedScan?.objectRef === objectRef &&
        queuedScan.contentHash === evidenceHash &&
        objects.size === 1,
      stage,
    );
    const crossOwner = await intakePathwayPrivateEvidence(
      {
        ...intakeInput,
        auth: {
          ...intakeInput.auth,
          projectOwnerRef: `owner_${sha256(`${ownerRef}:other`).slice(0, 24)}`,
        },
      },
      intakeDeps,
    );
    assert(
      crossOwner.status === "DENIED" &&
        crossOwner.blockers.includes("PROJECT_SCOPE_MISMATCH"),
      stage,
    );

    stage = "evidence_scan";
    const baseTime = sourcePurchase.paidAt ?? sourcePurchase.updatedAt;
    const at = (offsetMinutes: number) =>
      new Date(baseTime.getTime() + offsetMinutes * 60_000).toISOString();
    const scan = evaluatePathwayPrivateEvidenceScan({
      version: PATHWAY_PRIVATE_EVIDENCE_SCAN_VERSION,
      environment: "preview",
      featureEnabled: true,
      evaluatedAt: at(40),
      evidenceRef,
      expectedContentHash: evidenceHash,
      observation: {
        recordSource: "SERVER_SECURITY_SCAN",
        contentHashBefore: evidenceHash,
        contentHashAfter: evidenceHash,
        detected: false,
        exitCode: 0,
        targetFileCount: 1,
        scannerEngine: "ClamAV",
        engineVersion: "1.4.3",
        definitionVersion: "daily-current",
        scannerSnapshotRef: `snapshot_${runKey}`,
        snapshotCreatedAt: at(20),
        definitionsRetrievedAt: at(10),
        scannedAt: at(30),
        maxFileSizeBytes: 25 * 1024 * 1024,
        maxScanSizeBytes: 50 * 1024 * 1024,
        maxRecursionDepth: 16,
        maxScanTimeMs: 120_000,
        fileSizeLimitHit: false,
        scanSizeLimitHit: false,
        recursionLimitHit: false,
        timeLimitHit: false,
        encryptedContent: false,
        timedOut: false,
        crashed: false,
        malformedOutput: false,
        networkDenied: true,
        sandboxStopped: true,
      },
    });
    assert(scan.status === "CLEAN" && scan.serverRecord, stage);

    stage = "operator_review";
    const operatorRef = `operator_${sha256(sourcePurchase.userId).slice(0, 24)}`;
    const reviewDeps = reviewDependencies(prisma);
    const pendingInput = {
      version: PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
      environment: "preview" as const,
      featureEnabled: true,
      submittedAt: at(35),
      operatorAuth: {
        authEnabled: true,
        operatorAuthorized: true,
        operatorRef,
      },
      evidenceRef,
      contentHash: evidenceHash,
      role: "CADASTRAL_SURVEY" as const,
      idempotencyKey: `${prefix}:review:pending`,
      transition: {
        status: "PENDING" as const,
        pageReferences: [] as [],
        rejectionCode: null,
      },
    };
    const pending = await recordPathwayPrivateEvidenceOperatorReview(
      pendingInput,
      reviewDeps,
    );
    const pendingRecord = await reviewDeps.loadLatest({
      evidenceRef,
      contentHash: evidenceHash,
    });
    assert(pending.operation === "CREATED" && pendingRecord, stage);

    const evidenceRecord = {
      evidenceRef,
      role: "CADASTRAL_SURVEY" as const,
      contentHash: evidenceHash,
      storageAccess: "private" as const,
      quarantineStatus: "QUARANTINED" as const,
    };
    const promotionRequest = {
      version: PATHWAY_PRIVATE_EVIDENCE_REVIEW_VERSION,
      environment: "preview" as const,
      featureEnabled: true,
      evaluatedAt: at(45),
      operatorAuth: {
        authEnabled: true,
        operatorAuthorized: true,
        operatorRef,
      },
      evidenceRef,
    };
    const pendingPromotion = await promotePathwayPrivateEvidence(
      promotionRequest,
      {
        loadEvidence: async () => evidenceRecord,
        loadSecurityScan: async () => scan.serverRecord,
        loadOperatorReview: async () => ({
          recordSource: "SERVER_OPERATOR_REVIEW",
          evidenceRef,
          contentHash: evidenceHash,
          status: "PENDING",
          reviewerRef: null,
          reviewedAt: null,
          pageReferences: [],
        }),
        markReadyForEvidencePackage: async () => {
          throw new BridgeFailure("operator_review");
        },
      },
    );
    assert(
      pendingPromotion.status === "QUARANTINED" &&
        pendingPromotion.blockers.includes("EVIDENCE_REVIEW_REQUIRED"),
      stage,
    );

    const verified = await recordPathwayPrivateEvidenceOperatorReview(
      {
        ...pendingInput,
        submittedAt: at(40),
        idempotencyKey: `${prefix}:review:verified`,
        transition: {
          status: "EVIDENCE_VERIFIED",
          pageReferences: ["Sheet S1"],
          rejectionCode: null,
        },
      },
      reviewDeps,
    );
    const verifiedRecord = await reviewDeps.loadLatest({
      evidenceRef,
      contentHash: evidenceHash,
    });
    assert(
      verified.operation === "CREATED" &&
        verified.readyForEvidencePackagePromotion &&
        verifiedRecord?.status === "EVIDENCE_VERIFIED",
      stage,
    );

    const markReadyForEvidencePackage = async () => {
      try {
        await prisma.pathwayPrivateEvidencePromotion.create({
          data: {
            id: `promotion_${runKey}`,
            environment: "PREVIEW",
            evidenceRef,
            contentHash: evidenceHash,
            role: "CADASTRAL_SURVEY",
            reviewRecordHash: verifiedRecord.recordHash,
            status: "READY_FOR_EVIDENCE_PACKAGE",
            promotionVersion: PROMOTION_VERSION,
            idempotencyKey: `${prefix}:promotion`,
          },
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        ) {
          throw error;
        }
      }
    };
    const promotionDeps = {
      loadEvidence: async () => evidenceRecord,
      loadSecurityScan: async () => scan.serverRecord,
      loadOperatorReview: async () => ({
        recordSource: "SERVER_OPERATOR_REVIEW" as const,
        evidenceRef,
        contentHash: evidenceHash,
        status: "EVIDENCE_VERIFIED" as const,
        reviewerRef: verifiedRecord.reviewerRef,
        reviewedAt: verifiedRecord.reviewedAt,
        pageReferences: verifiedRecord.pageReferences,
      }),
      markReadyForEvidencePackage,
    };
    const promoted = await promotePathwayPrivateEvidence(
      promotionRequest,
      promotionDeps,
    );
    const promotedReplay = await promotePathwayPrivateEvidence(
      promotionRequest,
      promotionDeps,
    );
    const promotionCount = await prisma.pathwayPrivateEvidencePromotion.count({
      where: { evidenceRef },
    });
    assert(
      promoted.status === "READY_FOR_EVIDENCE_PACKAGE" &&
        promotedReplay.status === "READY_FOR_EVIDENCE_PACKAGE" &&
        promotionCount === 1,
      stage,
    );
    const changedEvidence = await promotePathwayPrivateEvidence(
      promotionRequest,
      {
        ...promotionDeps,
        loadEvidence: async () => ({
          ...evidenceRecord,
          contentHash: sha256(`${evidenceHash}:changed`),
        }),
      },
    );
    assert(
      changedEvidence.status === "QUARANTINED" &&
        changedEvidence.blockers.includes("SCAN_RECORD_MISMATCH"),
      stage,
    );

    stage = "credit";
    const creditService = new SubmissionSeeCreditPersistenceService(prisma);
    const quote = await creditService.quote(scope);
    assert(
      quote.creditEligible &&
        quote.listAmountMinor ===
          SUBMISSION_SEE_COMMERCIAL_TERMS.listAmountMinor &&
        quote.payableAmountMinor ===
          SUBMISSION_SEE_COMMERCIAL_TERMS.creditedPayableMinor,
      stage,
    );
    await prisma.purchase.create({
      data: {
        id: targetPurchaseId,
        userId: scope.userId,
        projectId: scope.projectId,
        quickSiteCheckArtefactId: scope.quickSiteCheckArtefactId,
        proposalFingerprint: scope.proposalFingerprint,
        productCode: SUBMISSION_SEE_COMMERCIAL_TERMS.productCode,
        productVersion: SUBMISSION_SEE_COMMERCIAL_TERMS.productVersion,
        amountMinor: SUBMISSION_SEE_COMMERCIAL_TERMS.creditedPayableMinor,
        currency: SUBMISSION_SEE_COMMERCIAL_TERMS.currency,
        status: "PENDING",
        providerName: "item78a_protected_preview",
        idempotencyKey: `${targetPurchaseId}:idempotency`,
        scopeKey: submissionScopeKey,
      },
    });
    const reserved = await creditService.reserve({
      scope,
      targetPurchaseId,
      now: new Date(at(50)),
    });
    const reservedReplay = await creditService.reserve({
      scope,
      targetPurchaseId,
      now: new Date(at(50)),
    });
    assert(
      reserved.status === "RESERVED" &&
        reservedReplay.idempotencyKey === reserved.idempotencyKey,
      stage,
    );
    await prisma.purchase.update({
      where: { id: targetPurchaseId },
      data: { status: "PAID", paidAt: new Date(at(55)) },
    });
    const consumed = await creditService.consume({
      scope,
      targetPurchaseId,
      now: new Date(at(60)),
    });
    const consumedReplay = await creditService.consume({
      scope,
      targetPurchaseId,
      now: new Date(at(60)),
    });
    assert(
      consumed.status === "CONSUMED" &&
        consumedReplay.idempotencyKey === consumed.idempotencyKey,
      stage,
    );

    const mismatchScope = buildSubmissionSeeScope({
      userId: scope.userId,
      projectId: scope.projectId,
      quickSiteCheckArtefactId: scope.quickSiteCheckArtefactId,
      proposalBrief: `${stripeConfig.proposal} changed`,
    });
    await prisma.purchase.create({
      data: {
        id: mismatchPurchaseId,
        userId: mismatchScope.userId,
        projectId: mismatchScope.projectId,
        quickSiteCheckArtefactId: mismatchScope.quickSiteCheckArtefactId,
        proposalFingerprint: mismatchScope.proposalFingerprint,
        productCode: SUBMISSION_SEE_COMMERCIAL_TERMS.productCode,
        productVersion: SUBMISSION_SEE_COMMERCIAL_TERMS.productVersion,
        amountMinor: SUBMISSION_SEE_COMMERCIAL_TERMS.creditedPayableMinor,
        currency: SUBMISSION_SEE_COMMERCIAL_TERMS.currency,
        status: "PENDING",
        providerName: "item78a_protected_preview",
        idempotencyKey: `${mismatchPurchaseId}:idempotency`,
        scopeKey: submissionSeeScopeKey(mismatchScope),
      },
    });
    let crossScopeDenied = false;
    try {
      await creditService.reserve({
        scope: mismatchScope,
        targetPurchaseId: mismatchPurchaseId,
      });
    } catch (error) {
      crossScopeDenied = error instanceof SubmissionSeeCreditError;
    }
    assert(crossScopeDenied, stage);

    stage = "working_see";
    const site = isRecord((pack.payload as Record<string, unknown>).site)
      ? ((pack.payload as Record<string, unknown>).site as Record<string, unknown>)
      : {};
    const lgaCode = String(site.lgaCode ?? project.siteContext.lgaCode ?? "")
      .trim()
      .toUpperCase();
    const zoneCode = String(site.zoneCode ?? project.zoningCode ?? "")
      .trim()
      .toUpperCase();
    assert(["BYRON", "KEMPSEY"].includes(lgaCode) && zoneCode, stage);
    const addressFingerprint = sha256(
      project.siteContext.formattedAddress ?? project.id,
    );
    const baselineDigest = sha256(`${submissionScopeKey}:baseline`);
    const reviewedDigest = sha256(
      `${baselineDigest}:${evidenceHash}:${verifiedRecord.recordHash}`,
    );
    assert(baselineDigest !== reviewedDigest, stage);

    const initialCandidate = buildCandidate({
      generatedAt: at(65),
      projectId: project.id,
      siteContextId: project.siteContext.id,
      addressFingerprint,
      lgaCode,
      zoneCode,
      qscId: sourcePurchase.quickSiteCheckArtefactId,
      packId: pack.id,
      evidenceHash,
      evidenceReady: false,
    });
    const strengthenedCandidate = buildCandidate({
      generatedAt: at(70),
      projectId: project.id,
      siteContextId: project.siteContext.id,
      addressFingerprint,
      lgaCode,
      zoneCode,
      qscId: sourcePurchase.quickSiteCheckArtefactId,
      packId: pack.id,
      evidenceHash,
      evidenceReady: true,
    });
    const outstanding = [
      {
        id: "survey-review",
        topic: "Current survey evidence remains under review",
        status: "MORE_EVIDENCE_REQUIRED" as const,
        recommendedEvidence: "Complete the protected operator review.",
        effect: "The working SEE remains non-submission-ready.",
      },
    ];
    const initialContext: WorkingSeeRenderContext = {
      documentReadiness: {
        state: "WORKING_SEE",
        evidenceStatus: "MORE_EVIDENCE_REQUIRED",
        submissionReady: false,
        customerMessage:
          "The working SEE remains provisional while evidence is reviewed.",
      },
      outstandingEvidence: outstanding,
      sourceDetailedPlanningPackArtefactId: pack.id,
      predecessorDetailedPlanningPackArtefactId: null,
    };
    const strengthenedContext: WorkingSeeRenderContext = {
      documentReadiness: {
        state: "WORKING_SEE",
        evidenceStatus: "CONFIRMED",
        submissionReady: false,
        customerMessage:
          "Reviewed evidence strengthened this working version; final operator approval remains required.",
      },
      outstandingEvidence: [],
      sourceDetailedPlanningPackArtefactId: pack.id,
      predecessorDetailedPlanningPackArtefactId: pack.id,
    };
    stage = "working_see_render";
    const initialRendered = renderWorkingSeeOutputs(
      initialCandidate,
      initialContext,
    );
    const strengthenedRendered = renderWorkingSeeOutputs(
      strengthenedCandidate,
      strengthenedContext,
    );
    const strengthenedAssessment = assessSubmissionSee({
      ...strengthenedCandidate,
      outputs: strengthenedRendered.outputs,
    });
    const label = "WORKING SEE - NOT SUBMISSION READY";
    assert(
      initialRendered.docx.includes(label) &&
        initialRendered.pdf.includes(label) &&
        strengthenedRendered.docx.includes(label) &&
        strengthenedRendered.pdf.includes(label) &&
        initialRendered.outputs[0].contentHash !==
          strengthenedRendered.outputs[0].contentHash &&
        initialRendered.outputs[1].contentHash !==
          strengthenedRendered.outputs[1].contentHash &&
        !strengthenedAssessment.ready &&
        strengthenedAssessment.issues.some(
          (issue) => issue.code === "operator_review_incomplete",
        ),
      stage,
    );

    const payloadFor = (
      generation: 1 | 2,
      evidenceDigest: string,
      predecessorArtefactId: string | null,
      context: WorkingSeeRenderContext,
      outputs: typeof initialRendered.outputs,
    ): Prisma.InputJsonValue => ({
      memoType: "pre_see_planning_memo",
      generatedAt: generation === 1 ? at(65) : at(70),
      projectId: project.id,
      documentReadiness: context.documentReadiness,
      outstandingEvidence: context.outstandingEvidence,
      sourceDetailedPlanningPack: {
        artefactId: pack.id,
        sourceQuickSiteCheckArtefactId:
          sourcePurchase.quickSiteCheckArtefactId,
      },
      limitations: [
        label,
        "Synthetic protected acceptance evidence; not a customer submission.",
      ],
      item78aBridge: {
        version: ITEM78A_DURABLE_COMMERCIAL_BRIDGE_VERSION,
        generation,
        scopeKey: submissionScopeKey,
        evidenceDigest,
        predecessorArtefactId,
        creditTargetPurchaseId: targetPurchaseId,
        outputs,
      },
    });
    const initialPayload = payloadFor(
      1,
      baselineDigest,
      null,
      initialContext,
      initialRendered.outputs,
    );
    const strengthenedPayload = payloadFor(
      2,
      reviewedDigest,
      initialSeeId,
      strengthenedContext,
      strengthenedRendered.outputs,
    );
    stage = "working_see_persist";
    const firstVersion = await persistWorkingVersion({
      prisma,
      id: initialSeeId,
      projectId: project.id,
      userId: sourcePurchase.userId,
      payload: initialPayload,
      capturedAt: new Date(at(65)),
    });
    const secondVersion = await persistWorkingVersion({
      prisma,
      id: strengthenedSeeId,
      projectId: project.id,
      userId: sourcePurchase.userId,
      payload: strengthenedPayload,
      capturedAt: new Date(at(70)),
    });

    stage = "replay";
    const firstReplay = await persistWorkingVersion({
      prisma,
      id: initialSeeId,
      projectId: project.id,
      userId: sourcePurchase.userId,
      payload: initialPayload,
      capturedAt: new Date(at(65)),
    });
    const secondReplay = await persistWorkingVersion({
      prisma,
      id: strengthenedSeeId,
      projectId: project.id,
      userId: sourcePurchase.userId,
      payload: strengthenedPayload,
      capturedAt: new Date(at(70)),
    });
    const [seeCount, creditCount, packPurchasesAfter, matchingPackCount] =
      await Promise.all([
        prisma.artefact.count({
          where: { id: { in: [initialSeeId, strengthenedSeeId] } },
        }),
        prisma.submissionSeeCredit.count({
          where: { targetPurchaseId },
        }),
        prisma.purchase.count({
          where: {
            scopeKey: planningPackScopeKey,
            productCode: PLANNING_CONTROLS_PACK_TERMS.productCode,
            productVersion: PLANNING_CONTROLS_PACK_TERMS.productVersion,
            status: "PAID",
          },
        }),
        prisma.artefact.count({ where: { id: pack.id } }),
      ]);
    assert(
      !firstVersion.replayed &&
        !secondVersion.replayed &&
        firstReplay.replayed &&
        secondReplay.replayed &&
        seeCount === 2 &&
        creditCount === 1 &&
        packPurchasesAfter === packPurchasesBefore &&
        matchingPackCount === 1,
      stage,
    );

    objects.delete(objectRef);
    stage = "cleanup";
    await cleanupSynthetic(prisma, cleanupInput);
    const databaseResidue = await syntheticResidue(prisma, cleanupInput);
    const syntheticObjectResidue = Number(objects.size);
    assert(databaseResidue === 0 && syntheticObjectResidue === 0, stage);

    const facts: Item78aDurableCommercialBridgeFacts = {
      environment: "preview",
      paidSource: {
        stripeTestMode: true,
        paidPurchaseResolved: true,
        activeEntitlementResolved: true,
        exactProject: true,
        exactQuickSiteCheck: true,
        exactProposal: true,
        exactProductAndPrice: true,
        exactlyOnePlanningPack:
          packPurchasesAfter === 1 && matchingPackCount === 1,
      },
      evidence: {
        quarantinedBeforeScan: intake.status === "QUARANTINED",
        cleanServerScan: scan.status === "CLEAN",
        unreviewedEvidenceDenied:
          pendingPromotion.status === "QUARANTINED",
        operatorReviewPersisted: verified.operation === "CREATED",
        promotionReplaySafe: promotionCount === 1,
        evidenceDigestChanged: baselineDigest !== reviewedDigest,
        changedEvidenceDenied: changedEvidence.status === "QUARANTINED",
      },
      credit: {
        exactQuote: quote.creditEligible,
        reservedOnce:
          reserved.status === "RESERVED" && creditCount === 1,
        consumedOnce: consumed.status === "CONSUMED",
        consumedReplaySafe:
          consumedReplay.idempotencyKey === consumed.idempotencyKey,
        crossScopeDenied,
      },
      workingSee: {
        sameProject:
          firstVersion.artefact.projectId === project.id &&
          secondVersion.artefact.projectId === project.id,
        exactSourcePack: matchingPackCount === 1,
        twoIntentionalVersions: seeCount === 2,
        versionReplaySafe: firstReplay.replayed && secondReplay.replayed,
        outputHashesChanged:
          initialRendered.outputs[0].contentHash !==
            strengthenedRendered.outputs[0].contentHash &&
          initialRendered.outputs[1].contentHash !==
            strengthenedRendered.outputs[1].contentHash,
        docxGenerated: strengthenedRendered.outputs[0].format === "DOCX",
        pdfGenerated: strengthenedRendered.outputs[1].format === "PDF",
        notSubmissionReady: !strengthenedAssessment.ready,
        operatorReviewStillRequired: strengthenedAssessment.issues.some(
          (issue) => issue.code === "operator_review_incomplete",
        ),
      },
      safety: {
        productionCheckoutDisabled: true,
        productionMutationPerformed: false,
        sensitiveValuesEmitted: false,
        syntheticDatabaseResidue: databaseResidue,
        syntheticObjectResidue,
      },
    };
    const summary = summarizeItem78aDurableCommercialBridge(facts);
    assert(summary.passed, "unhandled");
    return summary;
  } catch (error) {
    if (error instanceof BridgeFailure) throw error;
    throw new BridgeFailure(stage);
  } finally {
    objects.clear();
    try {
      await cleanupSynthetic(prisma, cleanupInput);
    } catch {
      throw new BridgeFailure("cleanup");
    }
  }
}

async function main() {
  const prisma = new PrismaClient({ log: [] });
  try {
    const summary = await runBridge(prisma);
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } catch (error) {
    const failedStage =
      error instanceof BridgeFailure ? error.stage : "unhandled";
    process.stdout.write(
      `${JSON.stringify({
        runnerVersion: ITEM78A_DURABLE_COMMERCIAL_BRIDGE_VERSION,
        passed: false,
        failedStage,
        productionCheckoutEnabled: false,
        productionMutationPerformed: false,
        containsSensitiveValues: false,
      })}\n`,
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
