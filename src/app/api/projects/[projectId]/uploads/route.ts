import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveFileToUploads } from "@/lib/storage";
import { WORKSPACE_UPLOAD_LIMITS } from "@/lib/usage-limits";
import type { UserTier } from "@/types/workspace";

const PAID_PLAN_VALUES = new Set(["pro", "professional", "paid", "premium", "day_pass", "day-pass", "daypass"]);

type UploadTier = UserTier;

type UploadErrorResponse = {
  error: string;
  limit?: number;
  tier?: UploadTier;
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

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((file): file is File => file instanceof File);
    if (!files.length) {
      return NextResponse.json<UploadErrorResponse>({ error: "no_files_selected" }, { status: 400 });
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

    const existingUploads = await prisma.workspaceUpload.count({ where: usageFilter });

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

    for (const file of files) {
      const saved = await saveFileToUploads(file);
      const created = await prisma.workspaceUpload.create({
        data: {
          projectId: params.projectId,
          userId,
          fileName: file.name,
          mimeType: saved.mimeType ?? file.type ?? null,
          fileSize: saved.size,
          storagePath: saved.path,
          publicUrl: saved.url,
        },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          publicUrl: true,
          createdAt: true,
        },
      });
      uploads.push(created);
    }

    const used = existingUploads + uploads.length;

    return NextResponse.json({
      uploads,
      usage: { used, limit },
      tier,
    }, { status: 201 });
  } catch (error) {
    console.error("[workspace-uploads] Unexpected error", error);
    return NextResponse.json<UploadErrorResponse>({ error: "upload_failed" }, { status: 500 });
  }
}
