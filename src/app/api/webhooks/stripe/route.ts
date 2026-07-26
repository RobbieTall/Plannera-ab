import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { getPlanningPackCheckoutConfig, PLANNING_CONTROLS_PACK_TERMS } from "@/lib/planning-pack-commerce";
import { prisma } from "@/lib/prisma";
import { PurchaseEntitlementService } from "@/lib/purchase-entitlements";
import { StripeCommerceProvider } from "@/lib/stripe-commerce";

export const dynamic = "force-dynamic";

const opaqueId = (value: string | Stripe.PaymentIntent | null) => typeof value === "string" ? value : value?.id;

export async function POST(request: NextRequest) {
  let event: Stripe.Event;
  try {
    const config = getPlanningPackCheckoutConfig();
    if (!config.enabled || !config.webhookSecret) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const signature = request.headers.get("stripe-signature");
    if (!signature) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    const rawBody = await request.text();
    event = new StripeCommerceProvider(config).verifyWebhook(rawBody, signature, config.webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const service = new PurchaseEntitlementService(prisma, PLANNING_CONTROLS_PACK_TERMS);
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"].includes(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;
      const purchaseId = session.metadata?.purchase_id;
      if (!purchaseId) return NextResponse.json({ error: "Invalid event reference" }, { status: 400 });
      const purchase = await service.resolveWebhookPurchase(purchaseId, session.id);
      if ((event.type === "checkout.session.completed" && session.payment_status === "paid") || event.type === "checkout.session.async_payment_succeeded") {
        if (purchase.status === "PENDING" || purchase.status === "PAID") {
          await service.bindProviderPaymentReference(purchase.id, opaqueId(session.payment_intent));
          await service.settlePaidPurchase(purchase.id);
        }
      } else if (event.type === "checkout.session.async_payment_failed" && purchase.status === "PENDING") {
        await service.markPurchaseFailed(purchase.id);
      } else if (event.type === "checkout.session.expired" && purchase.status === "PENDING") {
        await service.cancelPurchase(purchase.id);
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = opaqueId(charge.payment_intent);
      const purchase = paymentIntentId ? await prisma.purchase.findFirst({
        where: { providerName: "stripe", providerIntentReference: paymentIntentId },
      }) : null;
      if (!purchase) {
        return NextResponse.json({ error: "Invalid event reference" }, { status: 400 });
      }
      if (charge.refunded && purchase.status === "PAID") await service.refundPurchase(purchase.id);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe-webhook] Verified event could not be applied", event.id, error);
    return NextResponse.json({ error: "Event could not be applied" }, { status: 500 });
  }
}
