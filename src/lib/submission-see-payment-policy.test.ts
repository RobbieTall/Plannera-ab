import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { submissionSeeScopeKey } from "./submission-see-credit";
import {
  planSubmissionSeePaymentTransition as plan, verifySubmissionSeePreviewEvent as verify,
  type SeePaymentPurchase, type SeePaymentCredit, type SeePaymentCreditSource,
} from "./submission-see-payment-policy";

const fixture = (discounted = true) => {
  const purchase: SeePaymentPurchase = {
    id: "purchase-1", userId: "user-1", projectId: "project-byron",
    quickSiteCheckArtefactId: "qsc-1", proposalFingerprint: "a".repeat(64),
    productCode: "submission_see", productVersion: "v1", scopeKey: "",
    amountMinor: discounted ? 70000 : 74900, currency: "AUD", status: "PENDING",
    providerName: "stripe", providerReference: "cs_test_session1", providerIntentReference: null,
  };
  purchase.scopeKey = submissionSeeScopeKey(purchase);
  const credit: SeePaymentCredit | null = discounted ? {
    targetPurchaseId: purchase.id, sourceEntitlementId: "entitlement-1",
    scopeKey: purchase.scopeKey, listAmountMinor: 74900, creditAmountMinor: 4900,
    payableAmountMinor: 70000, currency: "AUD", status: "RESERVED",
  } : null;
  const creditSource: SeePaymentCreditSource | null = discounted ? {
    id: "entitlement-1", userId: purchase.userId, projectId: purchase.projectId,
    quickSiteCheckArtefactId: purchase.quickSiteCheckArtefactId,
    proposalFingerprint: purchase.proposalFingerprint,
    productCode: "planning_controls_pack", productVersion: "v1", status: "ACTIVE",
  } : null;
  return { purchase, credit, creditSource };
};

const event = (amount = 70000, type = "checkout.session.completed") => ({
  id: "evt_synthetic", type, livemode: false,
  data: { object: {
    id: "cs_test_session1", livemode: false, metadata: { purchase_id: "purchase-1" },
    payment_intent: "pi_payment1", mode: "payment", payment_status: "paid",
    amount_total: amount, currency: "aud",
  } },
}) as unknown as Stripe.Event;

const verified = (payload: Stripe.Event) => verify({
  gate: { deploymentEnvironment: "preview", enabled: "true", secretKey: "sk_test_synthetic" },
  rawBody: "synthetic", signature: "synthetic-signature", webhookSecret: "synthetic-secret",
  provider: { verifyWebhook: () => payload },
})!;

