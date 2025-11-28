import type { Prisma, Project } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ProjectSummary = Pick<Project, "id" | "title" | "address" | "zoning">;

const projectSummarySelect = {
  id: true,
  title: true,
  address: true,
  zoning: true,
} as const;

const sanitizeProject = (project: ProjectSummary): ProjectSummary => ({
  id: project.id,
  title: project.title,
  address: project.address,
  zoning: project.zoning,
});

export const getOrCreateCurrentProject = async (
  sessionId: string,
  userId?: string | null,
  title?: string,
): Promise<ProjectSummary> => {
  const resolvedTitle = title?.trim() || "Untitled project";

  if (userId) {
    const userProject = await prisma.project.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: projectSummarySelect,
    });

    if (userProject) {
      return sanitizeProject(userProject);
    }
  }

  const sessionProject = await prisma.project.findFirst({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: projectSummarySelect,
  });

  if (sessionProject) {
    return sanitizeProject(sessionProject);
  }

  const projectData: Prisma.ProjectCreateInput = {
    title: resolvedTitle,
    name: resolvedTitle,
    sessionId,
    property: {
      create: {
        name: resolvedTitle,
        address: null,
      },
    },
  };

  if (userId) {
    projectData.owner = { connect: { id: userId } };
  }

  const project = await prisma.project.create({
    data: projectData,
    select: projectSummarySelect,
  });

  return sanitizeProject(project);
};

export const getProjectForRequester = async (
  id: string,
  sessionId: string,
  userId?: string | null,
): Promise<{ ok: true; project: ProjectSummary } | { ok: false; reason: "not_found" | "forbidden" }> => {
  const project = await prisma.project.findUnique({
    where: { id },
    select: { ...projectSummarySelect, sessionId: true, userId: true },
  });

  if (!project) {
    return { ok: false, reason: "not_found" };
  }

  const ownsProject = Boolean(userId && project.userId && project.userId === userId);
  const matchesSession = Boolean(project.sessionId && project.sessionId === sessionId);

  if (!ownsProject && !matchesSession) {
    return { ok: false, reason: project.userId ? "forbidden" : "not_found" };
  }

  return { ok: true, project: sanitizeProject(project) };
};

export const claimProjectsForUser = async (
  sessionId: string,
  userId: string,
): Promise<ProjectSummary[]> => {
  await prisma.project.updateMany({
    where: { sessionId, userId: null },
    data: { userId, sessionId: null },
  });

  return getProjectsForUser(userId);
};

export const getProjectsForUser = async (userId: string): Promise<ProjectSummary[]> => {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: projectSummarySelect,
  });

  return projects.map(sanitizeProject);
};
