import { NextResponse } from "next/server";

import { pruneExpiredCommercialFunnelEvents } from "@/lib/commercial-funnel-events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await pruneExpiredCommercialFunnelEvents();
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (error) {
    console.error("[commercial-funnel-retention] failed", error);
    return NextResponse.json({ error: "retention_unavailable" }, { status: 500 });
  }
}