describe("SEE Preview webhook policy", () => {
  it.each(["production", "development", undefined])("blocks environment %s before verification", (deploymentEnvironment) => {
    const verifyWebhook = vi.fn();
    expect(() => verify({ gate: { deploymentEnvironment, enabled: "true", secretKey: "sk_test_synthetic" },
      rawBody: "", signature: "x", webhookSecret: "x", provider: { verifyWebhook },
    })).toThrow("preview_disabled");
    expect(verifyWebhook).not.toHaveBeenCalled();
  });
  it.each(["sk_live_synthetic", "rk_live_synthetic", "", "sk_test_"])("rejects non-test configuration %s", (secretKey) => {
    expect(() => verify({ gate: { deploymentEnvironment: "preview", enabled: "true", secretKey },
      rawBody: "", signature: "x", webhookSecret: "x", provider: { verifyWebhook: () => event() },
    })).toThrow("preview_disabled");
  });
  it("requires explicit enablement", () => {
    expect(() => verify({ gate: { deploymentEnvironment: "preview", secretKey: "sk_test_synthetic" },
      rawBody: "", signature: "x", webhookSecret: "x", provider: { verifyWebhook: () => event() },
    })).toThrow("preview_disabled");
  });
  it("supports restricted test keys", () => {
    expect(verify({ gate: { deploymentEnvironment: "preview", enabled: "true", secretKey: "rk_test_synthetic" },
      rawBody: "", signature: "x", webhookSecret: "x", provider: { verifyWebhook: () => event() },
    })).not.toBeNull();
  });
  it("does not return verifier errors or raw secrets", () => {
    expect(() => verify({ gate: { deploymentEnvironment: "preview", enabled: "true", secretKey: "sk_test_synthetic" },
      rawBody: "", signature: "x", webhookSecret: "x",
      provider: { verifyWebhook: () => { throw new Error("PRIVATE_PROVIDER_DETAILS"); } },
    })).toThrow(/^invalid_signature$/);
  });
  it.each([null, ""])("requires a signature (%s)", (signature) => {
    const verifyWebhook = vi.fn();
    expect(() => verify({ gate: { deploymentEnvironment: "preview", enabled: "true", secretKey: "sk_test_synthetic" },
      rawBody: "", signature, webhookSecret: "x", provider: { verifyWebhook },
    })).toThrow("invalid_signature");
    expect(verifyWebhook).not.toHaveBeenCalled();
  });
  it.each(["event", "object"])("rejects live %s", (location) => {
    const payload = event();
    if (location === "event") payload.livemode = true;
    else (payload.data.object as Stripe.Checkout.Session).livemode = true;
    expect(() => verified(payload)).toThrow("not_test_event");
  });
  it("does not grant access for completed but unpaid checkout", () => {
    const payload = event();
    (payload.data.object as Stripe.Checkout.Session).payment_status = "unpaid";
    expect(verified(payload)).toBeNull();
  });
  it.each([70000, 74900])("settles only the matching server price %s", (amount) => {
    const rows = fixture(amount === 70000);
    expect(plan({ ...rows, verifiedEvent: verified(event(amount)) })).toEqual({
      action: "settle", credit: amount === 70000 ? "consume" : "none", paymentIntentId: "pi_payment1",
    });
    expect(rows.purchase.status).toBe("PENDING");
  });
  it("accepts asynchronous paid confirmation", () => {
    expect(plan({ ...fixture(), verifiedEvent: verified(event(70000, "checkout.session.async_payment_succeeded")) }).action).toBe("settle");
  });
  it.each([4900, 0, 69999, 70001, 74900])("rejects the wrong credited amount %s", (amount) => {
    expect(() => plan({ ...fixture(), verifiedEvent: verified(event(amount)) })).toThrow("terms_mismatch");
  });
  it.each(["projectId", "userId", "quickSiteCheckArtefactId", "proposalFingerprint"] as const)(
    "rejects credit from a different %s", (field) => {
      const rows = fixture(); rows.creditSource![field] = "different";
      expect(() => plan({ ...rows, verifiedEvent: verified(event()) })).toThrow("credit_mismatch");
    },
  );
  it.each(["productCode", "productVersion", "scopeKey", "providerReference"] as const)(
    "rejects mismatched purchase %s", (field) => {
      const rows = fixture(); rows.purchase[field] = "different";
      expect(() => plan({ ...rows, verifiedEvent: verified(event()) })).toThrow("purchase_mismatch");
    },
  );
  it("rejects a session attached to another purchase", () => {
    const payload = event(); (payload.data.object as Stripe.Checkout.Session).metadata!.purchase_id = "other";
    expect(() => plan({ ...fixture(), verifiedEvent: verified(payload) })).toThrow("purchase_mismatch");
  });
  it("rejects another session on the same purchase", () => {
    const payload = event(); (payload.data.object as Stripe.Checkout.Session).id = "cs_test_other";
    expect(() => plan({ ...fixture(), verifiedEvent: verified(payload) })).toThrow("purchase_mismatch");
  });
  it("rejects missing credit and incorrect ledger values", () => {
    const rows = fixture();
    expect(() => plan({ ...rows, credit: null, verifiedEvent: verified(event()) })).toThrow("credit_mismatch");
    rows.credit!.payableAmountMinor = 1;
    expect(() => plan({ ...rows, verifiedEvent: verified(event()) })).toThrow("credit_mismatch");
  });
  it.each(["REFUNDED", "REVOKED"] as const)("refuses newly consuming %s credit", (status) => {
    const rows = fixture(); rows.creditSource!.status = status;
    expect(() => plan({ ...rows, verifiedEvent: verified(event()) })).toThrow("invalid_transition");
  });
  it.each(["FAILED", "CANCELLED", "REFUNDED"] as const)("never resurrects a %s purchase", (status) => {
    const rows = fixture(); rows.purchase.status = status;
    expect(() => plan({ ...rows, verifiedEvent: verified(event()) })).toThrow("invalid_transition");
  });
  it("recognises paid replay without granting/reactivating any entitlement", () => {
    const rows = fixture(); rows.purchase.status = "PAID";
    rows.purchase.providerIntentReference = "pi_payment1"; rows.credit!.status = "CONSUMED";
    expect(plan({ ...rows, verifiedEvent: verified(event()) })).toEqual({ action: "replay", credit: "none" });
  });
  it.each(["checkout.session.expired", "checkout.session.async_payment_failed"])("releases reserved credit on %s", (type) => {
    const rows = fixture();
    expect(plan({ ...rows, verifiedEvent: verified(event(70000, type)) })).toEqual({
      action: type.endsWith("expired") ? "cancel" : "fail", credit: "release",
    });
  });
  it("requires the matching payment intent for a refund and keeps spent credit consumed", () => {
    const rows = fixture(); rows.purchase.status = "PAID";
    rows.purchase.providerIntentReference = "pi_payment1"; rows.credit!.status = "CONSUMED";
    const payload = { id: "evt_refund", type: "charge.refunded", livemode: false, data: { object: {
      id: "ch_synthetic", livemode: false, metadata: { purchase_id: "purchase-1" },
      payment_intent: "pi_payment1", amount: 70000, amount_refunded: 70000, refunded: true, currency: "aud",
    } } } as unknown as Stripe.Event;
    expect(plan({ ...rows, verifiedEvent: verified(payload) })).toEqual({
      action: "refund", credit: "keep_consumed", paymentIntentId: "pi_payment1",
    });
    rows.purchase.providerIntentReference = "pi_other";
    expect(() => plan({ ...rows, verifiedEvent: verified(payload) })).toThrow("purchase_mismatch");
  });
});
