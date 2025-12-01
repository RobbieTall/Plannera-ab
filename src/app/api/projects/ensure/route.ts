import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateCurrentProject } from "@/lib/projects";
import { getSessionContext } from "@/lib/getSessionContext";

const requestSchema = z.object({
  title: z.string().trim().optional(),
  name: z.string().trim().optional(),
});

export async function POST(request: NextRequest) {
  const session = getSessionContext();

  const body = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
  const { title, name } = requestSchema.parse(body ?? {});

  const project = await getOrCreateCurrentProject(session.sessionId, session.userId, title ?? name ?? undefined);

  const response = NextResponse.json({
    project: {
      id: project.id,
      title: project.title,
    },
  });
  return response;
}
