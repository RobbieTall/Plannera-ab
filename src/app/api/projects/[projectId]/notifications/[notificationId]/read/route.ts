import { NextResponse, type NextRequest } from "next/server";

import { ArtefactAccessError, requireSessionUser } from "@/lib/artefact-service";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: { projectId: string; notificationId: string } },
) {
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

    const updated = await prisma.projectNotification.updateMany({
      where: { id: params.notificationId, projectId: project.id },
      data: { readAt: new Date() },
    });

    if (updated.count !== 1) {
      throw new ArtefactAccessError("Notification not found or access denied");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[project-notifications] Unexpected error while marking notification read", error);
    return NextResponse.json({ error: "Unable to update project notification" }, { status: 500 });
  }
}
