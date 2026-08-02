import { NextResponse } from "next/server";

import { pruneClosedConsultantReferrals } from "@/lib/consultant-referrals";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  if (!expected || authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await pruneClosedConsultantReferrals();
    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("[consultant-referral-retention] failed", error);
    return NextResponse.json({ error: "retention_unavailable" }, { status: 500 });
  }
}
