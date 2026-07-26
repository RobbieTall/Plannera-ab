import { NextResponse, type NextRequest } from "next/server";

import { ArtefactAccessError, ArtefactValidationError, requireSessionUser } from "@/lib/artefact-service";
import { getPlanningPackCheckoutConfig, PLANNING_CONTROLS_PACK_TERMS } from "@/lib/planning-pack-commerce";
import { prisma } from "@/lib/prisma";
import { PurchaseEntitlementService } from "@/lib/purchase-entitlements";
import { StripeCommerceProvider } from "@/lib/stripe-commerce";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const config = getPlanningPackCheckoutConfig();
    if (!config.enabled) throw new ArtefactAccessError("Planning Controls Pack checkout is not enabled", 404);
    const { userId } = await requireSessionUser();
    const body = (await request.json()) as { projectId?: unknown; proposalBrief?: unknown };
    if (typeof body.projectId !== "string" || typeof body.proposalBrief !== "string") {
      throw new ArtefactValidationError("Project and proposed works are required");
    }
    const service = new PurchaseEntitlementService(prisma, PLANNING_CONTROLS_PACK_TERMS);
    const purchase = await service.createOrReusePendingIntent({ userId, projectId: body.projectId, proposalBrief: body.proposalBrief });
    const checkout = await new StripeCommerceProvider(config).createHostedCheckout({
      purchaseId: purchase.id,
      amountMinor: PLANNING_CONTROLS_PACK_TERMS.amountMinor,
      currency: PLANNING_CONTROLS_PACK_TERMS.currency,
      productName: "Planning Controls Pack — A$49 incl. GST",
      idempotencyKey: purchase.idempotencyKey,
    });
    await service.attachProviderCheckout(purchase.id, checkout.id);
    return NextResponse.json({ checkoutUrl: checkout.url });
  } catch (error) {
    if (error instanceof ArtefactValidationError || error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[planning-pack-checkout] Checkout creation failed", error);
    return NextResponse.json({ error: "Planning Controls Pack checkout is temporarily unavailable" }, { status: 503 });
  }
}
