import { NextResponse, type NextRequest } from "next/server";

import {
  ArtefactAccessError,
  ArtefactValidationError,
  createPlanningFeasibilitySummaryArtefact,
  requireSessionUser,
} from "@/lib/artefact-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSessionUser();
    const { artefact, content } = await createPlanningFeasibilitySummaryArtefact({
      body: await request.json(),
      userId,
    });

    return NextResponse.json({ artefactId: artefact.id, content }, { status: 201 });
  } catch (error) {
    if (error instanceof ArtefactValidationError || error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[artefacts] Unexpected error while generating Planning Feasibility Summary", error);
    return NextResponse.json({ error: "Unable to generate Planning Feasibility Summary" }, { status: 500 });
  }
}
