import { ArtefactValidationError } from "@/lib/artefact-service";
import { PLANNING_CONTROLS_PACK_TERMS } from "@/lib/planning-pack-commerce";
import type Stripe from "stripe";
import type { PaymentProvider } from "@/lib/stripe-commerce";

export type PlanningPackProviderEvent =
  | { kind: "paid"; purchaseId: string; sessionId: string; paymentIntentId: string; mode: string | null; paymentStatus: string; amountTotal: number | null; currency: string | null }
  | { kind: "failed" | "expired"; purchaseId: string; sessionId: string }
  | { kind: "refunded"; purchaseId: string; paymentIntentId: string; amountRefunded: number; currency: string; fullRefund: boolean };

export class InvalidPlanningPackWebhookSignatureError extends Error {}

export type PlanningPackEventService = {
  resolveWebhookPurchase(purchaseId: string, sessionId: string): Promise<{ id: string }>;
  bindProviderPaymentReference(purchaseId: string, paymentIntentId: string): Promise<unknown>;
  settlePaidPurchase(purchaseId: string): Promise<unknown>;
  markPurchaseFailed(purchaseId: string): Promise<unknown>;
  cancelPurchase(purchaseId: string): Promise<unknown>;
  providerConfirmedFullRefund(purchaseId: string, paymentIntentId: string): Promise<unknown>;
};

export async function applyPlanningPackProviderEvent(
  service: PlanningPackEventService,
  event: PlanningPackProviderEvent,
) {
  if (event.kind === "paid") {
    if (
      event.mode !== "payment" ||
      event.paymentStatus !== "paid" ||
      event.amountTotal !== PLANNING_CONTROLS_PACK_TERMS.amountMinor ||
      event.currency?.toUpperCase() !== PLANNING_CONTROLS_PACK_TERMS.currency ||
      !event.purchaseId || !event.sessionId || !event.paymentIntentId
    ) {
      throw new ArtefactValidationError("Paid checkout facts do not match the purchase terms");
    }
    const purchase = await service.resolveWebhookPurchase(event.purchaseId, event.sessionId);
    await service.bindProviderPaymentReference(purchase.id, event.paymentIntentId);
    await service.settlePaidPurchase(purchase.id);
    return;
  }
  if (event.kind === "refunded") {
    if (
      !event.fullRefund ||
      event.amountRefunded !== PLANNING_CONTROLS_PACK_TERMS.amountMinor ||
      event.currency.toUpperCase() !== PLANNING_CONTROLS_PACK_TERMS.currency
    ) {
      throw new ArtefactValidationError("Refund is not the confirmed full purchase amount");
    }
    await service.providerConfirmedFullRefund(event.purchaseId, event.paymentIntentId);
    return;
  }
  const purchase = await service.resolveWebhookPurchase(event.purchaseId, event.sessionId);
  if (event.kind === "failed") await service.markPurchaseFailed(purchase.id);
  else await service.cancelPurchase(purchase.id);
}

const opaqueId = (value: string | Stripe.PaymentIntent | null) => typeof value === "string" ? value : value?.id;

export function normalizeStripePlanningPackEvent(event: Stripe.Event): PlanningPackProviderEvent | null {
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"].includes(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    const purchaseId = session.metadata?.purchase_id;
    if (!purchaseId) throw new ArtefactValidationError("Invalid event reference");
    if ((event.type === "checkout.session.completed" && session.payment_status === "paid") || event.type === "checkout.session.async_payment_succeeded") {
      return { kind: "paid", purchaseId, sessionId: session.id, paymentIntentId: opaqueId(session.payment_intent) ?? "", mode: session.mode, paymentStatus: session.payment_status, amountTotal: session.amount_total, currency: session.currency };
    }
    if (event.type === "checkout.session.async_payment_failed") return { kind: "failed", purchaseId, sessionId: session.id };
    if (event.type === "checkout.session.expired") return { kind: "expired", purchaseId, sessionId: session.id };
    return null;
  }
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const purchaseId = charge.metadata?.purchase_id;
    const paymentIntentId = opaqueId(charge.payment_intent);
    if (!purchaseId || !paymentIntentId) throw new ArtefactValidationError("Invalid event reference");
    return { kind: "refunded", purchaseId, paymentIntentId, amountRefunded: charge.amount_refunded, currency: charge.currency, fullRefund: charge.refunded && charge.amount_refunded === charge.amount };
  }
  if (event.type === "refund.updated" || event.type === "refund.created") {
    const refund = event.data.object as Stripe.Refund;
    const purchaseId = refund.metadata?.purchase_id;
    const paymentIntentId = opaqueId(refund.payment_intent);
    if (refund.status === "succeeded" && purchaseId && paymentIntentId) return { kind: "refunded", purchaseId, paymentIntentId, amountRefunded: refund.amount, currency: refund.currency, fullRefund: true };
  }
  return null;
}

export async function verifyAndApplyPlanningPackWebhook(params: {
  rawBody: string;
  signature?: string | null;
  webhookSecret: string;
  provider: PaymentProvider;
  service: PlanningPackEventService;
}) {
  if (!params.signature) throw new InvalidPlanningPackWebhookSignatureError("Invalid signature");
  let event: Stripe.Event;
  try {
    event = params.provider.verifyWebhook(params.rawBody, params.signature, params.webhookSecret);
  } catch {
    throw new InvalidPlanningPackWebhookSignatureError("Invalid signature");
  }
  const normalized = normalizeStripePlanningPackEvent(event);
  if (normalized) await applyPlanningPackProviderEvent(params.service, normalized);
  return event.id;
}
