import { NextResponse, type NextRequest } from "next/server";

import { ArtefactAccessError, ArtefactValidationError, requireSessionUser } from "@/lib/artefact-service";
import { normalizeRegenerableArtefactType, triggerArtefactRegeneration } from "@/lib/artefact-regeneration";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; artefactId: string } },
) {
  try {
    const { userId } = await requireSessionUser();
    const body = (await request.json()) as { artefactType?: string };

    if (!body.artefactType) {
      throw new ArtefactValidationError("artefactType is required");
    }

    const normalizedArtefactType = normalizeRegenerableArtefactType(body.artefactType);

    if (!normalizedArtefactType) {
      return NextResponse.json({ reason: "Unsupported artefact type" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: params.projectId }, { publicId: params.projectId }],
        AND: [{ OR: [{ createdById: userId }, { userId }, { collaborators: { some: { userId } } }] }],
      },
      select: { id: true },
    });

    if (!project) {
      throw new ArtefactAccessError("Project not found or access denied");
    }

    const staleArtefact = await prisma.artefact.findFirst({
      where: {
        id: params.artefactId,
        projectId: project.id,
        staleAt: { not: null },
        type: normalizedArtefactType,
      },
      select: { id: true },
    });

    if (!staleArtefact) {
      return NextResponse.json({ reason: "Stale artefact not found" }, { status: 400 });
    }

    const result = await triggerArtefactRegeneration(project.id, userId, normalizedArtefactType, params.artefactId);

    if (!result.queued || !result.newArtefactId) {
      return NextResponse.json({ reason: result.reason ?? "Unable to regenerate artefact" }, { status: 400 });
    }

    return NextResponse.json({ success: true, newArtefactId: result.newArtefactId });
  } catch (error) {
    if (error instanceof ArtefactValidationError || error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[artefacts] Unexpected error while regenerating artefact", error);
    return NextResponse.json({ error: "Unable to regenerate artefact" }, { status: 500 });
  }
}
