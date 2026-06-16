import { NextResponse } from "next/server";

import { isAuthorized } from "@/lib/admin-auth";

import { processNextLgaJob } from "@/lib/lga-worker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
    const result = await processNextLgaJob();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin-lga-worker] failed", error);
    return NextResponse.json(
      {
        error: "lga_worker_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
