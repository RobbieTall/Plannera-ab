import { describe, expect, it, vi } from "vitest";

import {
  PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
  recordPathwayPrivateEvidenceOperatorReview,
  type PathwayPrivateEvidenceOperatorReviewDependencies,
  type PathwayPrivateEvidenceOperatorReviewInput,
  type PathwayPrivateEvidenceOperatorReviewPersistedRecord,
} from "./pathway-private-evidence-operator-review";

const EVIDENCE_REF = "evidence_opaque_item74h";
const CONTENT_HASH = "a".repeat(64);
const OPERATOR_REF = "operator_opaque_item74h";

const input = (
  status: "PENDING" | "EVIDENCE_VERIFIED" | "REJECTED",
  idempotencyKey: string,
): PathwayPrivateEvidenceOperatorReviewInput => ({
  version: PATHWAY_PRIVATE_EVIDENCE_OPERATOR_REVIEW_VERSION,
  environment: "preview",
  featureEnabled: true,
  submittedAt:
    status === "PENDING"
      ? "2026-08-28T01:00:00.000Z"
      : "2026-08-28T02:00:00.000Z",
  operatorAuth: {
    authEnabled: true,
    operatorAuthorized: true,
    operatorRef: OPERATOR_REF,
  },
  evidenceRef: EVIDENCE_REF,
  contentHash: CONTENT_HASH,
  role: "REGISTERED_CADASTRAL_PLAN",
  idempotencyKey,
  transition:
    status === "PENDING"
      ? { status, pageReferences: [], rejectionCode: null }
      : status === "EVIDENCE_VERIFIED"
        ? {
            status,
            pageReferences: ["Sheet 1", "Page 2"],
            rejectionCode: null,
          }
        : {
            status,
            pageReferences: [],
            rejectionCode: "MEASUREMENTS_UNVERIFIABLE",
          },
});

const memoryDependencies = () => {
  const records: PathwayPrivateEvidenceOperatorReviewPersistedRecord[] = [];
  const deps: PathwayPrivateEvidenceOperatorReviewDependencies = {
    loadByIdempotencyKey: vi.fn(async (key) =>
      records.find((record) => record.idempotencyKey === key) ?? null,
    ),
    loadLatest: vi.fn(async ({ evidenceRef, contentHash }) =>
      [...records]
        .filter(
          (record) =>
            record.evidenceRef === evidenceRef &&
            record.contentHash === contentHash,
        )
        .sort((a, b) => b.revision - a.revision)[0] ?? null,
    ),
    append: vi.fn(async (record) => {
      const existing = records.find(
        (item) => item.idempotencyKey === record.idempotencyKey,
      );
      if (existing) return { created: false, record: existing };
      records.push(record);
      return { created: true, record };
    }),
  };
  return { deps, records };
};

describe("Item 74H private evidence operator review", () => {
  it("creates and replays one pending queue record without leaking identifiers", async () => {
    const { deps, records } = memoryDependencies();
    const request = input("PENDING", "item74h:review:pending");

    const created = await recordPathwayPrivateEvidenceOperatorReview(
      request,
      deps,
    );
    const replayed = await recordPathwayPrivateEvidenceOperatorReview(
      request,
      deps,
    );

    expect(created).toMatchObject({
      operation: "CREATED",
      reviewStatus: "PENDING",
      blockers: [],
      revision: 1,
      readyForEvidencePackagePromotion: false,
    });
    expect(replayed.operation).toBe("REPLAYED");
    expect(records).toHaveLength(1);

    const serialized = JSON.stringify(created);
    expect(serialized).not.toContain(EVIDENCE_REF);
    expect(serialized).not.toContain(CONTENT_HASH);
    expect(serialized).not.toContain(OPERATOR_REF);
    expect(serialized).not.toContain("Sheet 1");
  });

  it("creates and replays exactly one terminal verified review", async () => {
    const { deps, records } = memoryDependencies();
    await recordPathwayPrivateEvidenceOperatorReview(
      input("PENDING", "item74h:review:pending"),
      deps,
    );
    const request = input("EVIDENCE_VERIFIED", "item74h:review:verified");

    const created = await recordPathwayPrivateEvidenceOperatorReview(
      request,
      deps,
    );
    const replayed = await recordPathwayPrivateEvidenceOperatorReview(
      request,
      deps,
    );

    expect(created).toMatchObject({
      operation: "CREATED",
      reviewStatus: "EVIDENCE_VERIFIED",
      blockers: [],
      revision: 2,
      pageReferenceCount: 2,
      readyForEvidencePackagePromotion: true,
      redactedSummary: {
        immutableTerminalDecision: true,
        planningControlsPackEligible: false,
        submissionSeeEligible: false,
        productionCheckoutEnabled: false,
      },
    });
    expect(replayed.operation).toBe("REPLAYED");
    expect(records).toHaveLength(2);
  });

  it("persists a structured rejection without page or free-text content", async () => {
    const { deps } = memoryDependencies();
    await recordPathwayPrivateEvidenceOperatorReview(
      input("PENDING", "item74h:review:pending"),
      deps,
    );

    const result = await recordPathwayPrivateEvidenceOperatorReview(
      input("REJECTED", "item74h:review:rejected"),
      deps,
    );

    expect(result).toMatchObject({
      operation: "CREATED",
      reviewStatus: "REJECTED",
      rejectionCode: "MEASUREMENTS_UNVERIFIABLE",
      pageReferenceCount: 0,
      readyForEvidencePackagePromotion: false,
    });
  });

  it("refuses a second terminal decision", async () => {
    const { deps } = memoryDependencies();
    await recordPathwayPrivateEvidenceOperatorReview(
      input("PENDING", "item74h:review:pending"),
      deps,
    );
    await recordPathwayPrivateEvidenceOperatorReview(
      input("EVIDENCE_VERIFIED", "item74h:review:verified"),
      deps,
    );

    const result = await recordPathwayPrivateEvidenceOperatorReview(
      input("REJECTED", "item74h:review:late-rejection"),
      deps,
    );

    expect(result).toMatchObject({
      operation: "DENIED",
      blockers: ["TERMINAL_REVIEW_IMMUTABLE"],
      readyForEvidencePackagePromotion: false,
    });
  });

  it("refuses reuse of an idempotency key for different intent", async () => {
    const { deps } = memoryDependencies();
    await recordPathwayPrivateEvidenceOperatorReview(
      input("PENDING", "item74h:review:shared"),
      deps,
    );
    const conflicting = input(
      "EVIDENCE_VERIFIED",
      "item74h:review:shared",
    );

    const result = await recordPathwayPrivateEvidenceOperatorReview(
      conflicting,
      deps,
    );

    expect(result.blockers).toContain("IDEMPOTENCY_CONFLICT");
  });

  it("denies Production and unauthenticated requests before persistence", async () => {
    const { deps } = memoryDependencies();
    const production = input("PENDING", "item74h:review:production");
    production.environment = "production";
    const unauthenticated = input(
      "PENDING",
      "item74h:review:unauthenticated",
    );
    unauthenticated.operatorAuth.operatorAuthorized = false;

    expect(
      await recordPathwayPrivateEvidenceOperatorReview(production, deps),
    ).toMatchObject({ operation: "DENIED", blockers: ["PREVIEW_ONLY"] });
    expect(
      await recordPathwayPrivateEvidenceOperatorReview(
        unauthenticated,
        deps,
      ),
    ).toMatchObject({
      operation: "DENIED",
      blockers: ["OPERATOR_AUTH_REQUIRED"],
    });
    expect(deps.append).not.toHaveBeenCalled();
  });
});
