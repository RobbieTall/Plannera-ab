import { COMMERCIAL_FUNNEL_RETENTION_DAYS } from "@/lib/commercial-funnel-events";

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
  if (
    from >= to ||
    to.getTime() - from.getTime() > COMMERCIAL_FUNNEL_RETENTION_DAYS * DAY_MS
  ) {
    return null;
  }
  return { from, to };
};
