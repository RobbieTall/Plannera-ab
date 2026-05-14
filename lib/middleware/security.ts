import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;
// Prune stale entries after this many requests to bound memory usage.
const PRUNE_INTERVAL = 500;
let pruneCounter = 0;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function pruneExpired(now: number): void {
  for (const [key, record] of requestCounts) {
    if (now > record.resetAt) requestCounts.delete(key);
  }
}

export function rateLimit(req: NextRequest): NextResponse | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();

  if (++pruneCounter >= PRUNE_INTERVAL) {
    pruneCounter = 0;
    pruneExpired(now);
  }

  const record = requestCounts.get(ip);

  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  record.count++;
  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((record.resetAt - now) / 1000)),
        },
      }
    );
  }

  return null;
}

export function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

export async function withSecurity(
  req: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;
  const response = await handler();
  const headers = securityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}
