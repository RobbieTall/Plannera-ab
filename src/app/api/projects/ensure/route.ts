import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureProjectExists, ensureProjectInputSchema } from "@/lib/project-service";
import { prisma } from "@/lib/prisma";
import { extractAddressFromText } from "@/lib/site/extract-address-from-text";
import { pickBestNswCandidate, searchNswSite } from "@/lib/site/nsw-search";
import { persistSiteContextFromCandidate, serializeSiteContext } from "@/lib/site-context";

const requestSchema = ensureProjectInputSchema.extend({
  description: z.string().trim().optional(),
  landingPrompt: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { landingPrompt, ...payload } = requestSchema.parse(body);
    const project = await ensureProjectExists(payload);

    let siteContext = null;
    const addressCandidate = landingPrompt ? extractAddressFromText(landingPrompt) : null;
    if (addressCandidate) {
      try {
        const searchResult = await searchNswSite(addressCandidate, { source: "site-search" });
        const bestCandidate = pickBestNswCandidate(searchResult);
        if (bestCandidate) {
          const persisted = await persistSiteContextFromCandidate({
            projectId: project.publicId ?? project.id,
            addressInput: addressCandidate,
            candidate: bestCandidate,
          });
          const projectWithZoning = await prisma.project.findUnique({
            where: { id: persisted.projectId },
            select: { zoningCode: true, zoningName: true, zoningSource: true, lepData: true, dcpData: true },
          });
          siteContext = serializeSiteContext(persisted, projectWithZoning);
        }
      } catch (error) {
        console.warn("[project-ensure-site-autoset]", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ ok: true, project, siteContext });
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
