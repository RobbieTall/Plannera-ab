import { NextResponse, type NextRequest } from "next/server";

import { ArtefactAccessError, requireSessionUser } from "@/lib/artefact-service";
import { reviewSpatialEvidence, SpatialEvidenceError } from "@/lib/spatial-evidence";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; artefactId: string } },
) {
  try {
    const { userId } = await requireSessionUser();
    const spatialEvidence = await reviewSpatialEvidence({
      artefactId: params.artefactId,
      body: await request.json(),
      projectId: params.projectId,
      userId,
    });
    return NextResponse.json({ spatialEvidence });
  } catch (error) {
    if (error instanceof SpatialEvidenceError || error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[spatial-evidence-review] Unexpected error", error);
    return NextResponse.json({ error: "Unable to review spatial evidence" }, { status: 500 });
  }
}
