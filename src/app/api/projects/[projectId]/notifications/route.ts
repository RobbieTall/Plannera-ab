import { NextResponse, type NextRequest } from "next/server";

import { ArtefactAccessError, requireSessionUser } from "@/lib/artefact-service";
import { prisma } from "@/lib/prisma";

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

    const notifications = await prisma.projectNotification.findMany({
      where: { projectId: project.id, readAt: null },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        lgaCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    if (error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[project-notifications] Unexpected error while listing notifications", error);
    return NextResponse.json({ error: "Unable to list project notifications" }, { status: 500 });
  }
}
