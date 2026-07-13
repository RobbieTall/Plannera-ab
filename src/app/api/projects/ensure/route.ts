import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createProjectForRequester, getOrCreateCurrentProject } from "@/lib/projects";
import { getUserContext } from "@/lib/getUserContext";

const requestSchema = z.object({
  title: z.string().trim().optional(),
  name: z.string().trim().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getUserContext();

  const body = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
  const { title, name } = requestSchema.parse(body ?? {});

  const requestedTitle = title ?? name ?? undefined;
  const project = requestedTitle
    ? await createProjectForRequester(session.sessionId, session.userId, requestedTitle)
    : await getOrCreateCurrentProject(session.sessionId, session.userId, requestedTitle);

  const response = NextResponse.json({
    project: {
      id: project.id,
      title: project.title,
    },
  });
  return response;
}
