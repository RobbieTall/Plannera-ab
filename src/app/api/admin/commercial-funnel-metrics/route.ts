import { NextResponse } from "next/server";

import { isAuthorized } from "@/lib/admin-auth";
import {
  buildCommercialFunnelReport,
  COMMERCIAL_FUNNEL_RETENTION_DAYS,
} from "@/lib/commercial-funnel-events";
import { resolveCommercialFunnelMetricsWindow } from "@/lib/commercial-funnel-metrics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get("x-admin-token"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const window = resolveCommercialFunnelMetricsWindow(new URL(request.url));
  if (!window) {
    return NextResponse.json(
      { error: "invalid_window", maximumDays: COMMERCIAL_FUNNEL_RETENTION_DAYS },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await buildCommercialFunnelReport(window));
  } catch (error) {
    console.error("[commercial-funnel-metrics] failed", error);
    return NextResponse.json({ error: "metrics_unavailable" }, { status: 500 });
  }
}
