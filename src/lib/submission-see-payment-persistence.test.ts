import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { submissionSeeScopeKey } from "./submission-see-credit";
import { SubmissionSeePaymentPersistence } from "./submission-see-payment-persistence";

type Row = Record<string, unknown>;
const matches = (row: Row, where: Row) => Object.entries(where).every(([key, value]) => row[key] === value);
const build = (discounted = true) => {
  const purchase: Row = {
    id: "purchase-1", userId: "user-1", projectId: "project-byron",
    quickSiteCheckArtefactId: "qsc-1", proposalFingerprint: "a".repeat(64),
    productCode: "submission_see", productVersion: "v1",
    amountMinor: discounted ? 70000 : 74900, currency: "AUD", status: "PENDING",
    providerName: "stripe", providerReference: "cs_test_session1", providerIntentReference: null,
  };
  purchase.scopeKey = submissionSeeScopeKey(purchase as unknown as Parameters<typeof submissionSeeScopeKey>[0]);
  const source = { id: "source-1", userId: purchase.userId, projectId: purchase.projectId,
    quickSiteCheckArtefactId: purchase.quickSiteCheckArtefactId, proposalFingerprint: purchase.proposalFingerprint,
    productCode: "planning_controls_pack", productVersion: "v1", status: "ACTIVE", purchaseId: "pack-1",
    activeScopeKey: "pack-scope" };
  const state = {
    purchases: [purchase],
    entitlements: discounted ? [source as Row] : [] as Row[],
    credits: discounted ? [{
      id: "credit-1", targetPurchaseId: purchase.id, sourceEntitlementId: source.id, scopeKey: purchase.scopeKey,
      listAmountMinor: 74900, creditAmountMinor: 4900, payableAmountMinor: 70000, currency: "AUD",
      status: "RESERVED",
    } as Row] : [] as Row[],
  };
  const faults = { entitlementCreate: false, creditUpdate: false, purchaseUpdate: false, contention: 0 };
  const transactions = vi.fn(async (work: (tx: unknown) => Promise<unknown>, options: unknown) => {
    expect(options).toEqual({ isolationLevel: "Serializable" });
    if (faults.contention > 0) {
      faults.contention--;
      throw Object.assign(new Error("synthetic contention"), { code: "P2034" });
    }
    const draft = structuredClone(state);
    const table = (rows: Row[], kind: string) => ({
      findUnique: async ({ where }: { where: Row }) => rows.find((row) => matches(row, where)) ?? null,
      findFirst: async ({ where }: { where: Row }) => rows.find((row) => matches(row, where)) ?? null,
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        if (kind === "credit" && faults.creditUpdate) throw new Error("synthetic credit failure");
        if (kind === "purchase" && faults.purchaseUpdate) return { count: 0 };
        const selected = rows.filter((row) => matches(row, where));
        selected.forEach((row) => Object.assign(row, data));
        return { count: selected.length };
      },
      create: async ({ data }: { data: Row }) => {
        if (faults.entitlementCreate) throw new Error("synthetic entitlement failure");
        const row = { id: "see-entitlement-1", ...data };
        rows.push(row);
        return row;
      },
    });
    const result = await work({
      purchase: table(draft.purchases, "purchase"),
      entitlement: table(draft.entitlements, "entitlement"),
      submissionSeeCredit: table(draft.credits, "credit"),
    });
    Object.assign(state, draft);
    return result;
  });
  const service = new SubmissionSeePaymentPersistence(
    { $transaction: transactions } as unknown as Pick<PrismaClient, "$transaction">,
    () => new Date("2026-10-04T00:00:00Z"),
  );
  const payload = (type = "checkout.session.completed", amount = discounted ? 70000 : 74900) => ({
    id: "evt_synthetic", type, livemode: false,
    data: { object: { id: "cs_test_session1", livemode: false, metadata: { purchase_id: "purchase-1" },
      payment_intent: "pi_payment1", mode: "payment", payment_status: "paid",
      amount_total: amount, currency: "aud" } },
  }) as unknown as Stripe.Event;
  const input = (event = payload()) => ({
    gate: { deploymentEnvironment: "preview", enabled: "true", secretKey: "sk_test_synthetic" },
    rawBody: "synthetic raw body", signature: "synthetic signature", webhookSecret: "synthetic secret",
    provider: { verifyWebhook: vi.fn(() => event) },
  });
  return { state, faults, transactions, service, payload, input };
};

