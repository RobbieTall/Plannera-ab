import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractPdfText } from "@/lib/pdf-text";
import {
  getWorkspaceStorageStatus,
  isStorageUploadError,
  saveFileToUploads,
  type StorageProvider,
} from "@/lib/storage";
import {
  persistWorkspaceUploads,
  UploadError,
  validateFileForUpload,
} from "@/lib/upload-service";
import { WORKSPACE_UPLOAD_LIMITS } from "@/lib/usage-limits";
import type { UserTier } from "@/types/workspace";

const PAID_PLAN_VALUES = new Set(["pro", "professional", "paid", "premium", "day_pass", "day-pass", "daypass"]);

type UploadTier = UserTier;

type UploadStage = "validation" | "storage" | "db" | "unknown";

type StructuredErrorResponse = {
  ok: false;
  errorCode: string;
  error?: string;
  message: string;
  limit?: number;
  tier?: UploadTier;
};

type StructuredSuccessResponse = {
  ok: true;
  uploads: Array<{
    id: string;
    fileName: string;
    fileExtension: string | null;
    mimeType: string | null;
    fileSize: number;
    publicUrl: string;
    createdAt: Date;
  }>;
  usage: { used: number; limit: number };
  tier: UploadTier;
};

type ErrorWithResponse = { status?: number; response?: { status?: number } };

const getErrorDetails = (error: unknown) => {
  if (!error) {
    return { message: "Unknown error" };
  }

  const status = (error as ErrorWithResponse)?.status ?? (error as ErrorWithResponse)?.response?.status;

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      status,
    };
  }

  return {
    message: String(error),
    status,
  };
};

const logStructuredUploadError = (
  stage: UploadStage,
  projectId: string | undefined,
  storageMode: StorageProvider | undefined,
  error: unknown,
  meta: Record<string, unknown> = {},
) => {
  console.error("[upload-error]", {
    stage,
    projectId,
    storageMode,
    ...meta,
    error: getErrorDetails(error),
  });
};

const logStructuredWarning = (
  stage: UploadStage,
  projectId: string | undefined,
  storageMode: StorageProvider | undefined,
  meta: Record<string, unknown>,
) => {
  console.error("[upload-error]", {
    stage,
    projectId,
    storageMode,
    ...meta,
  });
};

const limitReachedResponse = (tier: UploadTier): StructuredErrorResponse => ({
  ok: false,
  errorCode: "upload_limit_reached",
  error: "upload_limit_reached",
  limit: WORKSPACE_UPLOAD_LIMITS[tier],
  tier,
  message: "Upload limit reached for your plan.",
});

const deriveTier = (session: Session | null): UploadTier => {
  if (!session?.user?.id) {
    return "guest";
  }
  const planSource = session.user.plan ?? session.user.subscriptionTier ?? "";
  if (planSource && PAID_PLAN_VALUES.has(planSource.toLowerCase())) {
    return "pro";
  }
  return "free";
};

type UploadHandlerDeps = {
  getStorageStatus: typeof getWorkspaceStorageStatus;
  validateFile: typeof validateFileForUpload;
  getSession: () => Promise<Session | null>;
  countUploads: typeof prisma.workspaceUpload.count;
  persistUploads: typeof persistWorkspaceUploads;
  storageMode: StorageProvider;
  prisma: typeof prisma;
  saveFile: typeof saveFileToUploads;
  extractPdfText?: typeof extractPdfText;
};

const defaultDeps: UploadHandlerDeps = {
  getStorageStatus: getWorkspaceStorageStatus,
  validateFile: validateFileForUpload,
  getSession: () => getServerSession(authOptions),
  countUploads: prisma.workspaceUpload.count.bind(prisma.workspaceUpload),
  persistUploads: persistWorkspaceUploads,
  storageMode: getWorkspaceStorageStatus().provider,
  prisma,
  saveFile: saveFileToUploads,
  extractPdfText,
};

export async function handleUploadGet(_request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const uploads = await prisma.workspaceUpload.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        fileExtension: true,
        mimeType: true,
        fileSize: true,
        publicUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json<StructuredSuccessResponse>({
      ok: true,
      uploads,
      usage: { used: uploads.length, limit: WORKSPACE_UPLOAD_LIMITS["guest"] },
      tier: "guest",
    });
  } catch (error) {
    logStructuredUploadError("unknown", params.projectId, undefined, error);
    return NextResponse.json<StructuredErrorResponse>(
      { ok: false, errorCode: "unknown_error", message: "Unable to load uploads." },
      { status: 500 },
    );
  }
}

