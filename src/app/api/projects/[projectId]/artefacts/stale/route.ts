import type { ArtefactType } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { ArtefactAccessError, requireSessionUser } from "@/lib/artefact-service";
import { prisma } from "@/lib/prisma";

const STALE_REGENERABLE_TYPES: ArtefactType[] = ["quick_site_check", "pre_see_planning_memo"];

export async function GET(_request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const { userId } = await requireSessionUser();

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

    const staleArtefacts = await prisma.artefact.findMany({
      where: {
        projectId: project.id,
        staleAt: { not: null },
        type: { in: STALE_REGENERABLE_TYPES },
      },
      select: {
        id: true,
        type: true,
        staleAt: true,
        createdAt: true,
      },
      orderBy: { staleAt: "desc" },
    });

    return NextResponse.json({
      staleArtefacts: staleArtefacts.map((artefact) => ({
        id: artefact.id,
        type: artefact.type,
        staleAt: artefact.staleAt,
        createdAt: artefact.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[artefacts] Unexpected error while listing stale artefacts", error);
    return NextResponse.json({ error: "Unable to list stale artefacts" }, { status: 500 });
  }
}
