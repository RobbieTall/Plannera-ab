import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION,
  assemblePathwayPrivateEvidencePackage,
  type PathwayPrivateEvidencePackageAssemblyDependencies,
  type PathwayPrivateEvidencePackageAssemblyPersistedRecord,
  type PathwayPrivateEvidencePromotionRecord,
} from "./pathway-private-evidence-package-assembly";
import {
  PATHWAY_REAL_SITE_EVIDENCE_VERSION,
  type PathwayRealSiteDocumentRole,
  type PathwayRealSiteEvidencePackage,
} from "./pathway-real-site-evidence";
import {
  PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
  type PathwayPrivateEvidenceOperatorReviewPersistedRecord,
} from "./pathway-private-evidence-operator-review";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const evaluatedAt = "2026-08-28T04:00:00.000Z";
const roles: PathwayRealSiteDocumentRole[] = [
  "ROAD_CLASSIFICATION",
  "REGISTERED_CADASTRAL_PLAN",
  "CADASTRAL_SURVEY",
  "PROPOSED_SHED_LAYOUT",
];

const documentFor = (role: PathwayRealSiteDocumentRole) => ({
  role,
  uploadRef: "evidence_" + role.toLowerCase(),
  contentHash: hash("content:" + role),
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
  sourceVersion: "current-2026-08-28",
  sourceReferenceHash: hash("source:" + role),
  issuedAt: "2026-08-20T00:00:00.000Z",
  retrievedAt: "2026-08-27T00:00:00.000Z",
  staleAt: "2027-08-28T00:00:00.000Z",
  basisContentHash:
    role === "PROPOSED_SHED_LAYOUT"
      ? hash("content:CADASTRAL_SURVEY")
      : role === "CADASTRAL_SURVEY"
        ? hash("content:REGISTERED_CADASTRAL_PLAN")
        : null,
  verification: {
    status: "EVIDENCE_VERIFIED" as const,
    reviewerRef: "x",
    reviewedAt: "2099-01-01T00:00:00.000Z",
    reviewNotesHash: "untrusted",
  },
});

