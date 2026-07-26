import { NextResponse, type NextRequest } from "next/server";

import {
  ArtefactAccessError,
  ArtefactValidationError,
  createDetailedPlanningPackArtefact,
  requireSessionUser,
} from "@/lib/artefact-service";
import { recordDetailedPlanningPackMilestones } from "@/lib/commercial-funnel-events";
import { getPlanningPackCheckoutConfig, PLANNING_CONTROLS_PACK_TERMS } from "@/lib/planning-pack-commerce";
import { prisma } from "@/lib/prisma";
import { PurchaseEntitlementService } from "@/lib/purchase-entitlements";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSessionUser();
    const body = await request.json();
    const config = getPlanningPackCheckoutConfig();
    if (config.enabled) {
      if (typeof body?.projectId !== "string" || typeof body?.proposalBrief !== "string") {
        throw new ArtefactValidationError("Project and proposed works are required");
      }
      const entitlement = await new PurchaseEntitlementService(
        prisma,
        PLANNING_CONTROLS_PACK_TERMS,
      ).findActiveEntitlementForCurrentScope({
        userId,
        projectId: body.projectId,
        proposalBrief: body.proposalBrief,
      });
      if (!entitlement) {
        throw new ArtefactAccessError(
          "Payment is required for this exact Planning Controls Pack scope",
          402,
        );
      }
    }
    const { artefact, content } = await createDetailedPlanningPackArtefact({
      body,
      userId,
    });
    await recordDetailedPlanningPackMilestones({
      projectId: artefact.projectId,
      artefactId: artefact.id,
      commercialReady: content.commercialReady,
      actorUserId: userId,
    });

    return NextResponse.json({ artefactId: artefact.id, content }, { status: 201 });
  } catch (error) {
    if (error instanceof ArtefactValidationError || error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[artefacts] Unexpected error while generating Detailed Planning Pack", error);
    return NextResponse.json({ error: "Unable to generate Detailed Planning Pack" }, { status: 500 });
  }
}
