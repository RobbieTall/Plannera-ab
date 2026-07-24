import { NextResponse } from "next/server";

import { isAuthorized } from "@/lib/admin-auth";
import {
  buildCommercialFunnelReport,
  COMMERCIAL_FUNNEL_RETENTION_DAYS,
} from "@/lib/commercial-funnel-events";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 30;

export const resolveCommercialFunnelMetricsWindow = (
  url: URL,
  now = new Date(),
): { from: Date; to: Date } | null => {
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to") as string) : now;
  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from") as string)
    : new Date(to.getTime() - DEFAULT_WINDOW_DAYS * DAY_MS);

  if ([from, to].some((date) => Number.isNaN(date.getTime()))) return null;
  if (from >= to || to.getTime() - from.getTime() > COMMERCIAL_FUNNEL_RETENTION_DAYS * DAY_MS) {
    return null;
  }
  return { from, to };
};

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
