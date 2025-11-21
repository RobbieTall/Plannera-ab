import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { findProjectByExternalId, normalizeProjectId } from "./project-identifiers";
import type { PrismaClient, Project } from "@prisma/client";

export const ensureProjectInputSchema = z.object({
  id: z.string().trim().optional(),
  publicId: z.string().trim().min(1, "publicId is required"),
  name: z.string().trim().min(1, "name is required"),
  description: z.string().trim().optional(),
  createdById: z.string().trim().optional(),
  propertyName: z.string().trim().optional(),
  propertyCity: z.string().trim().optional(),
  propertyState: z.string().trim().optional(),
  propertyCountry: z.string().trim().optional(),
});

export type EnsureProjectInput = z.infer<typeof ensureProjectInputSchema>;

type EnsureProjectDeps = {
  prisma: Pick<PrismaClient, "project" | "property">;
};

const upsertProperty = async (
  deps: EnsureProjectDeps,
  params: Pick<EnsureProjectInput, "name" | "propertyName" | "propertyCity" | "propertyState" | "propertyCountry">,
) => {
  return deps.prisma.property.create({
    data: {
      name: params.propertyName || params.name,
      city: params.propertyCity ?? null,
      state: params.propertyState ?? null,
      country: params.propertyCountry ?? null,
    },
  });
};

export async function ensureProjectExists(
  params: EnsureProjectInput,
  deps: EnsureProjectDeps = { prisma },
): Promise<Project> {
  const parsed = ensureProjectInputSchema.parse(params);
  const normalizedPublicId = normalizeProjectId(parsed.publicId);
  if (!normalizedPublicId) {
    throw new Error("publicId is required");
  }

  const existing = await findProjectByExternalId(deps.prisma as unknown as PrismaClient, normalizedPublicId);

  if (!existing && parsed.id) {
    const legacy = await deps.prisma.project.findFirst({ where: { id: parsed.id } });
    if (legacy) {
      return deps.prisma.project.update({ where: { id: legacy.id }, data: { publicId: normalizedPublicId } });
    }
  }

  if (existing) {
    if (existing.publicId !== normalizedPublicId) {
      return deps.prisma.project.update({
        where: { id: existing.id },
        data: { publicId: normalizedPublicId },
      });
    }
    return existing;
  }

  const property = await upsertProperty(deps, parsed);

  return deps.prisma.project.create({
    data: {
      publicId: normalizedPublicId,
      name: parsed.name,
      description: parsed.description ?? null,
      propertyId: property.id,
      createdById: parsed.createdById ?? null,
      isDemo: false,
    },
  });
}

export async function logExistingProjects(deps: EnsureProjectDeps = { prisma }) {
  const projects = await deps.prisma.project.findMany({
    select: { id: true, publicId: true, name: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("[project-debug]", projects);
  return projects;
}
