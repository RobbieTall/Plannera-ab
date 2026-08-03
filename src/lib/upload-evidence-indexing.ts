import { WorkspaceSourceType, type PrismaClient } from "@prisma/client";

import { indexWorkspaceChunks } from "@/lib/source-indexing";
import type { UploadEvidenceExtraction } from "@/lib/upload-evidence";

export const indexUploadEvidence = async ({
  extraction,
  fileName,
  projectId,
  uploadId,
  prismaClient,
}: {
  extraction: UploadEvidenceExtraction;
  fileName: string;
  projectId: string;
  uploadId: string;
  prismaClient: PrismaClient;
}) => {
  if (!extraction.extractedText || !extraction.segments.length) return { created: 0 } as const;

  return indexWorkspaceChunks({
    chunks: extraction.segments.map((segment) => ({
      heading: segment.heading,
      content: segment.content,
      metadata: {
        sourceTitle: fileName,
        pageNumber: segment.pageNumber ?? null,
        sheetName: segment.sheetName ?? null,
        contentHash: extraction.contentHash,
        extractionMethod: extraction.extractionMethod,
      },
    })),
    metadata: {
      sourceTitle: fileName,
      contentHash: extraction.contentHash,
      extractionMethod: extraction.extractionMethod,
    },
    projectId,
    uploadId,
    sourceType: WorkspaceSourceType.upload,
    prismaClient,
  });
};
