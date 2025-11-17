import { NextResponse, type NextRequest } from "next/server";

import {
  ArtefactAccessError,
  ArtefactValidationError,
  createMapSnapshotArtefact,
  listProjectArtefacts,
  requireSessionUser,
} from "@/lib/artefact-service";

export async function GET(_request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const { userId } = await requireSessionUser();
    const artefacts = await listProjectArtefacts(params.projectId, userId);

    return NextResponse.json(artefacts);
  } catch (error) {
    if (error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[artefacts] Unexpected error while listing artefacts", error);
    return NextResponse.json({ error: "Unable to list artefacts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const { userId } = await requireSessionUser();
    const formData = await request.formData();

    const artefact = await createMapSnapshotArtefact({
      formData,
      projectId: params.projectId,
      userId,
    });

    return NextResponse.json(artefact, { status: 201 });
  } catch (error) {
    if (error instanceof ArtefactValidationError || error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[artefacts] Unexpected error while creating map snapshot", error);
    return NextResponse.json({ error: "Unable to create map snapshot" }, { status: 500 });
  }
}
