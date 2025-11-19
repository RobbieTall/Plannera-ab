import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getCandidateById,
  getSiteContextForProject,
  persistSiteContextFromCandidate,
  serializeSiteContext,
} from "@/lib/site-context";

const getSchema = z.object({ projectId: z.string() });

const updateSchema = z.object({
  projectId: z.string(),
  candidateId: z.string(),
  addressInput: z.string().min(3),
});

const buildErrorPayload = (message: string) => ({ error: "site_context_error", message });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const { projectId: parsedProjectId } = getSchema.parse({ projectId });
    const siteContext = await getSiteContextForProject(parsedProjectId);
    return NextResponse.json({ siteContext: serializeSiteContext(siteContext) });
  } catch (error) {
    console.error("[site-context-get]", error);
    return NextResponse.json(buildErrorPayload("Unable to load site context."), { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, candidateId, addressInput } = updateSchema.parse(body);
    const candidate = await getCandidateById(candidateId);
    if (!candidate) {
      return NextResponse.json(buildErrorPayload("Site candidate not found."), { status: 404 });
    }
    const siteContext = await persistSiteContextFromCandidate({ projectId, addressInput, candidate });
    return NextResponse.json({ siteContext: serializeSiteContext(siteContext) });
  } catch (error) {
    console.error("[site-context-update]", error);
    return NextResponse.json(buildErrorPayload("Unable to save the selected site."), { status: 400 });
  }
}
