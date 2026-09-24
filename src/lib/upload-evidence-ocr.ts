import { createHash } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { indexUploadEvidence } from "@/lib/upload-evidence-indexing";
import type {
  EvidenceSegment,
  UploadEvidenceExtraction,
} from "@/lib/upload-evidence";

export type WorkspaceUploadOcrStatus =
  | "QUEUED"
  | "PROCESSING"
  | "REVIEW_REQUIRED"
  | "FAILED"
  | "REJECTED"
  | "PROMOTED";

export type WorkspaceUploadOcrSegment = {
  pageNumber: number;
  content: string;
};

export type WorkspaceUploadOcrAttemptSummary = {
  id: string;
  uploadId: string;
  sourceContentHash: string;
  attempt: number;
  providerKey: string;
  status: WorkspaceUploadOcrStatus;
  resultContentHash: string | null;
  pageCount: number | null;
  errorCode: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  reviewedAt: string | null;
  promotedAt: string | null;
};

export class WorkspaceUploadOcrError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type OcrUpload = {
  id: string;
  projectId: string;
  fileName: string;
  contentHash: string | null;
  evidenceStatus: "READY" | "PARTIALLY_READABLE" | "IMAGE_ONLY" | "NEEDS_REVIEW";
  indexingStatus: "READY" | "PENDING" | "FAILED" | "NOT_APPLICABLE";
};

type OcrAttempt = {
  id: string;
  uploadId: string;
  sourceContentHash: string;
  attempt: number;
  providerKey: string;
  status: WorkspaceUploadOcrStatus;
  resultText: string | null;
  resultSegments: unknown;
  resultContentHash: string | null;
  pageCount: number | null;
  errorCode: string | null;
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  reviewedAt: Date | null;
  reviewerRef: string | null;
  reviewNote: string | null;
  promotedAt: Date | null;
  requestHash: string;
};

type OcrProject = {
  id: string;
};

