import type { Prisma, PrismaClient, Project } from "@prisma/client";

import type { SavedFile } from "@/lib/storage";
import { extractUploadEvidence, type UploadEvidenceExtraction } from "@/lib/upload-evidence";
import { indexUploadEvidence } from "@/lib/upload-evidence-indexing";
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
  contentHash: string | null;
  extractionMethod: string | null;
  extractedAt: Date | null;
  pageCount: number | null;
  evidenceStatus: "READY" | "PARTIALLY_READABLE" | "IMAGE_ONLY" | "NEEDS_REVIEW";
  reviewReason: string | null;
  indexingStatus: "READY" | "PENDING" | "FAILED" | "NOT_APPLICABLE";
  indexedAt: Date | null;
  indexingError: string | null;
  applicabilityStatus: "PENDING_REVIEW" | "ACCEPTED" | "REJECTED" | "CONFLICT" | "SUPERSEDED";
  applicabilityArtefactId: string | null;
  acceptedSiteFingerprint: string | null;
  acceptedProposalFingerprint: string | null;
  applicabilityTopics: unknown;
  sourceDocumentDate: Date | null;
  validUntil: Date | null;
  applicabilityReviewedAt: Date | null;
  applicabilityReviewNote: string | null;
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

type UploadPrismaClient = Pick<PrismaClient, "project" | "workspaceUpload" | "workspaceSourceChunk">;

export type IndexUploadEvidence = (args: {
  extraction: UploadEvidenceExtraction;
  fileName: string;
  projectId: string;
  uploadId: string;
  prismaClient: PrismaClient;
}) => Promise<{ created: number }>;

const uploadSelect = {
  id: true,
  fileName: true,
  fileExtension: true,
  mimeType: true,
  fileSize: true,
  publicUrl: true,
  contentHash: true,
  extractionMethod: true,
  extractedAt: true,
  pageCount: true,
  evidenceStatus: true,
  reviewReason: true,
  indexingStatus: true,
  indexedAt: true,
  indexingError: true,
  applicabilityStatus: true,
  applicabilityArtefactId: true,
  acceptedSiteFingerprint: true,
  acceptedProposalFingerprint: true,
  applicabilityTopics: true,
  sourceDocumentDate: true,
  validUntil: true,
  applicabilityReviewedAt: true,
  applicabilityReviewNote: true,
  createdAt: true,
} as const;

export async function persistWorkspaceUploads({
  projectId,
  files,
  userId,
  prisma,
  saveFile,
  extractEvidence = extractUploadEvidence,
  indexEvidence = indexUploadEvidence,
  project,
}: {
  projectId: string;
  files: File[];
  userId?: string;
  prisma: UploadPrismaClient;
  saveFile: (file: File) => Promise<SavedFile>;
  extractEvidence?: typeof extractUploadEvidence;
  indexEvidence?: IndexUploadEvidence;
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

  const validatedFiles = files.map((file) => ({ file, validation: validateFileForUpload(file) }));
  const created: UploadRecord[] = [];

  for (const { file, validation } of validatedFiles) {
    const extraction = await extractEvidence({
      file,
      category: validation.category,
      extension: validation.extension,
    });
    const saved = await saveFile(file);
    const shouldIndex = Boolean(extraction.extractedText && extraction.segments.length);
    const upload = await prisma.workspaceUpload.create({
      data: {
        project: { connect: { id: resolvedProject.id } },
        user: userId ? { connect: { id: userId } } : undefined,
        fileName: file.name,
        fileExtension: validation.extension,
        mimeType: saved.mimeType ?? validation.mimeType,
        fileSize: saved.size,
        storagePath: saved.path,
        publicUrl: saved.url,
        contentHash: extraction.contentHash,
        extractedText: extraction.extractedText,
        extractionMethod: extraction.extractionMethod,
        extractionMetadata: extraction.extractionMetadata as Prisma.InputJsonValue,
        extractedAt: extraction.extractedAt,
        pageCount: extraction.pageCount,
        evidenceStatus: extraction.evidenceStatus,
        reviewReason: extraction.reviewReason,
        indexingStatus: shouldIndex ? "PENDING" : "NOT_APPLICABLE",
      },
      select: uploadSelect,
    });

    if (!shouldIndex) {
      created.push(upload as UploadRecord);
      continue;
    }

    try {
      await indexEvidence({
        extraction,
        fileName: file.name,
        projectId: resolvedProject.id,
        uploadId: upload.id,
        prismaClient: prisma as unknown as PrismaClient,
      });
      const indexed = await prisma.workspaceUpload.update({
        where: { id: upload.id },
        data: { indexingStatus: "READY", indexedAt: new Date(), indexingError: null },
        select: uploadSelect,
      });
      created.push(indexed as UploadRecord);
    } catch (error) {
      const indexingError = (error instanceof Error ? error.message : "Unknown indexing failure").slice(0, 1000);
      const failed = await prisma.workspaceUpload.update({
        where: { id: upload.id },
        data: { indexingStatus: "FAILED", indexingError },
        select: uploadSelect,
      });
      created.push(failed as UploadRecord);
    }
  }

  return created;
}
