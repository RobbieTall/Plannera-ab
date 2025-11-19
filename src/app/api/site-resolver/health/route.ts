import { NextResponse } from "next/server";

import { getSiteResolverConfigStatus } from "@/lib/site-resolver";

export async function GET() {
  const status = getSiteResolverConfigStatus();
  console.log("[site-resolver-health]", status);

  const httpStatus = status.status === "ok" ? 200 : 503;
  return NextResponse.json(status, { status: httpStatus });
}
