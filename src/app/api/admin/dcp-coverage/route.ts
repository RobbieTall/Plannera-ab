export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { getByronDcpCoverage } from "@/lib/dcp/byron-ingestion";

const accessToken = process.env.ADMIN_ACCESS_TOKEN;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? request.headers.get("x-admin-token");
  const lga = (url.searchParams.get("lga") || "").toUpperCase();

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "admin_token_missing" }, { status: 401 });
  }

  if (!token || token !== accessToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!lga) {
    return NextResponse.json({ ok: false, error: "lga_required" }, { status: 400 });
  }

  if (lga !== "BYRON") {
    return NextResponse.json({ ok: false, error: "lga_not_supported" }, { status: 400 });
  }

  const coverage = await getByronDcpCoverage();

  return NextResponse.json({ ok: true, lga, ...coverage });
}
