import type { Prisma, Project } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ProjectSummary = Pick<Project, "id" | "publicId" | "title" | "address" | "zoning">;

export type ProjectListItem = ProjectSummary & Pick<Project, "updatedAt">;

const projectSummarySelect = {
  id: true,
  publicId: true,
  title: true,
  address: true,
  zoning: true,
} as const;

const sanitizeProject = (project: ProjectSummary): ProjectSummary => ({
  id: project.id,
  publicId: project.publicId,
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
  publicId: project.publicId,
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


export const createProjectForRequester = async (
  sessionId: string,
  userId?: string | null,
  initialTitle?: string,
): Promise<Project> => {
  const resolvedTitle = initialTitle?.trim() || "Untitled project";

  return prisma.project.create({
    data: {
      title: resolvedTitle,
      name: resolvedTitle,
      sessionId: userId ? null : sessionId,
      property: {
        create: {
          name: resolvedTitle,
          address: null,
        },
      },
      ...(userId ? { owner: { connect: { id: userId } } } : {}),
    },
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

export const claimSessionProjectsForUser = async (
  sessionId: string,
  userId: string,
): Promise<ProjectSummary[]> => {
  await prisma.project.updateMany({
    where: { sessionId, userId: null },
    data: { userId, sessionId: null },
  });

  return getProjectsForUser(userId);
};

// Backwards-compatible alias used by existing routes; prefer claimSessionProjectsForUser.
export const claimProjectsForUser = claimSessionProjectsForUser;

export const claimProjectForUser = async (
  projectId: string,
  userId: string,
  sessionId?: string | null,
): Promise<boolean> => {
  const identityFilter: Prisma.ProjectWhereInput = {
    OR: [{ id: projectId }, { publicId: projectId }],
  };

  const ownershipFilters: Prisma.ProjectWhereInput[] = [{ userId: null }];
  if (sessionId) {
    ownershipFilters.push({ sessionId });
  }

  const result = await prisma.project.updateMany({
    where: {
      AND: [identityFilter, { OR: ownershipFilters }],
    },
    data: { userId, sessionId: null },
  });

  return result.count > 0;
};

export const getProjectsForUser = async (userId: string): Promise<ProjectSummary[]> => {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: projectSummarySelect,
  });

  return projects.map(sanitizeProject);
};

export const listProjectsForUser = async (
  userId: string,
  sessionId?: string | null,
): Promise<ProjectListItem[]> => {
  if (sessionId) {
    await prisma.project.updateMany({
      where: { sessionId, userId: null },
      data: { userId, sessionId: null },
    });
  }

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

export async function renameProjectForRequester(
  projectId: string,
  userId: string | null,
  sessionId: string | null,
  title: string,
) {
  const ownershipFilters = [
    userId ? { userId } : undefined,
    sessionId ? { sessionId } : undefined,
  ].filter(Boolean) as Prisma.ProjectWhereInput[];

  if (!ownershipFilters.length) {
    return { count: 0 } as Prisma.BatchPayload;
  }

  return prisma.project.updateMany({
    where: {
      id: projectId,
      OR: ownershipFilters,
    },
    data: {
      title,
    },
  });
}
