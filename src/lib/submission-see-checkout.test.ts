import { describe, expect, it, vi } from "vitest";
import { SubmissionSeeCheckout, type SeeCheckoutProvider } from "./submission-see-checkout";
import { submissionSeeScopeKey } from "./submission-see-credit";
import type { ResolvedSeeCheckoutScope } from "./submission-see-checkout-scope";

type Row = Record<string, unknown>;
const now = new Date("2026-10-05T00:00:00Z");
const selection = { actorId: "owner-1", projectId: "project-1",
  sourceDetailedPlanningPackArtefactId: "pack-1", sourceMemoArtefactId: "memo-1" };
const baseScope = { userId: "owner-1", projectId: "project-1",
  quickSiteCheckArtefactId: "qsc-1", proposalFingerprint: "a".repeat(64) };
const scope: ResolvedSeeCheckoutScope = { ...baseScope, council: "BYRON",
  scopeKey: submissionSeeScopeKey(baseScope), sourceSignature: "b".repeat(64) };
function harness(withCredit = false) {
  const paidPack = { ...baseScope, id: "pack-purchase", status: "PAID", productCode: "planning_controls_pack",
    productVersion: "v1", amountMinor: 4900, currency: "AUD", providerName: "stripe", providerReference: "cs_test_pack1" };
  const state: { pending: Row | null; credit: Row | null; source: Row | null; active: Row | null; prior: Row | null; ledger: Row[] } = {
    pending: null, credit: null, active: null, prior: null, ledger: [],
    source: withCredit ? { ...baseScope, id: "pack-entitlement", productCode: "planning_controls_pack",
      productVersion: "v1", status: "ACTIVE", purchase: paidPack } : null,
  };
  const tx = {
    purchase: {
      findFirst: vi.fn(async ({ where }: { where: Row }) => where.status === "PENDING" ? state.pending : state.prior),
      count: vi.fn(async () => 0),
      create: vi.fn(async ({ data }: { data: Row }) => {
        state.pending = { ...data, id: "purchase-1", createdAt: now, providerReference: null, providerName: null };
        return state.pending;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
        if (state.pending !== null && state.pending.id === where.id && state.pending.providerReference === null) {
          Object.assign(state.pending, data); return { count: 1 };
        }
        return { count: 0 };
      }),
      findUnique: vi.fn(async () => state.pending),
    },
    entitlement: { findFirst: vi.fn(async ({ where }: { where: Row }) => "activeScopeKey" in where ? state.active : state.source) },
    submissionSeeCredit: {
      findMany: vi.fn(async () => [...state.ledger, ...(state.credit ? [state.credit] : [])]),
      findUnique: vi.fn(async () => state.credit),
      create: vi.fn(async ({ data }: { data: Row }) => {
        state.credit = { ...data, id: "credit-1", consumedAt: null, releasedAt: null }; return state.credit;
      }),
    },
  };
  const transaction = vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => {
    const snapshot = structuredClone({ pending: state.pending, credit: state.credit });
    try { return await work(tx); } catch (error) { Object.assign(state, snapshot); throw error; }
  });
  const provider = { create: vi.fn<SeeCheckoutProvider["create"]>().mockResolvedValue({
    id: "cs_test_session1", url: "https://checkout.stripe.com/c/pay/cs_test_session1",
  }) };
  const resolve = vi.fn().mockResolvedValue(scope);
  const service = new SubmissionSeeCheckout(
    { $transaction: transaction } as unknown as ConstructorParameters<typeof SubmissionSeeCheckout>[0],
    provider, "BYRON", resolve, () => now);
  return { state, tx, provider, resolve, service, transaction };
}
describe("reconstructed SEE checkout transaction and retry coverage", () => {
  it("quotes approved full price without writes or provider calls", async () => {
    const h = harness();
    expect(await h.service.quote(selection)).toMatchObject({ state: "available", listAmountMinor: 74900,
      creditAmountMinor: 0, payableAmountMinor: 74900, currency: "AUD" });
    expect(h.tx.purchase.create).not.toHaveBeenCalled();
    expect(h.provider.create).not.toHaveBeenCalled();
  });
  it("quotes the eligible paid-pack credit", async () => {
    const h = harness(true);
    expect(await h.service.quote(selection)).toMatchObject({ creditAmountMinor: 4900, payableAmountMinor: 70000 });
  });
  it("rejects an unpaid credit source", async () => {
    const h = harness(true); (h.state.source!.purchase as Row).status = "PENDING";
    await expect(h.service.quote(selection)).rejects.toThrow("credit_unavailable");
  });
  it("rejects a fabricated or live-mode credit source", async () => {
    const h = harness(true); (h.state.source!.purchase as Row).providerReference = "cs_live_bad";
    await expect(h.service.quote(selection)).rejects.toThrow("credit_unavailable");
  });
  it("rejects a stale quote before purchase creation", async () => {
    const h = harness();
    await expect(h.service.checkout(selection, "f".repeat(64))).rejects.toThrow("quote_changed");
    expect(h.tx.purchase.create).not.toHaveBeenCalled();
    expect(h.provider.create).not.toHaveBeenCalled();
  });
  it("reserves credit and creates only a pending purchase, not an entitlement", async () => {
    const h = harness(true); const quote = await h.service.quote(selection);
    await h.service.checkout(selection, quote.quoteId);
    expect(h.state.pending).toMatchObject({ status: "PENDING", amountMinor: 70000,
      providerName: "stripe", providerReference: "cs_test_session1" });
    expect(h.state.credit).toMatchObject({ status: "RESERVED", creditAmountMinor: 4900 });
    expect(h.state.active).toBeNull();
    expect(h.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });
  it("reuses the pending purchase, credit and provider idempotency on retry", async () => {
    const h = harness(true); const quote = await h.service.quote(selection);
    await h.service.checkout(selection, quote.quoteId);
    await h.service.checkout(selection, quote.quoteId);
    expect(h.tx.purchase.create).toHaveBeenCalledTimes(1);
    expect(h.tx.submissionSeeCredit.create).toHaveBeenCalledTimes(1);
    expect(h.provider.create.mock.calls[1]).toEqual(h.provider.create.mock.calls[0]);
  });
  it("preserves the same pending attempt after a provider timeout", async () => {
    const h = harness(true); const quote = await h.service.quote(selection);
    h.provider.create.mockRejectedValueOnce(new Error("synthetic timeout"));
    await expect(h.service.checkout(selection, quote.quoteId)).rejects.toThrow("synthetic timeout");
    expect(h.state.pending?.status).toBe("PENDING");
    expect(h.state.credit?.status).toBe("RESERVED");
    await h.service.checkout(selection, quote.quoteId);
    expect(h.tx.purchase.create).toHaveBeenCalledTimes(1);
    expect(h.provider.create.mock.calls[1]).toEqual(h.provider.create.mock.calls[0]);
  });
  it("rolls back a pending purchase when credit reservation fails in the test transaction", async () => {
    const h = harness(true); const quote = await h.service.quote(selection);
    h.tx.submissionSeeCredit.create.mockRejectedValueOnce(new Error("synthetic failure"));
    await expect(h.service.checkout(selection, quote.quoteId)).rejects.toThrow("synthetic failure");
    expect(h.state.pending).toBeNull(); expect(h.provider.create).not.toHaveBeenCalled();
  });
  it("rejects a malicious provider URL without attaching it", async () => {
    const h = harness(); const quote = await h.service.quote(selection);
    h.provider.create.mockResolvedValueOnce({ id: "cs_test_session1", url: "https://attacker.invalid/" });
    await expect(h.service.checkout(selection, quote.quoteId)).rejects.toThrow("provider_checkout_invalid");
    expect(h.tx.purchase.updateMany).not.toHaveBeenCalled();
  });
  it("rejects source changes between preparing and attaching the session", async () => {
    const h = harness(); const quote = await h.service.quote(selection);
    h.resolve.mockResolvedValueOnce(scope).mockResolvedValueOnce({ ...scope, sourceSignature: "c".repeat(64) });
    await expect(h.service.checkout(selection, quote.quoteId)).rejects.toThrow("quote_changed");
    expect(h.tx.purchase.updateMany).not.toHaveBeenCalled();
  });
  it("does not resell a previously paid/refunded scope", async () => {
    const h = harness(); h.state.prior = { id: "old", status: "PAID" };
    await expect(h.service.quote(selection)).rejects.toThrow("pending_reconciliation_required");
    expect(h.provider.create).not.toHaveBeenCalled();
  });
  it("rejects an old pending attempt for reconciliation instead of silently recreating it", async () => {
    const h = harness(); const quote = await h.service.quote(selection);
    await h.service.checkout(selection, quote.quoteId);
    h.state.pending!.createdAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await expect(h.service.quote(selection)).rejects.toThrow("pending_reconciliation_required");
    expect(h.tx.purchase.create).toHaveBeenCalledTimes(1);
  });
  it("reports an exact paid entitlement without creating another checkout", async () => {
    const h = harness();
    const purchase = { ...baseScope, id: "paid-1", status: "PAID", productCode: "submission_see",
      productVersion: "v1", scopeKey: scope.scopeKey, amountMinor: 74900, currency: "AUD" };
    h.state.active = { ...baseScope, productCode: "submission_see", productVersion: "v1", purchase };
    expect(await h.service.quote(selection)).toMatchObject({ state: "paid", payableAmountMinor: 0 });
    await expect(h.service.checkout(selection, "a".repeat(64))).rejects.toThrow("already_paid");
    expect(h.provider.create).not.toHaveBeenCalled();
  });
});
