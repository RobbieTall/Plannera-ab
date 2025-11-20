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

type UploadErrorResponse = {
  error: string;
  limit?: number;
  tier?: UploadTier;
  message?: string;
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

const logWorkspaceUploadError = (error: unknown, storageMode?: StorageProvider) => {
  const details = getErrorDetails(error);
  console.error("[workspace-upload-error]", {
    ...details,
    storageMode,
  });
};

const limitReachedResponse = (tier: UploadTier) => ({
  error: "upload_limit_reached",
  limit: WORKSPACE_UPLOAD_LIMITS[tier],
  tier,
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

export async function GET(_request: NextRequest, { params }: { params: { projectId: string } }) {
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

    return NextResponse.json({ uploads, usage: { used: uploads.length } });
  } catch (error) {
    logWorkspaceUploadError(error);
    return NextResponse.json({ error: "unknown_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const storageStatus = getWorkspaceStorageStatus();
  const storageMode = storageStatus.provider;

  try {
    if (!storageStatus.ready) {
      console.warn("[workspace-upload-warning]", {
        provider: storageStatus.provider,
        missingEnv: storageStatus.missingEnv,
        reason: storageStatus.reason,
      });
      return NextResponse.json<UploadErrorResponse>({ error: "storage_not_configured" }, { status: 503 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((file): file is File => file instanceof File);
    if (!files.length) {
      return NextResponse.json<UploadErrorResponse>({ error: "invalid_file", message: "No files provided." }, { status: 400 });
    }

    try {
      for (const file of files) {
        validateFileForUpload(file);
      }
    } catch (error) {
      if (error instanceof UploadError) {
        return NextResponse.json<UploadErrorResponse>(
          { error: error.code, message: error.message },
          { status: error.status },
        );
      }
      throw error;
    }

    const session = await getServerSession(authOptions);
    const tier = deriveTier(session);
    const limit = WORKSPACE_UPLOAD_LIMITS[tier];
    const userId = session?.user?.id;

    const usageFilter =
      tier === "guest" || !userId
        ? { projectId: params.projectId }
        : // Free and Pro plans are counted per workspace to match the existing Sources panel UI.
          { projectId: params.projectId, userId };

    let existingUploads = 0;
    try {
      existingUploads = await prisma.workspaceUpload.count({ where: usageFilter });
    } catch (error) {
      logWorkspaceUploadError(error);
      return NextResponse.json<UploadErrorResponse>({ error: "db_error" }, { status: 500 });
    }

    if (limit > 0 && existingUploads >= limit) {
      return NextResponse.json<UploadErrorResponse>(limitReachedResponse(tier), { status: 403 });
    }

    if (limit > 0 && existingUploads + files.length > limit) {
      return NextResponse.json<UploadErrorResponse>(limitReachedResponse(tier), { status: 403 });
    }

    const uploads = [] as Array<{
      id: string;
      fileName: string;
      mimeType: string | null;
      fileSize: number;
      publicUrl: string;
      createdAt: Date;
    }>;

    try {
      const created = await persistWorkspaceUploads({
        projectId: params.projectId,
        files,
        userId,
        prisma,
        saveFile: saveFileToUploads,
        extractPdfText,
      });
      uploads.push(...created);
    } catch (error) {
      logWorkspaceUploadError(error, storageMode);
      if (error instanceof UploadError) {
        return NextResponse.json<UploadErrorResponse>(
          { error: error.code, message: error.message },
          { status: error.status },
        );
      }
      if (isStorageUploadError(error)) {
        return NextResponse.json<UploadErrorResponse>({ error: "storage_upload_failed" }, { status: 500 });
      }
      return NextResponse.json<UploadErrorResponse>({ error: "storage_upload_failed" }, { status: 500 });
    }

    const used = existingUploads + uploads.length;

    return NextResponse.json({
      uploads,
      usage: { used, limit },
      tier,
    }, { status: 201 });
  } catch (error) {
    logWorkspaceUploadError(error, storageMode);
    return NextResponse.json<UploadErrorResponse>({ error: "unknown_error" }, { status: 500 });
  }
}
