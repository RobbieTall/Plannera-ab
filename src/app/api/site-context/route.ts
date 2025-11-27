import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getSiteContextForProject,
  persistManualSiteContext,
  persistSiteContextFromCandidate,
  serializeSiteContext,
} from "@/lib/site-context";
import { prisma } from "@/lib/prisma";
import { findProjectByExternalId, normalizeProjectId } from "@/lib/project-identifiers";
import { persistableCandidateSchema } from "./schema";

const getSchema = z.object({ projectId: z.string() });

const updateSchema = z.object({
  projectId: z.string(),
  candidate: persistableCandidateSchema,
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
    const project = await findProjectByExternalId(prisma, normalizeProjectId(parsedProjectId));
    return NextResponse.json({ siteContext: serializeSiteContext(siteContext, project) });
  } catch (error) {
    console.error("[site-context-get]", error);
    return NextResponse.json(buildErrorPayload("Unable to load site context."), { status: 400 });
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
    const requestData = payload as Record<string, unknown>;
    if ("rawAddress" in requestData && !("candidate" in requestData)) {
      const { projectId, rawAddress, lgaCode, lgaName } = manualSchema.parse(requestData);
      const siteContext = await persistManualSiteContext({
        projectId,
        rawAddress,
        lgaCode,
        lgaName,
        resolverStatus: (requestData.resolverStatus as string | null | undefined) ?? null,
      });
      const project = await prisma.project.findUnique({
        where: { id: siteContext.projectId },
        select: { zoningCode: true, zoningName: true, zoningSource: true },
      });
      return NextResponse.json({ siteContext: serializeSiteContext(siteContext, project) });
    }

    const parsedUpdate = updateSchema.safeParse(requestData);
    if (!parsedUpdate.success) {
      console.error("[site-context-update]", {
        stage: "validation",
        issues: parsedUpdate.error.flatten().fieldErrors,
        rawPayload: {
          projectId: (requestData.projectId as string) ?? null,
          hasCandidate: Boolean((requestData as { candidate?: unknown }).candidate),
        },
      });
      return NextResponse.json(
        { error: "validation_error", message: "Invalid site payload." },
        { status: 400 },
      );
    }

    const { projectId, candidate, addressInput } = parsedUpdate.data;
    let siteContext;
    try {
      siteContext = await persistSiteContextFromCandidate({ projectId, addressInput, candidate });
    } catch (e) {
      console.error("SET_SITE_ERROR", {
        provider: candidate.provider,
        coords: { lat: candidate.latitude, lng: candidate.longitude },
        lga: (candidate as { lga?: unknown }).lga ?? candidate.lgaName,
        received: candidate,
        error: e,
      });
      throw e;
    }
    const project = await prisma.project.findUnique({
      where: { id: siteContext.projectId },
      select: { zoningCode: true, zoningName: true, zoningSource: true },
    });
    return NextResponse.json({ siteContext: serializeSiteContext(siteContext, project) });
  } catch (error) {
    console.error("[site-context-update]", {
      stage: "persistence",
      message: error instanceof Error ? error.message : "Unknown error",
      errorName: error instanceof Error ? error.name : typeof error,
      payloadSummary: (() => {
        const payloadObject =
          payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
        const candidate = payloadObject.candidate as { provider?: string } | undefined;
        const addressInput = payloadObject.addressInput as string | undefined;
        return {
          projectId: typeof payloadObject.projectId === "string" ? payloadObject.projectId : null,
          hasCandidate: Boolean(candidate),
          candidateProvider: candidate?.provider ?? null,
          addressLength: typeof addressInput === "string" ? addressInput.length : null,
        };
      })(),
    });
    return NextResponse.json(buildErrorPayload("Unable to save the selected site."), { status: 400 });
  }
}