describe("atomic SEE test payment persistence", () => {
  it("settles, consumes credit and grants exact access in one transaction", async () => {
    const f = build();
    expect((await f.service.receive(f.input())).action).toBe("settle");
    expect(f.transactions).toHaveBeenCalledTimes(1);
    expect(f.state.purchases[0]).toMatchObject({ status: "PAID", providerIntentReference: "pi_payment1" });
    expect(f.state.credits[0].status).toBe("CONSUMED");
    expect(f.state.entitlements[1]).toMatchObject({ status: "ACTIVE", purchaseId: "purchase-1",
      projectId: "project-byron", productCode: "submission_see", activeScopeKey: f.state.purchases[0].scopeKey });
  });
  it("settles a full-price purchase without creating credit", async () => {
    const f = build(false);
    expect(await f.service.receive(f.input())).toMatchObject({ action: "settle", credit: "none" });
    expect(f.state.credits).toHaveLength(0);
    expect(f.state.entitlements).toHaveLength(1);
  });
  it("replays without granting duplicate access", async () => {
    const f = build(); await f.service.receive(f.input());
    const before = structuredClone(f.state);
    expect((await f.service.receive(f.input())).action).toBe("replay");
    expect(f.state).toEqual(before);
  });
  it.each(["entitlementCreate", "creditUpdate", "purchaseUpdate"] as const)("rolls back the entire transition after %s fails", async (fault) => {
    const f = build(); f.faults[fault] = true;
    const before = structuredClone(f.state);
    await expect(f.service.receive(f.input())).rejects.toThrow();
    expect(f.state).toEqual(before);
  });
  it("rejects mismatched source project without any writes", async () => {
    const f = build(); f.state.entitlements[0].projectId = "project-kempsey";
    const before = structuredClone(f.state);
    await expect(f.service.receive(f.input())).rejects.toThrow("credit_mismatch");
    expect(f.state).toEqual(before);
  });
  it("rejects wrong payment amount without any writes", async () => {
    const f = build(); const before = structuredClone(f.state);
    await expect(f.service.receive(f.input(f.payload("checkout.session.completed", 4900)))).rejects.toThrow("terms_mismatch");
    expect(f.state).toEqual(before);
  });
  it("verifies the signature before starting a database transaction", async () => {
    const f = build(); const input = f.input();
    input.provider.verifyWebhook.mockImplementation(() => { throw new Error("private provider diagnostic"); });
    await expect(f.service.receive(input)).rejects.toThrow(/^invalid_signature$/);
    expect(f.transactions).not.toHaveBeenCalled();
  });
  it("never accesses the database or provider in Production", async () => {
    const f = build(); const input = f.input(); input.gate.deploymentEnvironment = "production";
    await expect(f.service.receive(input)).rejects.toThrow("preview_disabled");
    expect(input.provider.verifyWebhook).not.toHaveBeenCalled();
    expect(f.transactions).not.toHaveBeenCalled();
  });
  it("does not fulfill unpaid checkout completion", async () => {
    const f = build(); const payload = f.payload();
    (payload.data.object as Stripe.Checkout.Session).payment_status = "unpaid";
    expect(await f.service.receive(f.input(payload))).toEqual({ action: "ignored", credit: "none" });
    expect(f.transactions).not.toHaveBeenCalled();
  });
  it("retries rolled-back serialization conflicts without re-verifying or calling payment APIs", async () => {
    const f = build(); f.faults.contention = 2; const input = f.input();
    expect((await f.service.receive(input)).action).toBe("settle");
    expect(f.transactions).toHaveBeenCalledTimes(3);
    expect(input.provider.verifyWebhook).toHaveBeenCalledTimes(1);
    expect(f.state.entitlements).toHaveLength(2);
  });
  it("stops after three serialization failures without granting access", async () => {
    const f = build(); f.faults.contention = 3; const before = structuredClone(f.state);
    await expect(f.service.receive(f.input())).rejects.toMatchObject({ code: "P2034" });
    expect(f.transactions).toHaveBeenCalledTimes(3);
    expect(f.state).toEqual(before);
  });
  it.each([
    ["checkout.session.expired", "CANCELLED"],
    ["checkout.session.async_payment_failed", "FAILED"],
  ])("releases credit atomically for %s and safely replays", async (eventType, status) => {
    const f = build(); const input = f.input(f.payload(eventType));
    await f.service.receive(input);
    expect(f.state.purchases[0].status).toBe(status);
    expect(f.state.credits[0].status).toBe("RELEASED");
    expect(f.state.entitlements).toHaveLength(1);
    expect((await f.service.receive(input)).action).toBe("replay");
  });
  it("never reactivates a revoked entitlement on payment replay", async () => {
    const f = build(); await f.service.receive(f.input());
    f.state.entitlements[1].status = "REVOKED"; f.state.entitlements[1].activeScopeKey = null;
    const before = structuredClone(f.state);
    await expect(f.service.receive(f.input())).rejects.toThrow("invalid_transition");
    expect(f.state).toEqual(before);
  });
  it("rejects another active entitlement for the exact scope", async () => {
    const f = build();
    f.state.entitlements.push({ ...f.state.entitlements[0], id: "other-see", purchaseId: "other-purchase",
      productCode: "submission_see", activeScopeKey: f.state.purchases[0].scopeKey });
    const before = structuredClone(f.state);
    await expect(f.service.receive(f.input())).rejects.toThrow("invalid_transition");
    expect(f.state).toEqual(before);
  });
  it("records a provider-confirmed refund, revokes access and never restores consumed credit", async () => {
    const f = build(); await f.service.receive(f.input());
    const refund = { id: "evt_refund", type: "charge.refunded", livemode: false, data: { object: {
      id: "ch_synthetic", livemode: false, metadata: { purchase_id: "purchase-1" },
      payment_intent: "pi_payment1", amount: 70000, amount_refunded: 70000, refunded: true, currency: "aud",
    } } } as unknown as Stripe.Event;
    expect((await f.service.receive(f.input(refund))).action).toBe("refund");
    expect(f.state.purchases[0].status).toBe("REFUNDED");
    expect(f.state.entitlements[1]).toMatchObject({ status: "REFUNDED", activeScopeKey: null });
    expect(f.state.credits[0].status).toBe("CONSUMED");
    expect((await f.service.receive(f.input(refund))).action).toBe("replay");
    await expect(f.service.receive(f.input())).rejects.toThrow("invalid_transition");
  });
});
