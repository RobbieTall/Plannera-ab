import { NextRequest, NextResponse } from "next/server";

import { deleteProjectForUser, getProjectForRequester } from "@/lib/projects";
import { getSessionFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { projectId: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = getSessionFromRequest(request);
  const project = await getProjectForRequester(params.projectId, session?.sessionId, session?.userId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    project: {
      id: project.id,
      title: project.title,
      address: project.address,
      zoning: project.zoning,
      updatedAt: project.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = getSessionFromRequest(request);

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletion = await deleteProjectForUser(session.userId, params.projectId);

  if (!deletion.count || deletion.count === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
