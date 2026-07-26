import { NextResponse, type NextRequest } from "next/server";

import { ArtefactAccessError, ArtefactValidationError, requireSessionUser } from "@/lib/artefact-service";
import { getPlanningPackCheckoutConfig, PLANNING_CONTROLS_PACK_TERMS } from "@/lib/planning-pack-commerce";
import { prisma } from "@/lib/prisma";
import { PurchaseEntitlementService } from "@/lib/purchase-entitlements";
import { StripeCommerceProvider } from "@/lib/stripe-commerce";
import { createPlanningPackCheckout } from "@/lib/planning-pack-checkout";

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
    const checkout = await createPlanningPackCheckout(
      service,
      new StripeCommerceProvider(config),
      { userId, projectId: body.projectId, proposalBrief: body.proposalBrief },
    );
    return NextResponse.json({ checkoutUrl: checkout.url });
  } catch (error) {
    if (error instanceof ArtefactValidationError || error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[planning-pack-checkout] Checkout creation failed", error);
    return NextResponse.json({ error: "Planning Controls Pack checkout is temporarily unavailable" }, { status: 503 });
  }
}
