import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { INSTRUMENT_CONFIG } from "@/lib/legislation/config";
import { syncAllInstruments, type SyncResult } from "@/lib/legislation/service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const requestSchema = z.object({
  slugs: z.array(z.string().min(1)).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

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

const hasSecretAccess = (providedSecret: string | null) => {
  const configuredSecret =
    process.env.ADMIN_SECRET ?? process.env.INGEST_ADMIN_SECRET ?? process.env.ADMIN_ACCESS_TOKEN;
  return Boolean(configuredSecret && providedSecret && providedSecret === configuredSecret);
};

const isAuthorized = async (request: Request, url: URL) => {
  if (hasSecretAccess(getProvidedSecret(request, url))) {
    return true;
  }

  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.email);
};

const serializeSyncResult = (result: SyncResult) => {
  const base = {
    status: result.status,
    slug: result.config.slug,
    name: result.config.name,
    instrumentType: result.config.instrumentType,
    added: result.added,
    updated: result.updated,
    parsedClauses: result.parsedClauses ?? 0,
    instrument: result.instrument
      ? {
          id: result.instrument.id,
          slug: result.instrument.slug,
          name: result.instrument.name,
          shortName: result.instrument.shortName,
          instrumentType: result.instrument.instrumentType,
          jurisdiction: result.instrument.jurisdiction,
          lastSyncedAt: result.instrument.lastSyncedAt?.toISOString() ?? null,
        }
      : null,
  };

  if (result.status === "error") {
    return { ...base, error: result.error.message };
  }

  if (result.status === "skipped") {
    return { ...base, reason: result.reason };
  }

  return base;
};

const buildSummary = (results: SyncResult[]) => ({
  total: results.length,
  ok: results.filter((result) => result.status === "ok").length,
  skipped: results.filter((result) => result.status === "skipped").length,
  error: results.filter((result) => result.status === "error").length,
  added: results.reduce((sum, result) => sum + result.added, 0),
  updated: results.reduce((sum, result) => sum + result.updated, 0),
  parsedClauses: results.reduce((sum, result) => sum + (result.parsedClauses ?? 0), 0),
});

export async function POST(request: Request) {
  const url = new URL(request.url);

  if (!(await isAuthorized(request, url))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  try {
    const body = request.headers.get("content-type")?.includes("application/json")
      ? await request.json()
      : {};
    const payload = requestSchema.parse({
      ...body,
      limit: body.limit ?? (url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined),
      slugs: body.slugs ?? url.searchParams.get("slugs")?.split(",").map((slug) => slug.trim()).filter(Boolean),
    });

    const results = await syncAllInstruments({
      configs: INSTRUMENT_CONFIG,
      slugs: payload.slugs,
      limit: payload.limit,
    });

    return NextResponse.json({
      ok: results.every((result) => result.status !== "error"),
      source: "src/lib/legislation/instruments.json",
      summary: buildSummary(results),
      results: results.map(serializeSyncResult),
    });
  } catch (error) {
    console.error("[admin-legislation-sync-all] failed", error);
    return NextResponse.json(
      {
        error: "legislation_sync_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
