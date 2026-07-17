import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createProjectForRequester, listProjectsForRequester } from "@/lib/projects";
import { getSessionFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  title: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = requestSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const project = await createProjectForRequester(session.sessionId, session.userId, parsedBody.data.title);
    return NextResponse.json({
      project: {
        ...project,
        updatedAt: project.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[projects-create]", error);
    return NextResponse.json({ error: "Unable to create project" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await listProjectsForRequester(session.userId ?? null, session.sessionId);
    return NextResponse.json({
      projects: projects.map((project) => ({
        ...project,
        updatedAt: project.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[projects-list]", error);
    return NextResponse.json({ error: "Unable to list projects" }, { status: 500 });
  }
}
