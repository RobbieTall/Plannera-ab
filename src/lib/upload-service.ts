import type { Prisma, PrismaClient, Project } from "@prisma/client";

import type { SavedFile } from "@/lib/storage";
import { getAllowedDescriptor, MAX_FILE_SIZE_BYTES, type UploadCategory } from "@/lib/upload-constraints";
import { findProjectByExternalId, normalizeProjectId } from "./project-identifiers";

export class UploadError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const normalizeExtension = (fileName: string) => fileName.split(".").pop()?.toLowerCase();

export type UploadRecord = {
  id: string;
  fileName: string;
  fileExtension: string | null;
  mimeType: string | null;
  fileSize: number;
  publicUrl: string;
  createdAt: Date;
};

export const validateFileForUpload = (
  file: File,
): { extension: string; category: UploadCategory; mimeType: string | null } => {
  const extension = normalizeExtension(file.name);
  const descriptor = getAllowedDescriptor(extension);

  if (!descriptor || !extension) {
    throw new UploadError("Unsupported file type", "unsupported_file_type", 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new UploadError("File too large", "file_too_large", 400);
  }

  if (file.type && !descriptor.mimeTypes.includes(file.type)) {
    throw new UploadError("Unsupported file type", "unsupported_file_type", 400);
  }

  const mimeType = file.type || descriptor.mimeTypes[0] || null;

  return { extension, category: descriptor.category, mimeType };
};

type UploadPrismaClient = Pick<PrismaClient, "project" | "workspaceUpload">;

export async function persistWorkspaceUploads({
  projectId,
  files,
  userId,
  prisma,
  saveFile,
  extractPdfText,
  project,
}: {
  projectId: string;
  files: File[];
  userId?: string;
  prisma: UploadPrismaClient;
  saveFile: (file: File) => Promise<SavedFile>;
  extractPdfText?: (file: File) => Promise<string | null>;
  project?: Pick<Project, "id" | "publicId">;
}): Promise<UploadRecord[]> {
  const normalizedProjectId = normalizeProjectId(projectId);
  if (!normalizedProjectId) {
    throw new UploadError("Project id is required", "project_id_missing", 400);
  }

  const resolvedProject =
    project ?? (await findProjectByExternalId(prisma as unknown as PrismaClient, normalizedProjectId));

  if (!resolvedProject) {
    throw new UploadError("No project/workspace exists with this ID.", "project_not_found", 404);
  }

  const uploads: Prisma.WorkspaceUploadCreateInput[] = [];
  const validatedFiles = files.map((file) => ({ file, validation: validateFileForUpload(file) }));

  for (const { file, validation } of validatedFiles) {
    const saved = await saveFile(file);

    uploads.push({
      project: { connect: { id: resolvedProject.id } },
      user: userId ? { connect: { id: userId } } : undefined,
      fileName: file.name,
      fileExtension: validation.extension,
      mimeType: saved.mimeType ?? validation.mimeType,
      fileSize: saved.size,
      storagePath: saved.path,
      publicUrl: saved.url,
      extractedText: validation.category === "pdf" && extractPdfText ? await extractPdfText(file) : null,
    });
  }

  const created = await Promise.all(
    uploads.map((upload) =>
      prisma.workspaceUpload.create({
        data: upload,
        select: {
          id: true,
          fileName: true,
          fileExtension: true,
          mimeType: true,
          fileSize: true,
          publicUrl: true,
          createdAt: true,
        },
      }),
    ),
  );

  return created;
}
