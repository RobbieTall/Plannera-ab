import { NextResponse } from "next/server";

import { ingestCouncilDcp } from "@/lib/dcp/council-dcp-ingestion";
import { resolveCouncilLgaCode } from "@/lib/dcp/council-lga-codes";

const accessToken = process.env.ADMIN_ACCESS_TOKEN;

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? request.headers.get("x-admin-token");
    const lgaCodeParam = url.searchParams.get("lgaCode") ?? "";
    const lgaCode = resolveCouncilLgaCode(lgaCodeParam);

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "admin_token_missing" }, { status: 401 });
    }

    if (!token || token !== accessToken) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    if (!lgaCode) {
      return NextResponse.json({ ok: false, error: "lga_required" }, { status: 400 });
    }

    const result = await ingestCouncilDcp(lgaCode);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[dcp-ingest-admin]", error);
    return NextResponse.json({ ok: false, error: "dcp_ingest_failed" }, { status: 500 });
  }
}