export async function handleUploadPost(
  request: NextRequest,
  { params, deps }: { params: { projectId: string }; deps?: Partial<UploadHandlerDeps> },
) {
  const resolvedDeps: UploadHandlerDeps = { ...defaultDeps, ...deps } as UploadHandlerDeps;
  const storageStatus = resolvedDeps.getStorageStatus();
  const storageMode = resolvedDeps.storageMode ?? storageStatus.provider;
  const normalizedProjectId = params.projectId?.trim();

  const respondWithError = (
    stage: UploadStage,
    errorCode: string,
    status: number,
    message: string,
    meta: Record<string, unknown> = {},
    error?: unknown,
  ) => {
    logStructuredUploadError(stage, normalizedProjectId ?? params.projectId, storageMode, error ?? message, meta);
    return NextResponse.json<StructuredErrorResponse>(
      { ok: false, errorCode, error: errorCode, message },
      { status },
    );
  };

  try {
    const projectId = normalizedProjectId;

    if (!projectId) {
      return respondWithError("validation", "project_id_missing", 400, "A project id is required to upload files.");
    }

    if (!storageStatus.ready) {
      const message =
        storageStatus.reason ||
        (storageStatus.missingEnv?.length
          ? `Missing storage configuration: ${storageStatus.missingEnv.join(", ")}`
          : "File storage is not configured on the server.");
      logStructuredWarning("storage", params.projectId, storageMode, {
        missingEnv: storageStatus.missingEnv,
        reason: storageStatus.reason,
        errorCode: "storage_config_missing",
      });
      return NextResponse.json<StructuredErrorResponse>(
        { ok: false, errorCode: "storage_config_missing", error: "storage_config_missing", message },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((file): file is File => file instanceof File);
    if (!files.length) {
      return respondWithError("validation", "invalid_file", 400, "No files provided.");
    }

    try {
      for (const file of files) {
        resolvedDeps.validateFile(file);
      }
    } catch (error) {
      if (error instanceof UploadError) {
        const meta = { filename: files[0]?.name, mimeType: files[0]?.type };
        const friendlyMessage =
          error.code === "unsupported_file_type"
            ? "Only PDF, DOCX, XLSX, CSV, TXT, MD, PNG, JPG, JPEG, ZIP are allowed."
            : error.code === "file_too_large"
              ? "One or more files exceed the upload limit."
              : error.message;
        return respondWithError("validation", error.code, error.status, friendlyMessage, meta, error);
      }
      return respondWithError("validation", "unknown_error", 400, "Unable to validate files.", {}, error);
    }

    const session = await resolvedDeps.getSession();
    const tier = deriveTier(session);
    const limit = WORKSPACE_UPLOAD_LIMITS[tier];
    const userId = session?.user?.id;

    const usageFilter =
      tier === "guest" || !userId
        ? { projectId }
        : // Free and Pro plans are counted per workspace to match the existing Sources panel UI.
          { projectId, userId };

    let existingUploads = 0;
    try {
      existingUploads = await resolvedDeps.countUploads({ where: usageFilter });
    } catch (error) {
      return respondWithError("db", "db_read_failed", 500, "Unable to check existing uploads.", { usageFilter }, error);
    }

    if (limit > 0 && existingUploads >= limit) {
      return NextResponse.json<StructuredErrorResponse>(limitReachedResponse(tier), { status: 403 });
    }

    if (limit > 0 && existingUploads + files.length > limit) {
      return NextResponse.json<StructuredErrorResponse>(limitReachedResponse(tier), { status: 403 });
    }

    const uploads = [] as StructuredSuccessResponse["uploads"];

    try {
      const created = await resolvedDeps.persistUploads({
        projectId,
        files,
        userId,
        prisma: resolvedDeps.prisma,
        saveFile: resolvedDeps.saveFile,
        extractPdfText: resolvedDeps.extractPdfText,
      });
      uploads.push(...created);
    } catch (error) {
      if (error instanceof UploadError) {
        const mappedCode =
          error.code === "invalid_project"
            ? "project_not_found"
            : error.code === "project_id_missing"
              ? "project_id_missing"
              : error.code;
        return respondWithError("validation", mappedCode, error.status, error.message, {}, error);
      }
      if (isStorageUploadError(error)) {
        return respondWithError("storage", "storage_upload_failed", 500, "Unable to upload file to storage.", {}, error);
      }
      return respondWithError("db", "db_write_failed", 500, "Unable to save uploads.", {}, error);
    }

    const used = existingUploads + uploads.length;

    return NextResponse.json<StructuredSuccessResponse>(
      {
        ok: true,
        uploads,
        usage: { used, limit },
        tier,
      },
      { status: 201 },
    );
  } catch (error) {
    return respondWithError("unknown", "unknown_error", 500, "Unable to upload documents right now.", {}, error);
  }
}

