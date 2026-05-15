import { NextResponse, type NextRequest } from "next/server";

import {
  ArtefactAccessError,
  ArtefactValidationError,
  createPreSeePlanningMemoArtefact,
  requireSessionUser,
} from "@/lib/artefact-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSessionUser();
    const { artefact, content } = await createPreSeePlanningMemoArtefact({
      body: await request.json(),
      userId,
    });

    return NextResponse.json(
      {
        artefactId: artefact.id,
        content,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ArtefactValidationError || error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[artefacts] Unexpected error while generating pre-SEE planning memo", error);
    return NextResponse.json({ error: "Unable to generate pre-SEE planning memo" }, { status: 500 });
  }
}
