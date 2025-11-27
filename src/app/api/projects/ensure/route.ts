import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureProjectExists, ensureProjectInputSchema } from "@/lib/project-service";
import { prisma } from "@/lib/prisma";
import { autoSetSiteFromText } from "@/lib/site/auto-set-site-from-text";
import { serializeSiteContext } from "@/lib/site-context";

const requestSchema = ensureProjectInputSchema.extend({
  description: z.string().trim().optional(),
  promptText: z.string().trim().optional(),
  landingPrompt: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { landingPrompt, promptText, ...payload } = requestSchema.parse(body);
    const project = await ensureProjectExists(payload);

    let siteContext = null;
    const landingText = promptText ?? landingPrompt ?? payload.description ?? payload.name;
    const trimmedLandingText = landingText?.trim();
    let siteAutoSetResult: "set" | "skipped" = "skipped";
    if (trimmedLandingText) {
      try {
        siteAutoSetResult = await autoSetSiteFromText({ projectId: project.id, text: trimmedLandingText });
      } catch (error) {
        console.warn("[project-ensure-site-autoset]", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const existingSiteContext = await prisma.siteContext.findUnique({ where: { projectId: project.id } });
    if (existingSiteContext) {
      const projectWithZoning = await prisma.project.findUnique({
        where: { id: project.id },
        select: { zoningCode: true, zoningName: true, zoningSource: true, lepData: true, dcpData: true },
      });
      if (projectWithZoning) {
        siteContext = serializeSiteContext(existingSiteContext, projectWithZoning);
      }
    }

    return NextResponse.json({ ok: true, project, siteContext, siteAutoSetResult });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "invalid_request", message: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    console.error("[project-ensure-error]", error);
    return NextResponse.json(
      { ok: false, error: "project_ensure_failed", message: "Unable to ensure project exists" },
      { status: 500 },
    );
  }
}
