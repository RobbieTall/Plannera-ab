import type { Entitlement, Purchase, SubmissionSeeCredit } from "@prisma/client";
import type Stripe from "stripe";
import { normalizeStripePlanningPackEvent, type PlanningPackProviderEvent } from "./planning-pack-webhook";
import { SUBMISSION_SEE_COMMERCIAL_TERMS as terms, submissionSeeScopeKey } from "./submission-see-credit";
import type { PaymentProvider } from "./stripe-commerce";

export class SubmissionSeePaymentPolicyError extends Error {
  constructor(readonly code: "preview_disabled" | "invalid_signature" | "not_test_event" |
    "purchase_mismatch" | "terms_mismatch" | "credit_mismatch" | "invalid_transition") {
    super(code);
  }
}

const verified = Symbol("verified-submission-see-preview-event");
export type VerifiedSubmissionSeeEvent = {
  readonly [verified]: true;
  readonly event: PlanningPackProviderEvent;
};

type PreviewGate = {
  deploymentEnvironment?: string;
  enabled?: string;
  secretKey?: string;
};

/** Signature verification precedes purchase lookup. No database or provider writes occur here. */
export function verifySubmissionSeePreviewEvent(input: {
  gate: PreviewGate;
  rawBody: string;
  signature: string | null;
  webhookSecret: string;
  provider: Pick<PaymentProvider, "verifyWebhook">;
}): VerifiedSubmissionSeeEvent | null {
  if (input.gate.deploymentEnvironment !== "preview" || input.gate.enabled !== "true" ||
    !/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(input.gate.secretKey ?? "")) {
    throw new SubmissionSeePaymentPolicyError("preview_disabled");
  }
  if (!input.signature || !input.webhookSecret) {
    throw new SubmissionSeePaymentPolicyError("invalid_signature");
  }
  let event: Stripe.Event;
  try {
    event = input.provider.verifyWebhook(input.rawBody, input.signature, input.webhookSecret);
  } catch {
    throw new SubmissionSeePaymentPolicyError("invalid_signature");
  }
  const object = event.data.object as { livemode?: boolean };
  if (event.livemode !== false || object.livemode !== false) {
    throw new SubmissionSeePaymentPolicyError("not_test_event");
  }
  let normalized: PlanningPackProviderEvent | null;
  try {
    normalized = normalizeStripePlanningPackEvent(event);
  } catch {
    throw new SubmissionSeePaymentPolicyError("purchase_mismatch");
  }
  return normalized ? { [verified]: true, event: normalized } : null;
}

export type SeePaymentPurchase = Pick<Purchase,
  "id" | "userId" | "projectId" | "quickSiteCheckArtefactId" | "proposalFingerprint" |
  "productCode" | "productVersion" | "scopeKey" | "amountMinor" | "currency" |
  "status" | "providerName" | "providerReference" | "providerIntentReference">;
export type SeePaymentCredit = Pick<SubmissionSeeCredit,
  "targetPurchaseId" | "sourceEntitlementId" | "scopeKey" | "listAmountMinor" |
  "creditAmountMinor" | "payableAmountMinor" | "currency" | "status">;
export type SeePaymentCreditSource = Pick<Entitlement,
  "id" | "userId" | "projectId" | "quickSiteCheckArtefactId" | "proposalFingerprint" |
  "productCode" | "productVersion" | "status">;
export type SeePaymentTransition =
  | { action: "settle"; credit: "consume" | "none"; paymentIntentId: string }
  | { action: "fail" | "cancel"; credit: "release" | "none" }
  | { action: "refund"; credit: "keep_consumed" | "none"; paymentIntentId: string }
  | { action: "replay"; credit: "none" };

const reject = (code: ConstructorParameters<typeof SubmissionSeePaymentPolicyError>[0]): never => {
  throw new SubmissionSeePaymentPolicyError(code);
};

/**
 * Plan only: the caller MUST reload these rows and apply the transition in ONE serializable
 * transaction, including credit and entitlement writes. This function never grants access.
 * A replay must not reactivate a revoked/refunded entitlement. No refund is requested here.
 */