const packageDraft = (): PathwayRealSiteEvidencePackage => {
  const documents = roles.map(documentFor);
  return {
    version: PATHWAY_REAL_SITE_EVIDENCE_VERSION,
    projectRef: "package_synthetic_74h",
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

const records = () => {
  const reviews: PathwayPrivateEvidenceOperatorReviewPersistedRecord[] =
    roles.map((role, index) => {
      const evidenceRef = "evidence_" + role.toLowerCase();
      const contentHash = hash("content:" + role);
      const base = {
        recordSource: "SERVER_OPERATOR_REVIEW" as const,
        environment: "PREVIEW" as const,
        evidenceRef,
        contentHash,
        role,
        status: "EVIDENCE_VERIFIED" as const,
        actorRef: "operator_synthetic",
        reviewerRef: "operator_synthetic",
        reviewedAt: "2026-08-28T03:0" + index + ":00.000Z",
        pageReferences: ["Sheet " + (index + 1)],
        rejectionCode: null,
        reviewVersion: PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
        revision: 2,
        idempotencyKey: "review:" + role,
        requestHash: hash("request:" + role),
        previousRecordHash: hash("pending:" + role),
        createdAt: "2026-08-28T03:0" + index + ":00.000Z",
      };
      return {...base, recordHash: hash("review:" + role)};
    });
  const promotions: PathwayPrivateEvidencePromotionRecord[] = reviews.map(
    (review) => ({
      id: "promotion_" + review.role.toLowerCase(),
      environment: "PREVIEW",
      evidenceRef: review.evidenceRef,
      contentHash: review.contentHash,
      role: review.role,
      reviewRecordHash: review.recordHash,
      status: "READY_FOR_EVIDENCE_PACKAGE",
      promotionVersion: "item74h-private-evidence-promotion.v1",
      idempotencyKey: "promotion:" + review.role,
      createdAt: "2026-08-28T03:30:00.000Z",
    }),
  );
  return {reviews, promotions};
};

const makeDependencies = (
  draft = packageDraft(),
  mutate?: (state: {
    reviews: PathwayPrivateEvidenceOperatorReviewPersistedRecord[];
    promotions: PathwayPrivateEvidencePromotionRecord[];
  }) => void,
) => {
  const state = records();
  mutate?.(state);
  const stored = new Map<
    string,
    PathwayPrivateEvidencePackageAssemblyPersistedRecord
  >();
  const dependencies: PathwayPrivateEvidencePackageAssemblyDependencies = {
    loadPackageDraft: async () => draft,
    loadPromotions: async () => state.promotions,
    loadVerifiedReviews: async () => state.reviews,
    loadByIdempotencyKey: async (key) => stored.get(key) ?? null,
    persist: async (record) => {
      const prior = stored.get(record.idempotencyKey);
      if (prior) return {created: false, record: prior};
      stored.set(record.idempotencyKey, record);
      return {created: true, record};
    },
  };
  return {dependencies, stored};
};

const input = () => ({
  version: PATHWAY_PRIVATE_EVIDENCE_PACKAGE_ASSEMBLY_VERSION,
  environment: "preview" as const,
  featureEnabled: true,
  evaluatedAt,
  operatorAuth: {
    authEnabled: true,
    operatorAuthorized: true,
    operatorRef: "operator_synthetic",
  },
  packageRef: "package_synthetic_74h",
  idempotencyKey: "assembly:synthetic:74h",
});

describe("private evidence package assembly", () => {
  it("replaces untrusted verification, persists exactly four roles, and replays", async () => {
    const {dependencies, stored} = makeDependencies();
    const created = await assemblePathwayPrivateEvidencePackage(
      input(),
      dependencies,
    );
    const replayed = await assemblePathwayPrivateEvidencePackage(
      input(),
      dependencies,
    );

    expect(created).toMatchObject({
      operation: "CREATED",
      status: "READY_FOR_REAL_SITE_ASSESSMENT",
      blockers: [],
      redactedSummary: {
        acceptedDocumentCount: 4,
        realSiteEvidenceConfirmed: true,
        planningControlsPackEligible: false,
        submissionSeeEligible: false,
        productionCheckoutEnabled: false,
      },
    });
    expect(replayed.operation).toBe("REPLAYED");
    expect(stored.get(input().idempotencyKey)?.items.map((item) => item.role))
      .toEqual([...roles].sort());
  });

  it("fails closed when the exact role set is incomplete", async () => {
    const draft = packageDraft();
    draft.documents = draft.documents.slice(0, 2);
    const {dependencies} = makeDependencies(draft);
    const result = await assemblePathwayPrivateEvidencePackage(
      input(),
      dependencies,
    );
    expect(result.blockers).toEqual(["DOCUMENT_ROLE_SET_INCOMPLETE"]);
  });

  it("fails closed on a promotion binding mismatch", async () => {
    const {dependencies} = makeDependencies(packageDraft(), (state) => {
      state.promotions[0] = {
        ...state.promotions[0],
        contentHash: hash("different"),
      };
    });
    const result = await assemblePathwayPrivateEvidencePackage(
      input(),
      dependencies,
    );
    expect(result.blockers).toEqual(["PROMOTION_RECORD_MISMATCH"]);
  });

  it("fails closed on an operator-review binding mismatch", async () => {
    const {dependencies} = makeDependencies(packageDraft(), (state) => {
      state.reviews[0] = {...state.reviews[0], reviewerRef: null};
    });
    const result = await assemblePathwayPrivateEvidencePackage(
      input(),
      dependencies,
    );
    expect(result.blockers).toEqual(["OPERATOR_REVIEW_RECORD_MISMATCH"]);
  });

  it("does not bypass real-site evidence currentness", async () => {
    const draft = packageDraft();
    draft.documents[0].staleAt = "2026-08-28T03:59:59.000Z";
    const {dependencies} = makeDependencies(draft);
    const result = await assemblePathwayPrivateEvidencePackage(
      input(),
      dependencies,
    );
    expect(result.blockers).toEqual(["REAL_SITE_EVIDENCE_NOT_CONFIRMED"]);
  });

  it("denies production and disabled execution before persistence", async () => {
    const {dependencies, stored} = makeDependencies();
    const result = await assemblePathwayPrivateEvidencePackage(
      {...input(), environment: "production", featureEnabled: false},
      dependencies,
    );
    expect(result.blockers).toEqual(["PREVIEW_ONLY", "FEATURE_DISABLED"]);
    expect(stored.size).toBe(0);
  });

  it("rejects reuse of an idempotency key for a changed request", async () => {
    const {dependencies} = makeDependencies();
    await assemblePathwayPrivateEvidencePackage(input(), dependencies);
    const conflict = await assemblePathwayPrivateEvidencePackage(
      {...input(), evaluatedAt: "2026-08-28T04:01:00.000Z"},
      dependencies,
    );
    expect(conflict.blockers).toEqual(["IDEMPOTENCY_CONFLICT"]);
  });

  it("rejects unsupported caller-supplied fields", async () => {
    const {dependencies} = makeDependencies();
    const result = await assemblePathwayPrivateEvidencePackage(
      {...input(), siteEvidenceDigest: hash("caller-value")} as never,
      dependencies,
    );
    expect(result.blockers).toEqual(["UNSUPPORTED_FIELD"]);
  });
});
