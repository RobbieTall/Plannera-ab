import { NextResponse } from "next/server";

import { isAuthorized } from "@/lib/admin-auth";
import { ArtefactAccessError, ArtefactValidationError } from "@/lib/artefact-service";
import {
  deleteConsultantReferral,
  listConsultantReferralQueue,
  transitionConsultantReferral,
} from "@/lib/consultant-referrals";
import {
  consultantReferralStatuses,
  type ConsultantReferralStatus,
} from "@/types/consultant-referral";

export const dynamic = "force-dynamic";

const authorized = (request: Request) => isAuthorized(request.headers.get("x-admin-token"));

const handleError = (error: unknown) => {
  if (error instanceof ArtefactValidationError || error instanceof ArtefactAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[admin-consultant-referrals] request failed", error);
  return NextResponse.json({ error: "consultant_referral_queue_unavailable" }, { status: 500 });
};

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const rawStatus = url.searchParams.get("status");
    if (rawStatus && !consultantReferralStatuses.includes(rawStatus as ConsultantReferralStatus)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    const rawLimit = Number(url.searchParams.get("limit") ?? "50");
    const referrals = await listConsultantReferralQueue({
      status: rawStatus as ConsultantReferralStatus | null,
      limit: Number.isInteger(rawLimit) ? rawLimit : 50,
    });
    return NextResponse.json({
      queueTarget: "plannera_human_queue",
      count: referrals.length,
      referrals,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const referralId = typeof body.referralId === "string" ? body.referralId.trim() : "";
    const toStatus = typeof body.toStatus === "string" ? body.toStatus : "";
    const reasonCode = typeof body.reasonCode === "string" ? body.reasonCode.trim() || null : null;
    if (!referralId || !consultantReferralStatuses.includes(toStatus as ConsultantReferralStatus)) {
      return NextResponse.json({ error: "invalid_transition_payload" }, { status: 400 });
    }
    return NextResponse.json({
      referral: await transitionConsultantReferral({
        referralId,
        toStatus: toStatus as ConsultantReferralStatus,
        reasonCode,
      }),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const referralId = new URL(request.url).searchParams.get("referralId")?.trim();
    if (!referralId) return NextResponse.json({ error: "referralId_required" }, { status: 400 });
    await deleteConsultantReferral(referralId);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
