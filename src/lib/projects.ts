import type { Prisma, Project } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ProjectSummary = Pick<Project, "id" | "title" | "address" | "zoning">;

export type ProjectListItem = ProjectSummary & Pick<Project, "updatedAt">;

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

const projectListSelect = {
  ...projectSummarySelect,
  updatedAt: true,
} as const;

const sanitizeProjectListItem = (project: ProjectListItem): ProjectListItem => ({
  id: project.id,
  title: project.title,
  address: project.address,
  zoning: project.zoning,
  updatedAt: project.updatedAt,
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

export const listProjectsForUser = async (userId: string): Promise<ProjectListItem[]> => {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: projectListSelect,
  });

  return projects.map(sanitizeProjectListItem);
};

export const createProjectForUser = async (userId: string, title?: string): Promise<ProjectListItem> => {
  const resolvedTitle = title?.trim() || "Untitled project";

  const project = await prisma.project.create({
    data: {
      title: resolvedTitle,
      name: resolvedTitle,
      sessionId: null,
      owner: { connect: { id: userId } },
      property: {
        create: {
          name: resolvedTitle,
          address: null,
        },
      },
    },
    select: projectListSelect,
  });

  return sanitizeProjectListItem(project);
};

export const deleteProjectForUser = async (
  userId: string,
  projectId: string,
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "forbidden" }> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });

  if (!project) {
    return { ok: false, reason: "not_found" };
  }

  if (project.userId !== userId) {
    return { ok: false, reason: "forbidden" };
  }

  await prisma.project.delete({ where: { id: projectId } });

  return { ok: true };
};
