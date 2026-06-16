import { NextResponse } from "next/server";

import { isAuthorized } from "@/lib/admin-auth";

import { runChecksForCurrentState } from "@/lib/lga-coverage-qa";

export const dynamic = "force-dynamic";

const getProvidedSecret = (request: Request, url: URL) => {
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return (
    bearerToken ??
    request.headers.get("x-admin-secret") ??
    request.headers.get("x-ingest-secret") ??
    request.headers.get("x-admin-token") ??
    url.searchParams.get("secret") ??
    url.searchParams.get("token")
  );
};


export async function GET(request: Request) {
  const url = new URL(request.url);

  const secret = getProvidedSecret(request, url);

  if (!isAuthorized(secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const lgaCode = url.searchParams.get("lgaCode")?.trim().toUpperCase() ?? "";

    if (!lgaCode) {
      return NextResponse.json({ error: "missing_lga_code" }, { status: 400 });
    }

    const { currentState, qaResult } = await runChecksForCurrentState(lgaCode);
    return NextResponse.json({ lgaCode, currentState, qaResult });
  } catch (error) {
    console.error("[admin-lga-coverage-qa] failed", error);
    return NextResponse.json(
      {
        error: "lga_coverage_qa_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
