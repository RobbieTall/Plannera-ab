import { NextRequest, NextResponse } from "next/server";

import { deleteProjectForRequester, getProjectForRequester, renameProjectForRequester } from "@/lib/projects";
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

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletion = await deleteProjectForRequester(params.projectId, session.userId ?? null, session.sessionId);

  if (!deletion.count || deletion.count === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { title } = await request.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }

  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }

  const session = getSessionFromRequest(request);

  const result = await renameProjectForRequester(
    params.projectId,
    session?.userId ?? null,
    session?.sessionId ?? null,
    trimmedTitle,
  );

  if (!result.count) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
