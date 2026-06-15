import { NextResponse } from "next/server";

import { ingestCouncilDcp } from "@/lib/dcp/council-dcp-ingestion";
import { ingestByronDcp } from "@/lib/dcp/byron-ingestion";

const getAccessToken = () => process.env.ADMIN_ACCESS_TOKEN || process.env.INGEST_ADMIN_SECRET;
const SUPPORTED_DCP_LGAS = new Set(["BYRON", "KEMPSEY"]);

export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? url.searchParams.get("secret") ?? request.headers.get("x-admin-token");
  const accessToken = getAccessToken();
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

  if (!SUPPORTED_DCP_LGAS.has(lgaCode)) {
    return NextResponse.json({ ok: false, error: "unsupported_lga", lga: lgaCode }, { status: 400 });
  }

  try {
    const result = lgaCode === "BYRON" ? await ingestByronDcp() : await ingestCouncilDcp(lgaCode);

    if ("lga" in result) {
      return NextResponse.json({
        ok: true,
        lga: result.lga,
        clauseCount: result.clauseCount,
        dcpClauseCount: result.dcpClauseCount,
        chunkCount: lgaCode === "BYRON" ? 0 : "chunkCount" in result ? result.chunkCount : 0,
        tableCount: "tableCount" in result ? result.tableCount : 0,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        chunksCreated: result.chunksCreated,
        councilDocumentId: result.councilDocumentId,
        title: result.title,
      },
      { status: 200 },
    );
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