type OcrPrisma = {
  project: {
    findFirst(args: unknown): Promise<OcrProject | null>;
  };
  workspaceUpload: {
    findFirst(args: unknown): Promise<OcrUpload | null>;
    update(args: unknown): Promise<OcrUpload>;
  };
  workspaceUploadOcrAttempt: {
    findFirst(args: unknown): Promise<OcrAttempt | null>;
    create(args: unknown): Promise<OcrAttempt>;
    update(args: unknown): Promise<OcrAttempt>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  $transaction<T>(callback: (tx: OcrPrisma) => Promise<T>): Promise<T>;
};

export type WorkspaceUploadOcrDependencies = {
  prisma: OcrPrisma;
  indexEvidence: (args: {
    extraction: UploadEvidenceExtraction;
    fileName: string;
    projectId: string;
    uploadId: string;
    prismaClient: PrismaClient;
  }) => Promise<{ created: number }>;
  now: () => Date;
};

const defaultDependencies = (): WorkspaceUploadOcrDependencies => ({
  prisma: prisma as unknown as OcrPrisma,
  indexEvidence: indexUploadEvidence,
  now: () => new Date(),
});

const SHA256 = /^[a-f0-9]{64}$/;
const PROVIDER_KEY = /^[a-z0-9][a-z0-9._-]{1,79}$/;
const ERROR_CODE = /^[A-Z0-9][A-Z0-9_]{2,79}$/;
const ACTIVE_STATUSES = new Set<WorkspaceUploadOcrStatus>([
  "QUEUED",
  "PROCESSING",
  "REVIEW_REQUIRED",
]);

const normalizeText = (value: string) =>
  value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizeSegments = (
  value: WorkspaceUploadOcrSegment[],
): WorkspaceUploadOcrSegment[] =>
  value
    .map((segment) => ({
      pageNumber: segment.pageNumber,
      content: normalizeText(segment.content),
    }))
    .filter(
      (segment) =>
        Number.isInteger(segment.pageNumber) &&
        segment.pageNumber > 0 &&
        Boolean(segment.content),
    )
    .sort((left, right) => left.pageNumber - right.pageNumber);

const hashValue = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const resultHash = (segments: WorkspaceUploadOcrSegment[]) =>
  hashValue(JSON.stringify(segments));

const toSummary = (attempt: OcrAttempt): WorkspaceUploadOcrAttemptSummary => ({
  id: attempt.id,
  uploadId: attempt.uploadId,
  sourceContentHash: attempt.sourceContentHash,
  attempt: attempt.attempt,
  providerKey: attempt.providerKey,
  status: attempt.status,
  resultContentHash: attempt.resultContentHash,
  pageCount: attempt.pageCount,
  errorCode: attempt.errorCode,
  queuedAt: attempt.queuedAt.toISOString(),
  startedAt: attempt.startedAt?.toISOString() ?? null,
  completedAt: attempt.completedAt?.toISOString() ?? null,
  reviewedAt: attempt.reviewedAt?.toISOString() ?? null,
  promotedAt: attempt.promotedAt?.toISOString() ?? null,
});

const projectScope = (projectId: string, userId: string) => ({
  AND: [
    { OR: [{ id: projectId }, { publicId: projectId }] },
    userId === "dev-bypass-user"
      ? {}
      : {
          OR: [
            { createdById: userId },
            { userId },
            { collaborators: { some: { userId } } },
          ],
        },
  ],
});

const loadOwnedUpload = async ({
  projectId,
  uploadId,
  userId,
  prismaClient,
}: {
  projectId: string;
  uploadId: string;
  userId: string;
  prismaClient: OcrPrisma;
}) => {
  const project = await prismaClient.project.findFirst({
    where: projectScope(projectId, userId),
    select: { id: true },
  });
  if (!project) {
    throw new WorkspaceUploadOcrError("Project not found or access denied", 404);
  }

  const upload = await prismaClient.workspaceUpload.findFirst({
    where: { id: uploadId, projectId: project.id },
    select: {
      id: true,
      projectId: true,
      fileName: true,
      contentHash: true,
      evidenceStatus: true,
      indexingStatus: true,
    },
  });
  if (!upload) {
    throw new WorkspaceUploadOcrError(
      "Uploaded evidence was not found in this project",
      404,
    );
  }
  return { project, upload };
};

const requireSourceHash = (upload: OcrUpload) => {
  if (!upload.contentHash || !SHA256.test(upload.contentHash)) {
    throw new WorkspaceUploadOcrError(
      "OCR requires an immutable SHA-256 source hash",
      409,
    );
  }
  return upload.contentHash;
};

const latestAttempt = (prismaClient: OcrPrisma, uploadId: string) =>
  prismaClient.workspaceUploadOcrAttempt.findFirst({
    where: { uploadId },
    orderBy: [{ attempt: "desc" }, { createdAt: "desc" }],
  });

export async function queueWorkspaceUploadOcr({
  projectId,
  uploadId,
  userId,
  retry = false,
  providerKey = "provider_pending",
  deps = defaultDependencies(),
}: {
  projectId: string;
  uploadId: string;
  userId: string;
  retry?: boolean;
  providerKey?: string;
  deps?: WorkspaceUploadOcrDependencies;
}): Promise<{ attempt: WorkspaceUploadOcrAttemptSummary; created: boolean }> {
  if (!PROVIDER_KEY.test(providerKey)) {
    throw new WorkspaceUploadOcrError("Invalid OCR provider key");
  }

  const { upload } = await loadOwnedUpload({
    projectId,
    uploadId,
    userId,
    prismaClient: deps.prisma,
  });
  const sourceContentHash = requireSourceHash(upload);

  if (upload.evidenceStatus !== "IMAGE_ONLY") {
    throw new WorkspaceUploadOcrError(
      "OCR may only be queued for image-only evidence in this contract",
      409,
    );
  }

  const latest = await latestAttempt(deps.prisma, upload.id);
  if (latest && latest.sourceContentHash !== sourceContentHash) {
    throw new WorkspaceUploadOcrError(
      "The upload hash changed after its previous OCR attempt",
      409,
    );
  }
  if (latest && ACTIVE_STATUSES.has(latest.status)) {
    return { attempt: toSummary(latest), created: false };
  }
  if (latest?.status === "PROMOTED") {
    return { attempt: toSummary(latest), created: false };
  }
  if (latest && !retry) {
    throw new WorkspaceUploadOcrError(
      "A terminal OCR attempt exists. Retry must be explicit.",
      409,
    );
  }

  const attemptNumber = (latest?.attempt ?? 0) + 1;
  const requestHash = hashValue(
    upload.id +
      ":" +
      sourceContentHash +
      ":" +
      String(attemptNumber) +
      ":" +
      providerKey,
  );

  try {
    const created = await deps.prisma.workspaceUploadOcrAttempt.create({
      data: {
        uploadId: upload.id,
        sourceContentHash,
        attempt: attemptNumber,
        providerKey,
        status: "QUEUED",
        requestHash,
        queuedAt: deps.now(),
      },
    });
    return { attempt: toSummary(created), created: true };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : null;
    if (code !== "P2002") throw error;
    const raced = await latestAttempt(deps.prisma, upload.id);
    if (
      raced &&
      raced.sourceContentHash === sourceContentHash &&
      raced.attempt === attemptNumber
    ) {
      return { attempt: toSummary(raced), created: false };
    }
    throw new WorkspaceUploadOcrError(
      "OCR queue changed concurrently. Refresh before retrying.",
      409,
    );
  }
}

export async function startWorkspaceUploadOcrAttempt({
  attemptId,
  providerKey,
  sourceContentHash,
  deps = defaultDependencies(),
}: {
  attemptId: string;
  providerKey: string;
  sourceContentHash: string;
  deps?: WorkspaceUploadOcrDependencies;
}) {
  if (!PROVIDER_KEY.test(providerKey) || !SHA256.test(sourceContentHash)) {
    throw new WorkspaceUploadOcrError("Invalid OCR processing identity");
  }
  const attempt = await deps.prisma.workspaceUploadOcrAttempt.findFirst({
    where: { id: attemptId },
  });
  if (!attempt) throw new WorkspaceUploadOcrError("OCR attempt not found", 404);
  if (attempt.sourceContentHash !== sourceContentHash) {
    throw new WorkspaceUploadOcrError("OCR source hash mismatch", 409);
  }
  if (attempt.status === "PROCESSING" && attempt.providerKey === providerKey) {
    return toSummary(attempt);
  }
  if (attempt.status !== "QUEUED") {
    throw new WorkspaceUploadOcrError(
      "OCR attempt cannot start from " + attempt.status,
      409,
    );
  }

  const updated = await deps.prisma.workspaceUploadOcrAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "PROCESSING",
      providerKey,
      startedAt: deps.now(),
      errorCode: null,
    },
  });
  return toSummary(updated);
}

