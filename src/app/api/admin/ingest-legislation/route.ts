import { NextResponse } from "next/server";

import { syncInstrument } from "@/lib/legislation/service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const getProvidedSecret = (request: Request, url: URL) =>
  request.headers.get("x-admin-secret") ??
  request.headers.get("x-ingest-secret") ??
  request.headers.get("x-admin-token") ??
  url.searchParams.get("secret") ??
  url.searchParams.get("token") ??
  request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ??
  null;

const hasSecretAccess = (providedSecret: string | null) => {
  const configuredSecret =
    process.env.ADMIN_SECRET ?? process.env.INGEST_ADMIN_SECRET ?? process.env.ADMIN_ACCESS_TOKEN;
  return Boolean(configuredSecret && providedSecret && providedSecret === configuredSecret);
};

export async function POST(request: Request) {
  const url = new URL(request.url);

  if (!hasSecretAccess(getProvidedSecret(request, url))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (process.env.SKIP_LEGISLATION_INGEST === "true") {
    return NextResponse.json({ status: "skipped" });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  const slug = url.searchParams.get("slug") ?? "sydney-lep-2012";

  try {
    const result = await syncInstrument(slug);

    if (result.status === "error") {
      return NextResponse.json(
        { error: "legislation_ingest_failed", slug, details: result.error.message },
        { status: 500 },
      );
    }

    if (result.status === "skipped") {
      return NextResponse.json({ status: "skipped", slug, reason: result.reason });
    }

    return NextResponse.json({
      status: "ok",
      slug,
      added: result.added,
      updated: result.updated,
      parsedClauses: result.parsedClauses,
      instrument: {
        id: result.instrument.id,
        slug: result.instrument.slug,
        name: result.instrument.name,
        shortName: result.instrument.shortName,
        instrumentType: result.instrument.instrumentType,
        jurisdiction: result.instrument.jurisdiction,
        lastSyncedAt: result.instrument.lastSyncedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("Legislation ingestion failed", error);
    return NextResponse.json(
      {
        error: "Failed to ingest the requested instrument.",
        slug,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
