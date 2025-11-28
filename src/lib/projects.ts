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
  initialTitle?: string,
): Promise<Project> => {
  const ownershipFilters = [userId ? { userId } : null, { sessionId }].filter(Boolean) as Prisma.ProjectWhereInput[];

  const existing = await prisma.project.findFirst({
    where: { OR: ownershipFilters },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing;
  }

  const resolvedTitle = initialTitle?.trim() || "Untitled project";

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
    ...(userId ? { owner: { connect: { id: userId } } } : {}),
  };

  return prisma.project.create({
    data: projectData,
  });
};

export const getProjectForRequester = async (
  id: string,
  sessionId?: string | null,
  userId?: string | null,
) => {
  const ownershipConditions: Prisma.ProjectWhereInput[] = [];

  if (userId) {
    ownershipConditions.push({ userId });
  }

  if (sessionId) {
    ownershipConditions.push({ sessionId });
  }

  if (ownershipConditions.length === 0) {
    return null;
  }

  return prisma.project.findFirst({
    where: {
      id,
      OR: ownershipConditions.length > 0 ? ownershipConditions : undefined,
    },
  });
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

export const deleteProjectForUser = async (userId: string, projectId: string) =>
  prisma.project.deleteMany({
    where: {
      id: projectId,
      userId,
    },
  });
