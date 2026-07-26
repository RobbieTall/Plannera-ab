import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";

import { createPlanningPackCheckout } from "../src/lib/planning-pack-checkout";
import { PLANNING_CONTROLS_PACK_TERMS, getPlanningPackCheckoutConfig, requirePlanningPackEntitlement } from "../src/lib/planning-pack-commerce";
import { applyPlanningPackProviderEvent, verifyAndApplyPlanningPackWebhook, type PlanningPackEventService, type PlanningPackProviderEvent } from "../src/lib/planning-pack-webhook";
import { StripeCommerceProvider } from "../src/lib/stripe-commerce";

const paidEvent = (overrides: Partial<Extract<PlanningPackProviderEvent, { kind: "paid" }>> = {}): Extract<PlanningPackProviderEvent, { kind: "paid" }> => ({
  kind: "paid", purchaseId: "purchase-1", sessionId: "cs_1", paymentIntentId: "pi_1",
  mode: "payment", paymentStatus: "paid", amountTotal: 4900, currency: "aud", ...overrides,
});

const stateService = () => {
  const state = { status: "PENDING", entitlement: false, paymentIntent: null as string | null, applied: 0 };
  const service: PlanningPackEventService = {
    async resolveWebhookPurchase(purchaseId, sessionId) {
      state.applied += 1;
      if (purchaseId !== "purchase-1" || sessionId !== "cs_1") throw new Error("scope mismatch");
      return { id: purchaseId };
    },
    async bindProviderPaymentReference(_purchaseId, paymentIntentId) {
      if (!["PENDING", "PAID"].includes(state.status) || (state.paymentIntent && state.paymentIntent !== paymentIntentId)) throw new Error("unsafe bind");
      state.paymentIntent = paymentIntentId;
    },
    async settlePaidPurchase() {
      if (state.status === "PAID") return;
      if (state.status !== "PENDING") throw new Error("reconciliation required");
      state.status = "PAID"; state.entitlement = true;
    },
    async markPurchaseFailed() {
      if (state.status === "FAILED") return;
      if (state.status !== "PENDING") throw new Error("reconciliation required");
      state.status = "FAILED";
    },
    async cancelPurchase() {
      if (state.status === "CANCELLED") return;
      if (state.status !== "PENDING") throw new Error("reconciliation required");
      state.status = "CANCELLED";
    },
    async providerConfirmedFullRefund(purchaseId, paymentIntentId) {
      if (purchaseId !== "purchase-1" || (state.paymentIntent && state.paymentIntent !== paymentIntentId)) throw new Error("refund mismatch");
      if (state.status === "REFUNDED") return;
      if (!["PENDING", "PAID"].includes(state.status)) throw new Error("reconciliation required");
      state.paymentIntent = paymentIntentId; state.status = "REFUNDED"; state.entitlement = false;
    },
  };
  return { state, service };
};

test("approved terms are canonical AUD and disabled config is secret-free", () => {
  assert.deepEqual(PLANNING_CONTROLS_PACK_TERMS, { productCode: "planning_controls_pack", productVersion: "v1", amountMinor: 4900, currency: "AUD" });
  const previous = process.env.PLANNING_PACK_CHECKOUT_ENABLED;
  delete process.env.PLANNING_PACK_CHECKOUT_ENABLED;
  assert.equal(getPlanningPackCheckoutConfig().enabled, false);
  if (previous === undefined) delete process.env.PLANNING_PACK_CHECKOUT_ENABLED; else process.env.PLANNING_PACK_CHECKOUT_ENABLED = previous;
});

test("checkout uses server terms, inclusive Stripe pricing, and never calls Stripe for an active exact scope", async () => {
  let providerCalls = 0; let purchaseCalls = 0;
  const entitledService = {
    findActiveEntitlementForCurrentScope: async () => ({ id: "entitlement-1" }),
    createOrReusePendingIntent: async () => { purchaseCalls += 1; return {} as never; },
  } as any;
  const provider = { createHostedCheckout: async () => { providerCalls += 1; return { id: "cs", url: "https://checkout.stripe.test" }; } } as any;
  await assert.rejects(() => createPlanningPackCheckout(entitledService, provider, { userId: "user-1", projectId: "project-1", proposalBrief: "proposal" }), /already paid/);
  assert.equal(purchaseCalls, 0); assert.equal(providerCalls, 0);

  let request: any; let refundRequest: any;
  const stripe = { checkout: { sessions: { create: async (body: any, options: any) => { request = { body, options }; return { id: "cs_1", url: "https://checkout.stripe.test" }; } }, }, refunds: { create: async (body: any, options: any) => { refundRequest = { body, options }; return { id: "re_1", status: "succeeded" }; } }, webhooks: {} } as Stripe;
  const adapter = new StripeCommerceProvider({ enabled: true, secretKey: "sk_test", successUrl: "https://example.test/success", cancelUrl: "https://example.test/cancel" }, stripe);
  await adapter.createHostedCheckout({ purchaseId: "purchase-1", amountMinor: 4900, currency: "AUD", productName: "Pack", idempotencyKey: "stable" });
  assert.equal(request.body.mode, "payment"); assert.equal(request.body.line_items[0].price_data.currency, "aud");
  assert.equal(request.body.line_items[0].price_data.unit_amount, 4900); assert.equal(request.body.line_items[0].price_data.tax_behavior, "inclusive");
  assert.deepEqual(request.body.metadata, { purchase_id: "purchase-1" }); assert.deepEqual(request.body.payment_intent_data.metadata, { purchase_id: "purchase-1" }); assert.equal(request.options.idempotencyKey, "stable");
  await adapter.requestFullRefund("pi_1", "purchase-1", "refund-stable");
  assert.deepEqual(refundRequest.body, { payment_intent: "pi_1", metadata: { purchase_id: "purchase-1" } });
});

