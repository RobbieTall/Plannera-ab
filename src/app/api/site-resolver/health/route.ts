import { NextResponse } from "next/server";

import { getSiteResolverConfigStatus } from "@/lib/site-resolver";

export async function GET() {
  const status = await getSiteResolverConfigStatus();
  const payload =
    status.status === "ok" && status.provider === "google"
      ? { ...status, provider: "google", env_ok: status.env_ok ?? true }
      : status;
  console.log("[site-resolver-health]", payload);

  const httpStatus = payload.status === "ok" ? 200 : 503;
  return NextResponse.json(payload, { status: httpStatus });
}
