export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { isAuthorized } from "@/lib/admin-auth";
import { getByronDcpCoverage } from "@/lib/dcp/byron-ingestion";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? request.headers.get("x-admin-token");
  const lga = (url.searchParams.get("lga") || "").toUpperCase();

  const secret = token;

  if (!isAuthorized(secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!lga) {
    return NextResponse.json({ ok: false, error: "lga_required" }, { status: 400 });
  }

  if (lga !== "BYRON") {
    return NextResponse.json({ ok: false, error: "lga_not_supported" }, { status: 400 });
  }

  const coverage = await getByronDcpCoverage();

  return NextResponse.json({ ok: true, ...coverage });
}
