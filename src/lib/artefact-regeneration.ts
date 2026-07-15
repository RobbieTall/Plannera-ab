import type { ArtefactType } from "@prisma/client";

import { createDetailedPlanningPackArtefact, createPreSeePlanningMemoArtefact, createQuickSiteCheckArtefact } from "@/lib/artefact-service";
import { buildQuickSiteCheckReport } from "@/lib/quick-site-check";
import { prisma } from "@/lib/prisma";

export type StaleArtefact = {
  projectId: string;
  artefactId: string;
  artefactType: ArtefactType;
  createdAt: Date;
};

type RegenerableArtefactType = Extract<ArtefactType, "quick_site_check" | "pre_see_planning_memo" | "detailed_planning_pack">;

const REGENERABLE_ARTEFACT_TYPES: RegenerableArtefactType[] = ["quick_site_check", "pre_see_planning_memo", "detailed_planning_pack"];

const normalizeLgaCode = (lgaCode: string) => lgaCode.trim().toUpperCase();

export const normalizeRegenerableArtefactType = (artefactType: string): RegenerableArtefactType | null => {
  const normalized = artefactType.trim().toLowerCase();

  if (normalized === "quick_site_check" || normalized === "quick-site-check" || normalized === "quick site check") {
    return "quick_site_check";
  }

  if (
    normalized === "pre_see_planning_memo" ||
    normalized === "pre-see-planning-memo" ||
    normalized === "pre see planning memo" ||
    normalized === "planning_memo" ||
    normalized === "planning memo"
  ) {
    return "pre_see_planning_memo";
  }

  if (
    normalized === "detailed_planning_pack" ||
    normalized === "detailed-planning-pack" ||
    normalized === "detailed planning pack"
  ) {
    return "detailed_planning_pack";
  }

  return null;
};

export async function getStaleArtefactsForLga(lgaCode: string): Promise<StaleArtefact[]> {
  const normalizedLgaCode = normalizeLgaCode(lgaCode);
  if (!normalizedLgaCode) return [];

  const coverage = await prisma.lgaCoverageState.findUnique({
    where: { lgaCode: normalizedLgaCode },
    select: { updatedAt: true },
  });

  if (!coverage?.updatedAt) return [];

  const artefacts = await prisma.artefact.findMany({
    where: {
      type: { in: REGENERABLE_ARTEFACT_TYPES },
      createdAt: { lt: coverage.updatedAt },
      project: {
        siteContext: {
          is: { lgaCode: normalizedLgaCode },
        },
      },
    },
    select: {
      id: true,
      projectId: true,
      type: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return artefacts.map((artefact) => ({
    projectId: artefact.projectId,
    artefactId: artefact.id,
    artefactType: artefact.type,
    createdAt: artefact.createdAt,
  }));
}

export async function markArtefactStale(artefactId: string): Promise<void> {
  await prisma.artefact.update({
    where: { id: artefactId },
    data: { staleAt: new Date() },
  });
}

export async function triggerArtefactRegeneration(
  projectId: string,
  userId: string,
  artefactType: string,
  staleArtefactId?: string,
): Promise<{ queued: boolean; reason?: string; newArtefactId?: string }> {
  const normalizedArtefactType = normalizeRegenerableArtefactType(artefactType);

  if (!normalizedArtefactType) {
    return { queued: false, reason: "Unsupported artefact type" };
  }

  if (normalizedArtefactType === "quick_site_check") {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { siteContext: true },
    });

    if (!project) {
      return { queued: false, reason: "Project not found" };
    }

    const report = await buildQuickSiteCheckReport(project);
    const artefact = await createQuickSiteCheckArtefact({
      body: {
        projectId: project.id,
        title: `Quick Site Check — ${project.title}`,
        type: "quick_site_check",
        report,
      },
      projectId: project.id,
      userId,
    });

    return { queued: true, newArtefactId: artefact.id };
  }

  if (normalizedArtefactType === "detailed_planning_pack") {
    const staleArtefact = staleArtefactId
      ? await prisma.artefact.findFirst({ where: { id: staleArtefactId, projectId, type: "detailed_planning_pack" } })
      : null;
    const payload = staleArtefact?.payload;
    const proposalBrief = payload && typeof payload === "object" && "proposalBrief" in payload && typeof payload.proposalBrief === "string"
      ? payload.proposalBrief
      : "Regenerate the saved Detailed Planning Pack for the current proposal.";
    const { artefact } = await createDetailedPlanningPackArtefact({
      body: { projectId, proposalBrief },
      userId,
    });
    return { queued: true, newArtefactId: artefact.id };
  }

  const { artefact } = await createPreSeePlanningMemoArtefact({
    body: { projectId },
    userId,
  });

  return { queued: true, newArtefactId: artefact.id };
}
