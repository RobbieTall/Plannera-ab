import Stripe from "stripe";

import type { PlanningPackCheckoutConfig } from "@/lib/planning-pack-commerce";

export type HostedCheckoutInput = {
  purchaseId: string;
  amountMinor: number;
  currency: string;
  productName: string;
  idempotencyKey: string;
};

export interface PaymentProvider {
  createHostedCheckout(input: HostedCheckoutInput): Promise<{ id: string; url: string }>;
  verifyWebhook(rawBody: string, signature: string, secret: string): Stripe.Event;
}

export interface RefundProvider {
  requestFullRefund(providerPaymentReference: string, purchaseId: string, idempotencyKey: string): Promise<{ id: string; confirmed: boolean }>;
}

export class StripeCommerceProvider implements PaymentProvider, RefundProvider {
  private readonly stripe: Stripe;

  constructor(private readonly config: PlanningPackCheckoutConfig, stripeClient?: Stripe) {
    if (!config.secretKey || !config.successUrl || !config.cancelUrl) {
      throw new Error("Stripe checkout configuration is incomplete");
    }
    this.stripe = stripeClient ?? new Stripe(config.secretKey);
  }

  async createHostedCheckout(input: HostedCheckoutInput) {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        success_url: this.config.successUrl!,
        cancel_url: this.config.cancelUrl!,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amountMinor,
              tax_behavior: "inclusive",
              product_data: { name: input.productName },
            },
          },
        ],
        metadata: { purchase_id: input.purchaseId },
        payment_intent_data: { metadata: { purchase_id: input.purchaseId } },
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { id: session.id, url: session.url };
  }

  verifyWebhook(rawBody: string, signature: string, secret: string) {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  async requestFullRefund(providerPaymentReference: string, purchaseId: string, idempotencyKey: string) {
    const refund = await this.stripe.refunds.create(
      { payment_intent: providerPaymentReference, metadata: { purchase_id: purchaseId } },
      { idempotencyKey },
    );
    return { id: refund.id, confirmed: refund.status === "succeeded" };
  }
}