export function planSubmissionSeePaymentTransition(input: {
  verifiedEvent: VerifiedSubmissionSeeEvent;
  purchase: SeePaymentPurchase;
  credit: SeePaymentCredit | null;
  creditSource: SeePaymentCreditSource | null;
}): SeePaymentTransition {
  if (input.verifiedEvent[verified] !== true) return reject("invalid_signature");
  const { event } = input.verifiedEvent;
  const { purchase: p, credit, creditSource: source } = input;
  if (![p.id, p.userId, p.projectId, p.quickSiteCheckArtefactId].every(
    (value) => typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value),
  ) || !/^[a-f0-9]{64}$/.test(p.proposalFingerprint) ||
    p.productCode !== terms.productCode || p.productVersion !== terms.productVersion ||
    p.scopeKey !== submissionSeeScopeKey(p) || p.providerName !== "stripe" ||
    !/^cs_test_[A-Za-z0-9]+$/.test(p.providerReference ?? "") || p.id !== event.purchaseId) {
    return reject("purchase_mismatch");
  }
  if (p.currency !== terms.currency || !Number.isSafeInteger(p.amountMinor) ||
    ![terms.listAmountMinor, terms.creditedPayableMinor].includes(p.amountMinor)) {
    return reject("terms_mismatch");
  }
  const discounted = p.amountMinor === terms.creditedPayableMinor;
  if (!discounted && (credit !== null || source !== null)) return reject("credit_mismatch");
  if (discounted) {
    if (!credit || !source || credit.targetPurchaseId !== p.id ||
      credit.sourceEntitlementId !== source.id || credit.scopeKey !== p.scopeKey ||
      credit.listAmountMinor !== terms.listAmountMinor ||
      credit.creditAmountMinor !== terms.planningPackCreditMinor ||
      credit.payableAmountMinor !== p.amountMinor || credit.currency !== terms.currency ||
      source.productCode !== "planning_controls_pack" || source.productVersion !== "v1" ||
      source.userId !== p.userId || source.projectId !== p.projectId ||
      source.quickSiteCheckArtefactId !== p.quickSiteCheckArtefactId ||
      source.proposalFingerprint !== p.proposalFingerprint) return reject("credit_mismatch");
  }

  if (event.kind !== "refunded" && event.sessionId !== p.providerReference) {
    return reject("purchase_mismatch");
  }
  if (event.kind === "paid" || event.kind === "refunded") {
    if (!/^pi_[A-Za-z0-9]+$/.test(event.paymentIntentId) ||
      (p.providerIntentReference !== null && p.providerIntentReference !== event.paymentIntentId)) {
      return reject("purchase_mismatch");
    }
    const amount = event.kind === "paid" ? event.amountTotal : event.amountRefunded;
    if (amount !== p.amountMinor || event.currency?.toUpperCase() !== p.currency ||
      (event.kind === "paid" && (event.mode !== "payment" || event.paymentStatus !== "paid")) ||
      (event.kind === "refunded" && !event.fullRefund)) return reject("terms_mismatch");
  }

  if (event.kind === "paid") {
    if (p.status === "PAID") {
      if (p.providerIntentReference !== event.paymentIntentId ||
        (discounted && credit?.status !== "CONSUMED")) return reject("invalid_transition");
      return { action: "replay", credit: "none" };
    }
    if (p.status !== "PENDING" ||
      (discounted && (credit?.status !== "RESERVED" || source?.status !== "ACTIVE"))) {
      return reject("invalid_transition");
    }
    return { action: "settle", credit: discounted ? "consume" : "none", paymentIntentId: event.paymentIntentId };
  }
  if (event.kind === "refunded") {
    // Refund-before-settlement requires reconciliation, never a fabricated paid entitlement.
    if (!["PAID", "REFUNDED"].includes(p.status) ||
      p.providerIntentReference !== event.paymentIntentId ||
      (discounted && credit?.status !== "CONSUMED")) return reject("invalid_transition");
    return p.status === "REFUNDED" ? { action: "replay", credit: "none" } :
      { action: "refund", credit: discounted ? "keep_consumed" : "none", paymentIntentId: event.paymentIntentId };
  }
  const terminal = event.kind === "failed" ? "FAILED" : "CANCELLED";
  if (p.status === terminal && (!discounted || credit?.status === "RELEASED")) {
    return { action: "replay", credit: "none" };
  }
  if (p.status !== "PENDING" || (discounted && credit?.status !== "RESERVED")) {
    return reject("invalid_transition");
  }
  return { action: event.kind === "failed" ? "fail" : "cancel", credit: discounted ? "release" : "none" };
}
