import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getSiteContextForProject,
  persistManualSiteContext,
  persistSiteContextFromCandidate,
  serializeSiteContext,
} from "@/lib/site-context";

const getSchema = z.object({ projectId: z.string() });

const candidateSchema = z.object({
  id: z.string(),
  formattedAddress: z.string(),
  lgaName: z.string().nullable(),
  lgaCode: z.string().nullable().optional(),
  parcelId: z.string().nullable().optional(),
  lot: z.string().nullable().optional(),
  planNumber: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  zone: z.string().nullable().optional(),
  confidence: z.number().optional(),
});

const updateSchema = z.object({
  projectId: z.string(),
  candidate: candidateSchema,
  addressInput: z.string().min(3),
});

const manualSchema = z.object({
  projectId: z.string(),
  rawAddress: z.string().min(3),
  resolverStatus: z.string().optional(),
  lgaName: z.string().nullable().optional(),
  lgaCode: z.string().nullable().optional(),
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
    if ("rawAddress" in body && !("candidate" in body)) {
      const { projectId, rawAddress, lgaCode, lgaName } = manualSchema.parse(body);
      const siteContext = await persistManualSiteContext({
        projectId,
        rawAddress,
        lgaCode,
        lgaName,
        resolverStatus: body?.resolverStatus ?? null,
      });
      return NextResponse.json({ siteContext: serializeSiteContext(siteContext) });
    }

    const { projectId, candidate, addressInput } = updateSchema.parse(body);
    const siteContext = await persistSiteContextFromCandidate({ projectId, addressInput, candidate });
    return NextResponse.json({ siteContext: serializeSiteContext(siteContext) });
  } catch (error) {
    console.error("[site-context-update]", error);
    return NextResponse.json(buildErrorPayload("Unable to save the selected site."), { status: 400 });
  }
}