export async function completeWorkspaceUploadOcrAttempt({
  attemptId,
  providerKey,
  sourceContentHash,
  segments,
  deps = defaultDependencies(),
}: {
  attemptId: string;
  providerKey: string;
  sourceContentHash: string;
  segments: WorkspaceUploadOcrSegment[];
  deps?: WorkspaceUploadOcrDependencies;
}) {
  if (!PROVIDER_KEY.test(providerKey) || !SHA256.test(sourceContentHash)) {
    throw new WorkspaceUploadOcrError("Invalid OCR result identity");
  }
  const normalizedSegments = normalizeSegments(segments);
  if (normalizedSegments.length === 0) {
    throw new WorkspaceUploadOcrError(
      "OCR result must contain at least one non-empty page",
    );
  }
  if (
    normalizedSegments.some(
      (segment, index) =>
        index > 0 &&
        segment.pageNumber === normalizedSegments[index - 1]?.pageNumber,
    )
  ) {
    throw new WorkspaceUploadOcrError(
      "OCR result contains duplicate page numbers",
    );
  }

  const attempt = await deps.prisma.workspaceUploadOcrAttempt.findFirst({
    where: { id: attemptId },
  });
  if (!attempt) throw new WorkspaceUploadOcrError("OCR attempt not found", 404);
  if (
    attempt.sourceContentHash !== sourceContentHash ||
    attempt.providerKey !== providerKey
  ) {
    throw new WorkspaceUploadOcrError("OCR result scope mismatch", 409);
  }

  const contentHash = resultHash(normalizedSegments);
  if (
    attempt.status === "REVIEW_REQUIRED" &&
    attempt.resultContentHash === contentHash
  ) {
    return toSummary(attempt);
  }
  if (attempt.status !== "PROCESSING") {
    throw new WorkspaceUploadOcrError(
      "OCR result cannot complete from " + attempt.status,
      409,
    );
  }

  const resultText = normalizedSegments
    .map((segment) => segment.content)
    .join("\n\n");
  const updated = await deps.prisma.workspaceUploadOcrAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "REVIEW_REQUIRED",
      resultText,
      resultSegments: normalizedSegments,
      resultContentHash: contentHash,
      pageCount: Math.max(
        ...normalizedSegments.map((segment) => segment.pageNumber),
      ),
      completedAt: deps.now(),
      errorCode: null,
    },
  });
  return toSummary(updated);
}

