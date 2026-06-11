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
      throw new ArtefactAccessError("Project not found or access denied", 404);
    }

    const newestMessages = await prisma.chatMessage.findMany({
      where: { projectId: project.id },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
        confidenceScore: true,
        confidenceBreakdown: true,
        lepSourceRefs: true,
        reactions: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const messages = newestMessages.reverse().map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      confidenceScore: message.confidenceScore,
      confidenceBreakdown: message.confidenceBreakdown,
      lepSourceRefs: message.lepSourceRefs ?? [],
      reactions: message.reactions ?? {},
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[project-chat-history] Unexpected error while listing chat history", error);
    return NextResponse.json({ error: "Unable to list project chat history" }, { status: 500 });
  }
}
