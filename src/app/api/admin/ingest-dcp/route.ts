import { NextResponse } from "next/server";

import { ingestCouncilDcp } from "@/lib/dcp/council-dcp-ingestion";
import { ingestByronDcp } from "@/lib/dcp/byron-ingestion";

const accessToken = process.env.ADMIN_ACCESS_TOKEN;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? request.headers.get("x-admin-token");
  const lgaCode = (url.searchParams.get("lgaCode") || url.searchParams.get("lga") || "").toUpperCase();

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "admin_token_missing" }, { status: 401 });
  }

  if (!token || token !== accessToken) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!lgaCode) {
    return NextResponse.json({ ok: false, error: "lga_required" }, { status: 400 });
  }

  try {
    const result = lgaCode === "BYRON" ? await ingestByronDcp() : await ingestCouncilDcp(lgaCode);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[dcp-ingest-admin]", error);
    const reason = error instanceof Error ? error.message : "unknown";
    return NextResponse.json(
      {
        ok: false,
        error: "dcp_ingest_failed",
        reason,
        lga: lgaCode,
        step: lgaCode === "BYRON" ? "byron_ingest" : "council_dcp_ingest",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
