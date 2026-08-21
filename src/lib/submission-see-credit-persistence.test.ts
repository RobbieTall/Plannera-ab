import { describe, expect, it } from "vitest";

import {
  SUBMISSION_SEE_COMMERCIAL_TERMS,
  buildSubmissionSeeScope,
  submissionSeeScopeKey,
} from "./submission-see-credit";
import { SubmissionSeeCreditPersistenceService } from "./submission-see-credit-persistence";

const matches = (row: Record<string, unknown>, where: Record<string, any>) =>
  Object.entries(where).every(([key, expected]) => {
    const actual = row[key];
    if (
      expected &&
      typeof expected === "object" &&
      Array.isArray(expected.in)
    ) {
      return expected.in.includes(actual);
    }
    return actual === expected;
  });

const createFixture = () => {
  const scope = buildSubmissionSeeScope({
    userId: "user-1",
    projectId: "project-1",
    quickSiteCheckArtefactId: "qsc-1",
    proposalBrief: "Tourist accommodation",
  });
  const now = new Date("2026-08-21T00:00:00.000Z");
  const state: {
    entitlements: any[];
    purchases: any[];
    credits: any[];
  } = {
    entitlements: [
      {
        id: "entitlement-1",
        userId: scope.userId,
        projectId: scope.projectId,
        quickSiteCheckArtefactId: scope.quickSiteCheckArtefactId,
        proposalFingerprint: scope.proposalFingerprint,
        productCode: "planning_controls_pack",
        productVersion: "v1",
        purchaseId: "planning-pack-purchase",
        status: "ACTIVE",
        activeScopeKey: "planning-pack-scope",
        createdAt: now,
        updatedAt: now,
        activatedAt: now,
        refundedAt: null,
        revokedAt: null,
      },
    ],
    purchases: [],
    credits: [],
  };

  const addTarget = (
    id: string,
    status:
      | "PENDING"
      | "PAID"
      | "FAILED"
      | "CANCELLED"
      | "REFUNDED" = "PENDING",
    targetScope = scope,
  ) => {
    state.purchases.push({
      id,
      userId: targetScope.userId,
      projectId: targetScope.projectId,
      quickSiteCheckArtefactId: targetScope.quickSiteCheckArtefactId,
      proposalFingerprint: targetScope.proposalFingerprint,
      productCode: SUBMISSION_SEE_COMMERCIAL_TERMS.productCode,
      productVersion: SUBMISSION_SEE_COMMERCIAL_TERMS.productVersion,
      amountMinor: SUBMISSION_SEE_COMMERCIAL_TERMS.creditedPayableMinor,
      currency: SUBMISSION_SEE_COMMERCIAL_TERMS.currency,
      status,
      providerName: null,
      providerReference: null,
      providerIntentReference: null,
      idempotencyKey: `purchase:${id}`,
      scopeKey: submissionSeeScopeKey(targetScope),
      createdAt: now,
      updatedAt: now,
      paidAt: status === "PAID" ? now : null,
      failedAt: status === "FAILED" ? now : null,
      cancelledAt: status === "CANCELLED" ? now : null,
      refundedAt: status === "REFUNDED" ? now : null,
    });
  };

  const db: any = {
    entitlement: {
      findFirst: async ({ where }: any) =>
        [...state.entitlements]
          .reverse()
          .find((row) => matches(row, where)) ?? null,
      findUnique: async ({ where }: any) =>
        state.entitlements.find((row) => matches(row, where)) ?? null,
    },
    purchase: {
      findUnique: async ({ where }: any) =>
        state.purchases.find((row) => matches(row, where)) ?? null,
    },
    submissionSeeCredit: {
      findMany: async ({ where }: any) =>
        state.credits.filter((row) => matches(row, where)),
      findFirst: async ({ where }: any) =>
        state.credits.find((row) => matches(row, where)) ?? null,
      findUnique: async ({ where }: any) =>
        state.credits.find((row) => matches(row, where)) ?? null,
      create: async ({ data }: any) => {
        const targetConflict = state.credits.some(
          (row) => row.targetPurchaseId === data.targetPurchaseId,
        );
        const sourceConflict = state.credits.some(
          (row) =>
            row.sourceEntitlementId === data.sourceEntitlementId &&
            ["RESERVED", "CONSUMED"].includes(row.status),
        );
        const idempotencyConflict = state.credits.some(
          (row) => row.idempotencyKey === data.idempotencyKey,
        );
        if (targetConflict || sourceConflict || idempotencyConflict) {
          const error: any = new Error("Unique constraint failed");
          error.code = "P2002";
          throw error;
        }
        const created = {
          id: `credit-${state.credits.length + 1}`,
          ...data,
          consumedAt: null,
          releasedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        state.credits.push(created);
        return created;
      },
      updateMany: async ({ where, data }: any) => {
        const rows = state.credits.filter((row) => matches(row, where));
        rows.forEach((row) => Object.assign(row, data, { updatedAt: now }));
        return { count: rows.length };
      },
    },
    $transaction: async (callback: (tx: any) => unknown) => callback(db),
  };

  return {
    scope,
    state,
    addTarget,
    service: new SubmissionSeeCreditPersistenceService(db),
  };
};

describe("persistent submission SEE credit ledger", () => {
  it("quotes server terms and persists one replay-safe exact-target reservation", async () => {
    const { scope, state, addTarget, service } = createFixture();
    addTarget("see-1");

    const quote = await service.quote(scope);
    expect(quote).toMatchObject({
      creditEligible: true,
      listAmountMinor: 74900,
      creditAmountMinor: 4900,
      payableAmountMinor: 70000,
      currency: "AUD",
    });

    const first = await service.reserve({
      scope,
      targetPurchaseId: "see-1",
      now: new Date("2026-08-21T01:00:00.000Z"),
    });
    const replay = await service.reserve({
      scope,
      targetPurchaseId: "see-1",
      now: new Date("2026-08-21T01:01:00.000Z"),
    });

    expect(replay).toEqual(first);
    expect(state.credits).toHaveLength(1);
    expect(state.credits[0]).toMatchObject({
      sourceEntitlementId: "entitlement-1",
      targetPurchaseId: "see-1",
      scopeKey: submissionSeeScopeKey(scope),
      listAmountMinor: 74900,
      creditAmountMinor: 4900,
      payableAmountMinor: 70000,
      status: "RESERVED",
    });
  });

  it("blocks a second target and permanently consumes only after exact paid settlement", async () => {
    const { scope, state, addTarget, service } = createFixture();
    addTarget("see-1");
    addTarget("see-2");
    await service.reserve({ scope, targetPurchaseId: "see-1" });

    await expect(
      service.reserve({ scope, targetPurchaseId: "see-2" }),
    ).rejects.toMatchObject({ code: "credit_already_reserved" });

    state.purchases.find((row) => row.id === "see-1").status = "PAID";
    const consumed = await service.consume({
      scope,
      targetPurchaseId: "see-1",
      now: new Date("2026-08-21T02:00:00.000Z"),
    });
    const replay = await service.consume({
      scope,
      targetPurchaseId: "see-1",
      now: new Date("2026-08-21T02:01:00.000Z"),
    });

    expect(consumed.status).toBe("CONSUMED");
    expect(replay).toEqual(consumed);
    await expect(
      service.reserve({ scope, targetPurchaseId: "see-2" }),
    ).rejects.toMatchObject({ code: "credit_already_consumed" });
    await expect(
      service.release({ scope, targetPurchaseId: "see-1" }),
    ).rejects.toMatchObject({ code: "invalid_credit_transition" });
  });

  it("releases only a failed or cancelled unpaid target and then permits reuse", async () => {
    const { scope, state, addTarget, service } = createFixture();
    addTarget("see-1");
    addTarget("see-2");
    await service.reserve({ scope, targetPurchaseId: "see-1" });

    await expect(
      service.release({ scope, targetPurchaseId: "see-1" }),
    ).rejects.toMatchObject({ code: "invalid_credit_transition" });

    state.purchases.find((row) => row.id === "see-1").status = "CANCELLED";
    const released = await service.release({
      scope,
      targetPurchaseId: "see-1",
      now: new Date("2026-08-21T03:00:00.000Z"),
    });
    expect(released.status).toBe("RELEASED");

    const reused = await service.reserve({
      scope,
      targetPurchaseId: "see-2",
      now: new Date("2026-08-21T03:01:00.000Z"),
    });
    expect(reused.status).toBe("RESERVED");
    expect(state.credits).toHaveLength(2);
  });

  it("fails closed for changed scope and an inactive source entitlement", async () => {
    const { scope, state, addTarget, service } = createFixture();
    const changedScope = buildSubmissionSeeScope({
      userId: scope.userId,
      projectId: scope.projectId,
      quickSiteCheckArtefactId: scope.quickSiteCheckArtefactId,
      proposalBrief: "Industrial warehouse",
    });
    addTarget("see-changed", "PENDING", changedScope);

    const changedQuote = await service.quote(changedScope);
    expect(changedQuote).toMatchObject({
      creditEligible: false,
      ineligibilityReason: "planning_pack_scope_mismatch",
      payableAmountMinor: 74900,
    });
    await expect(
      service.reserve({
        scope: changedScope,
        targetPurchaseId: "see-changed",
      }),
    ).rejects.toMatchObject({ code: "credit_not_eligible" });

    addTarget("see-1");
    state.entitlements[0].status = "REFUNDED";
    const inactiveQuote = await service.quote(scope);
    expect(inactiveQuote).toMatchObject({
      creditEligible: false,
      ineligibilityReason: "planning_pack_inactive",
    });
    await expect(
      service.reserve({ scope, targetPurchaseId: "see-1" }),
    ).rejects.toMatchObject({ code: "credit_not_eligible" });
  });

  it("refuses consumption if the source becomes inactive after reservation", async () => {
    const { scope, state, addTarget, service } = createFixture();
    addTarget("see-1");
    await service.reserve({ scope, targetPurchaseId: "see-1" });
    state.purchases[0].status = "PAID";
    state.entitlements[0].status = "REVOKED";

    await expect(
      service.consume({ scope, targetPurchaseId: "see-1" }),
    ).rejects.toMatchObject({ code: "credit_source_inactive" });
    expect(state.credits[0].status).toBe("RESERVED");
  });
});
