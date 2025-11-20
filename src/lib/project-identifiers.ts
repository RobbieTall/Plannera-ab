import type { PrismaClient, Project } from "@prisma/client";

type ProjectLookupClient = Pick<PrismaClient, "project">;

export const normalizeProjectId = (projectId: string | undefined | null) => projectId?.trim() ?? "";

export async function findProjectByExternalId(
  prisma: ProjectLookupClient,
  projectId: string,
): Promise<Project | null> {
  const normalized = normalizeProjectId(projectId);
  if (!normalized) {
    return null;
  }

  return prisma.project.findFirst({
    where: { OR: [{ publicId: normalized }, { id: normalized }] },
  });
}
