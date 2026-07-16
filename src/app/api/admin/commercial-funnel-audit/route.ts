export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { isAuthorized } from "@/lib/admin-auth";
import { auditCommercialFunnel } from "@/lib/commercial-funnel-audit";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret") ?? url.searchParams.get("token") ?? request.headers.get("x-admin-token");
  if (!isAuthorized(secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const projectId = url.searchParams.get("projectId")?.trim();
  if (!projectId) return NextResponse.json({ error: "projectId_required" }, { status: 400 });

  const audit = await auditCommercialFunnel(projectId);
  if ("error" in audit) return NextResponse.json(audit, { status: 404 });
  return NextResponse.json(audit);
}
