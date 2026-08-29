import { NextResponse, type NextRequest } from "next/server";

import { ArtefactAccessError, requireSessionUser } from "@/lib/artefact-service";
import {
  reviewUploadEvidenceApplicability,
  UploadEvidenceApplicabilityError,
} from "@/lib/upload-evidence-applicability";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; uploadId: string } },
) {
  try {
    const { userId } = await requireSessionUser();
    const upload = await reviewUploadEvidenceApplicability({
      body: await request.json(),
      projectId: params.projectId,
      uploadId: params.uploadId,
      userId,
    });
    return NextResponse.json({ upload });
  } catch (error) {
    if (error instanceof UploadEvidenceApplicabilityError || error instanceof ArtefactAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[upload-evidence-applicability] Unexpected error", error);
    return NextResponse.json({ error: "Unable to review uploaded evidence" }, { status: 500 });
  }
}
