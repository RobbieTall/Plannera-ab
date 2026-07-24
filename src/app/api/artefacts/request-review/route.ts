import { NextResponse, type NextRequest } from "next/server";

import {
  ArtefactAccessError,
  ArtefactValidationError,
  createExpertReviewRequestArtefact,
  requireSessionUser,
} from "@/lib/artefact-service";
import { recordCommercialFunnelEventSafely } from "@/lib/commercial-funnel-events";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSessionUser();
    const { artefact, content } = await createExpertReviewRequestArtefact({
      body: await request.json(),
      userId,
    });
    await recordCommercialFunnelEventSafely({
      eventName: "EXPERT_REVIEW_PACKAGE_GENERATED",
      projectId: artefact.projectId,
      artefactId: artefact.id,
      sourceRecordId: artefact.id,
      actorUserId: userId,
    });

    return NextResponse.json({ artefactId: artefact.id, content }, { status: 201 });
  } catch (error) {
    if (error instanceof ArtefactValidationError || error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[artefacts] Unexpected error while creating expert review request", error);
    return NextResponse.json({ error: "Unable to create expert review request" }, { status: 500 });
  }
}
