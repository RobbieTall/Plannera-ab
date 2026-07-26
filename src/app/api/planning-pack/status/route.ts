import { NextResponse, type NextRequest } from "next/server";

import { ArtefactAccessError, ArtefactValidationError, requireSessionUser } from "@/lib/artefact-service";
import { getPlanningPackCheckoutConfig, PLANNING_CONTROLS_PACK_TERMS, type PlanningPackEnabledStatusResponse } from "@/lib/planning-pack-commerce";
import { prisma } from "@/lib/prisma";
import { PurchaseEntitlementService } from "@/lib/purchase-entitlements";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const config = getPlanningPackCheckoutConfig();
    if (!config.enabled) return NextResponse.json({ enabled: false, state: "free" });
    const { userId } = await requireSessionUser();
    const body = (await request.json()) as { projectId?: unknown; proposalBrief?: unknown };
    if (typeof body.projectId !== "string" || typeof body.proposalBrief !== "string") throw new ArtefactValidationError("Project and proposed works are required");
    const status = await new PurchaseEntitlementService(prisma, PLANNING_CONTROLS_PACK_TERMS)
      .findCurrentScopePurchaseStatus({ userId, projectId: body.projectId, proposalBrief: body.proposalBrief });
    const response = { enabled: true, ...status } satisfies PlanningPackEnabledStatusResponse;
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ArtefactValidationError || error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to check purchase status" }, { status: 500 });
  }
}