test("unsigned and invalid signatures apply no event", async () => {
  const { state, service } = stateService();
  const provider = { verifyWebhook: () => { throw new Error("bad signature"); } } as any;
  await assert.rejects(() => verifyAndApplyPlanningPackWebhook({ rawBody: "{}", signature: null, webhookSecret: "whsec", provider, service }), /Invalid signature/);
  await assert.rejects(() => verifyAndApplyPlanningPackWebhook({ rawBody: "{}", signature: "forged", webhookSecret: "whsec", provider, service }), /Invalid signature/);
  assert.equal(state.applied, 0); assert.equal(state.status, "PENDING");
});

test("verified redirect-like unpaid completion grants nothing while exact paid scope settles idempotently", async () => {
  const { state, service } = stateService();
  const event = (session: any) => ({ id: "evt", type: "checkout.session.completed", data: { object: session } }) as Stripe.Event;
  const provider = { verifyWebhook: () => event({ id: "cs_1", metadata: { purchase_id: "purchase-1" }, payment_status: "unpaid" }) } as any;
  await verifyAndApplyPlanningPackWebhook({ rawBody: "signed", signature: "valid", webhookSecret: "whsec", provider, service });
  assert.equal(state.status, "PENDING"); assert.equal(state.entitlement, false);
  await applyPlanningPackProviderEvent(service, paidEvent());
  await applyPlanningPackProviderEvent(service, paidEvent());
  assert.equal(state.status, "PAID"); assert.equal(state.entitlement, true);
  await assert.rejects(() => applyPlanningPackProviderEvent(service, paidEvent({ sessionId: "cross-scope" })), /scope mismatch/);
});

test("paid facts must exactly match session, payment mode, amount and currency", async () => {
  for (const change of [{ mode: "subscription" }, { paymentStatus: "unpaid" }, { amountTotal: 1 }, { currency: "usd" }, { paymentIntentId: "" }]) {
    const { state, service } = stateService();
    await assert.rejects(() => applyPlanningPackProviderEvent(service, paidEvent(change as any)), /facts/);
    assert.equal(state.applied, 0); assert.equal(state.entitlement, false);
  }
});

test("contradictory paid-after-terminal fails; full refund-before-paid is durable and duplicate-safe", async () => {
  for (const kind of ["failed", "expired"] as const) {
    const { state, service } = stateService();
    await applyPlanningPackProviderEvent(service, { kind, purchaseId: "purchase-1", sessionId: "cs_1" });
    await applyPlanningPackProviderEvent(service, { kind, purchaseId: "purchase-1", sessionId: "cs_1" });
    await assert.rejects(() => applyPlanningPackProviderEvent(service, paidEvent()), /unsafe bind|reconciliation/);
    assert.equal(state.entitlement, false);
  }
  const { state, service } = stateService();
  const refund: PlanningPackProviderEvent = { kind: "refunded", purchaseId: "purchase-1", paymentIntentId: "pi_1", amountRefunded: 4900, currency: "aud", fullRefund: true };
  await applyPlanningPackProviderEvent(service, refund); await applyPlanningPackProviderEvent(service, refund);
  assert.equal(state.status, "REFUNDED");
  await assert.rejects(() => applyPlanningPackProviderEvent(service, paidEvent()), /unsafe bind|reconciliation/);
  assert.equal(state.entitlement, false);
  await assert.rejects(() => applyPlanningPackProviderEvent(service, { ...refund, amountRefunded: 100 }), /full purchase amount/);
});

test("feature-off skips entitlement lookup; feature-on denies before generation/persistence callback", async () => {
  let lookups = 0; let retrievals = 0; let persisted = 0;
  const service = { findActiveEntitlementForCurrentScope: async () => { lookups += 1; return null; } };
  const generate = async () => { retrievals += 1; persisted += 1; };
  await requirePlanningPackEntitlement(false, service, { userId: "u", projectId: "p", proposalBrief: "x" }); await generate();
  assert.equal(lookups, 0); assert.equal(persisted, 1);
  await assert.rejects(() => requirePlanningPackEntitlement(true, service, { userId: "u", projectId: "p", proposalBrief: "x" }), /Payment is required/);
  assert.equal(retrievals, 1); assert.equal(persisted, 1);
});
