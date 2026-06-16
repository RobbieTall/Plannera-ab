import { NextResponse } from "next/server";

import { isAuthorized } from "@/lib/admin-auth";

import { promoteMaturity } from "@/lib/lga-coverage-qa";

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


export async function POST(request: Request) {
  const url = new URL(request.url);

  const secret = getProvidedSecret(request, url);

  if (!isAuthorized(secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { lgaCode?: unknown } | null;
    const lgaCode = typeof body?.lgaCode === "string" ? body.lgaCode.trim().toUpperCase() : "";

    if (!lgaCode) {
      return NextResponse.json({ error: "missing_lga_code" }, { status: 400 });
    }

    const promotion = await promoteMaturity(lgaCode);
    return NextResponse.json({ lgaCode, ...promotion });
  } catch (error) {
    console.error("[admin-lga-coverage-promote] failed", error);
    return NextResponse.json(
      {
        error: "lga_coverage_promotion_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