export async function failWorkspaceUploadOcrAttempt({
  attemptId,
  sourceContentHash,
  errorCode,
  deps = defaultDependencies(),
}: {
  attemptId: string;
  sourceContentHash: string;
  errorCode: string;
  deps?: WorkspaceUploadOcrDependencies;
}) {
  if (!SHA256.test(sourceContentHash) || !ERROR_CODE.test(errorCode)) {
    throw new WorkspaceUploadOcrError("Invalid OCR failure evidence");
  }
  const attempt = await deps.prisma.workspaceUploadOcrAttempt.findFirst({
    where: { id: attemptId },
  });
  if (!attempt) throw new WorkspaceUploadOcrError("OCR attempt not found", 404);
  if (attempt.sourceContentHash !== sourceContentHash) {
    throw new WorkspaceUploadOcrError("OCR failure scope mismatch", 409);
  }
  if (attempt.status === "FAILED" && attempt.errorCode === errorCode) {
    return toSummary(attempt);
  }
  if (attempt.status !== "QUEUED" && attempt.status !== "PROCESSING") {
    throw new WorkspaceUploadOcrError(
      "OCR attempt cannot fail from " + attempt.status,
      409,
    );
  }

  const updated = await deps.prisma.workspaceUploadOcrAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "FAILED",
      errorCode,
      completedAt: deps.now(),
    },
  });
  return toSummary(updated);
}

const parseStoredSegments = (
  value: unknown,
): WorkspaceUploadOcrSegment[] => {
  if (!Array.isArray(value)) return [];
  return normalizeSegments(
    value.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const pageNumber = (entry as Record<string, unknown>).pageNumber;
      const content = (entry as Record<string, unknown>).content;
      return typeof pageNumber === "number" && typeof content === "string"
        ? [{ pageNumber, content }]
        : [];
    }),
  );
};

