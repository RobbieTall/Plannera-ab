import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { saveFileToUploads, type SavedFile } from "@/lib/storage";
import { getServerSession } from "next-auth";
import type { Artefact, ArtefactType, PrismaClient } from "@prisma/client";

type PrismaClientArtefact = Pick<PrismaClient["artefact"], "create" | "findMany">;
type PrismaClientProject = Pick<PrismaClient["project"], "findFirst">;

type ArtefactDependencies = {
  prisma: {
    artefact: PrismaClientArtefact;
    project: PrismaClientProject;
  };
  saveFile: (file: File) => Promise<SavedFile>;
};

const overlayEntrySchema = z
  .union([z.string().trim(), z.array(z.string().trim())])
  .transform((value) => (Array.isArray(value) ? value : value ? [value] : []))
  .transform((values) => values.filter((entry) => entry.length > 0));

const mapSnapshotSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
  title: z.string().trim().min(1, "title is required").max(200),
  source: z.string().trim().min(1, "source is required").max(200),
  sourceUrl: z.string().url().trim().optional(),
  overlays: overlayEntrySchema.default([]),
  notes: z.string().trim().max(2000).optional(),
  capturedAt: z.preprocess((value) => (value ? new Date(value as string) : undefined), z.date().optional()),
});

export class ArtefactValidationError extends Error {
  status = 400;
}

export class ArtefactAccessError extends Error {
  constructor(message: string, public status = 403) {
    super(message);
  }
}

export async function requireSessionUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string | undefined;

  if (userId) {
    return { userId };
  }

  const hasSessionCookie = Boolean(
    cookies().get("__Secure-next-auth.session-token") ?? cookies().get("next-auth.session-token"),
  );

  throw new ArtefactAccessError(
    hasSessionCookie ? "Your session expired. Please sign in again." : "Authentication required",
    401,
  );
}

export function parseMapSnapshotFormData(formData: FormData, projectIdFromParams: string) {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ArtefactValidationError("An image file is required");
  }

  if (!file.type.startsWith("image/")) {
    throw new ArtefactValidationError("Only image uploads are supported for map snapshots");
  }

  const overlaysEntries = formData.getAll("overlays");
  const overlaysValue = overlaysEntries.length > 1 ? overlaysEntries.map(String) : overlaysEntries[0] ?? [];

  const parsed = mapSnapshotSchema.safeParse({
    projectId: formData.get("projectId") ?? projectIdFromParams,
    title: formData.get("title"),
    source: formData.get("source") ?? "",
    sourceUrl: formData.get("sourceUrl") ?? undefined,
    overlays: overlaysValue,
    notes: formData.get("notes") ?? undefined,
    capturedAt: formData.get("capturedAt") ?? undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    throw new ArtefactValidationError(message);
  }

  const { projectId, ...rest } = parsed.data;

  if (projectId !== projectIdFromParams) {
    throw new ArtefactValidationError("Project mismatch between URL and form payload");
  }

  return { file, projectId, payload: rest };
}

async function assertProjectAccess(
  prismaClient: ArtefactDependencies["prisma"],
  projectId: string,
  userId: string,
) {
  const project = await prismaClient.project.findFirst({
    where: {
      id: projectId,
      OR: [{ createdById: userId }, { collaborators: { some: { userId } } }],
    },
    select: { id: true },
  });

  if (!project) {
    throw new ArtefactAccessError("Project not found or access denied");
  }
}

export type MapSnapshotArtefactInput = {
  projectId: string;
  title: string;
  source: string;
  sourceUrl?: string;
  overlays: string[];
  notes?: string;
  capturedAt?: Date;
};

export async function createMapSnapshotArtefact({
  formData,
  projectId,
  userId,
  deps = { prisma, saveFile: saveFileToUploads },
}: {
  formData: FormData;
  projectId: string;
  userId: string;
  deps?: ArtefactDependencies;
}): Promise<Artefact> {
  const { file, payload } = parseMapSnapshotFormData(formData, projectId);

  await assertProjectAccess(deps.prisma, projectId, userId);

  const savedFile = await deps.saveFile(file);

  return deps.prisma.artefact.create({
    data: {
      projectId,
      createdById: userId,
      type: "map_snapshot" as ArtefactType,
      title: payload.title,
      source: payload.source,
      sourceUrl: payload.sourceUrl,
      overlays: payload.overlays,
      notes: payload.notes,
      imageUrl: savedFile.url,
      capturedAt: payload.capturedAt ?? new Date(),
    },
  });
}

export async function listProjectArtefacts(projectId: string, userId: string, deps = { prisma }) {
  await assertProjectAccess(deps.prisma, projectId, userId);

  return deps.prisma.artefact.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}
