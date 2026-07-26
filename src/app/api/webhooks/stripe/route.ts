import { NextResponse, type NextRequest } from "next/server";

import { getPlanningPackCheckoutConfig, PLANNING_CONTROLS_PACK_TERMS } from "@/lib/planning-pack-commerce";
import { InvalidPlanningPackWebhookSignatureError, verifyAndApplyPlanningPackWebhook } from "@/lib/planning-pack-webhook";
import { prisma } from "@/lib/prisma";
import { PurchaseEntitlementService } from "@/lib/purchase-entitlements";
import { StripeCommerceProvider } from "@/lib/stripe-commerce";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const config = getPlanningPackCheckoutConfig();
  if (!config.enabled || !config.webhookSecret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rawBody = await request.text();
  try {
    await verifyAndApplyPlanningPackWebhook({
      rawBody,
      signature: request.headers.get("stripe-signature"),
      webhookSecret: config.webhookSecret,
      provider: new StripeCommerceProvider(config),
      service: new PurchaseEntitlementService(prisma, PLANNING_CONTROLS_PACK_TERMS),
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof InvalidPlanningPackWebhookSignatureError) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    console.error("[stripe-webhook] Event was not acknowledged and requires provider retry/reconciliation", error);
    return NextResponse.json({ error: "Event could not be applied" }, { status: 500 });
  }
}
