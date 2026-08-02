import { NextResponse, type NextRequest } from "next/server";

import {
  ArtefactAccessError,
  ArtefactValidationError,
  requireSessionUser,
} from "@/lib/artefact-service";
import { recordCommercialFunnelEventSafely } from "@/lib/commercial-funnel-events";
import {
  getConsultantReferralForReview,
  resolveConsultantReferralSubmissionEnabled,
  submitConsultantReferral,
} from "@/lib/consultant-referrals";

export const dynamic = "force-dynamic";

const errorResponse = (error: unknown) => {
  if (error instanceof ArtefactValidationError || error instanceof ArtefactAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[consultant-referrals] request failed", error);
  return NextResponse.json({ error: "Consultant referral service is unavailable" }, { status: 500 });
};

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const { userId } = await requireSessionUser();
    const reviewRequestArtefactId = request.nextUrl.searchParams.get("reviewRequestArtefactId")?.trim();
    if (!reviewRequestArtefactId) {
      return NextResponse.json({ error: "reviewRequestArtefactId is required" }, { status: 400 });
    }
    const referral = await getConsultantReferralForReview({
      projectId: params.projectId,
      reviewRequestArtefactId,
      userId,
    });
    return NextResponse.json({
      enabled: resolveConsultantReferralSubmissionEnabled(),
      referral,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  if (!resolveConsultantReferralSubmissionEnabled()) {
    return NextResponse.json(
      { error: "Direct consultant referral submission is not currently enabled" },
      { status: 503 },
    );
  }
  try {
    const { userId } = await requireSessionUser();
    const result = await submitConsultantReferral({
      projectId: params.projectId,
      body: await request.json(),
      userId,
    });
    if (result.created) {
      await recordCommercialFunnelEventSafely({
        eventName: "CONSULTANT_REFERRAL_SUBMITTED",
        projectId: result.projectId,
        sourceRecordId: result.referral.id,
        actorUserId: userId,
      });
    }
    return NextResponse.json(
      { referral: result.referral, created: result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