export async function reviewWorkspaceUploadOcrAttempt({
  projectId,
  uploadId,
  attemptId,
  userId,
  decision,
  note,
  deps = defaultDependencies(),
}: {
  projectId: string;
  uploadId: string;
  attemptId: string;
  userId: string;
  decision: "APPROVE" | "REJECT";
  note?: string;
  deps?: WorkspaceUploadOcrDependencies;
}): Promise<{
  attempt: WorkspaceUploadOcrAttemptSummary;
  indexingStatus: OcrUpload["indexingStatus"];
}> {
  const reviewerRef = userId === "dev-bypass-user" ? "dev-bypass-user" : userId;
  const reviewNote = normalizeText(note ?? "");
  if (decision === "REJECT" && reviewNote.length < 3) {
    throw new WorkspaceUploadOcrError(
      "A review note is required when rejecting OCR output",
    );
  }

  const { project, upload } = await loadOwnedUpload({
    projectId,
    uploadId,
    userId,
    prismaClient: deps.prisma,
  });
  const sourceContentHash = requireSourceHash(upload);
  const attempt = await deps.prisma.workspaceUploadOcrAttempt.findFirst({
    where: { id: attemptId, uploadId: upload.id },
  });
  if (!attempt) throw new WorkspaceUploadOcrError("OCR attempt not found", 404);
  if (attempt.sourceContentHash !== sourceContentHash) {
    throw new WorkspaceUploadOcrError(
      "The upload changed after OCR. Queue OCR again for the current bytes.",
      409,
    );
  }

  if (decision === "REJECT") {
    if (attempt.status === "REJECTED") {
      return { attempt: toSummary(attempt), indexingStatus: upload.indexingStatus };
    }
    if (attempt.status !== "REVIEW_REQUIRED") {
      throw new WorkspaceUploadOcrError(
        "OCR output cannot be rejected from " + attempt.status,
        409,
      );
    }
    const rejected = await deps.prisma.workspaceUploadOcrAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "REJECTED",
        reviewedAt: deps.now(),
        reviewerRef,
        reviewNote,
      },
    });
    return { attempt: toSummary(rejected), indexingStatus: upload.indexingStatus };
  }

  if (attempt.status === "PROMOTED") {
    return { attempt: toSummary(attempt), indexingStatus: upload.indexingStatus };
  }
  if (attempt.status !== "REVIEW_REQUIRED") {
    throw new WorkspaceUploadOcrError(
      "OCR output cannot be promoted from " + attempt.status,
      409,
    );
  }

  const segments = parseStoredSegments(attempt.resultSegments);
  const expectedResultHash = resultHash(segments);
  const extractedText = segments
    .map((segment) => segment.content)
    .join("\n\n");
  if (
    segments.length === 0 ||
    !attempt.resultText ||
    normalizeText(attempt.resultText) !== extractedText ||
    attempt.resultContentHash !== expectedResultHash
  ) {
    throw new WorkspaceUploadOcrError(
      "Stored OCR output failed its integrity check",
      409,
    );
  }

  const now = deps.now();
  const extraction: UploadEvidenceExtraction = {
    contentHash: sourceContentHash,
    extractedText,
    extractionMethod: "ocr-reviewed-v1",
    extractionMetadata: {
      schemaVersion: 1,
      ocrAttemptId: attempt.id,
      providerKey: attempt.providerKey,
      resultContentHash: expectedResultHash,
      pages: segments.map((segment) => ({
        pageNumber: segment.pageNumber,
        characterCount: segment.content.length,
      })),
    },
    extractedAt: now,
    pageCount: attempt.pageCount,
    evidenceStatus: "READY",
    reviewReason: null,
    segments: segments.map<EvidenceSegment>((segment) => ({
      heading: "Page " + String(segment.pageNumber),
      content: segment.content,
      pageNumber: segment.pageNumber,
    })),
  };

  await deps.prisma.$transaction(async (tx) => {
    const claimed = await tx.workspaceUploadOcrAttempt.updateMany({
      where: { id: attempt.id, status: "REVIEW_REQUIRED" },
      data: {
        status: "PROMOTED",
        reviewedAt: now,
        reviewerRef,
        reviewNote: reviewNote || "OCR output visually reviewed and approved.",
        promotedAt: now,
      },
    });
    if (claimed.count !== 1) {
      throw new WorkspaceUploadOcrError(
        "OCR review changed concurrently. Refresh before retrying.",
        409,
      );
    }

    await tx.workspaceUpload.update({
      where: { id: upload.id },
      data: {
        extractedText: extraction.extractedText,
        extractionMethod: extraction.extractionMethod,
        extractionMetadata: extraction.extractionMetadata,
        extractedAt: extraction.extractedAt,
        pageCount: extraction.pageCount,
        evidenceStatus: "READY",
        reviewReason: null,
        indexingStatus: "PENDING",
        indexedAt: null,
        indexingError: null,
      },
    });
  });

  let indexingStatus: OcrUpload["indexingStatus"] = "PENDING";
  try {
    await deps.indexEvidence({
      extraction,
      fileName: upload.fileName,
      projectId: project.id,
      uploadId: upload.id,
      prismaClient: deps.prisma as unknown as PrismaClient,
    });
    await deps.prisma.workspaceUpload.update({
      where: { id: upload.id },
      data: {
        indexingStatus: "READY",
        indexedAt: deps.now(),
        indexingError: null,
      },
    });
    indexingStatus = "READY";
  } catch (error) {
    const safeError =
      error instanceof Error
        ? error.message.slice(0, 1000)
        : "Unknown indexing failure";
    await deps.prisma.workspaceUpload.update({
      where: { id: upload.id },
      data: {
        indexingStatus: "FAILED",
        indexingError: safeError,
      },
    });
    indexingStatus = "FAILED";
  }

  const promoted = await deps.prisma.workspaceUploadOcrAttempt.findFirst({
    where: { id: attempt.id },
  });
  if (!promoted) {
    throw new WorkspaceUploadOcrError(
      "Promoted OCR attempt could not be reloaded",
      500,
    );
  }
  return { attempt: toSummary(promoted), indexingStatus };
}
