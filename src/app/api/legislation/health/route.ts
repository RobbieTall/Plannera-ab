import { NextResponse } from "next/server";

import { getLegislationHealth } from "@/lib/legislation/service";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503 });
  }

  try {
    const health = await getLegislationHealth();
    return NextResponse.json({
      ok: true,
      instrumentCount: health.instrumentCount,
      clauseCount: health.clauseCount,
      instruments: health.instruments.map((instrument) => ({
        ...instrument,
        lastSyncedAt: instrument.lastSyncedAt?.toISOString() ?? null,
        updatedAt: instrument.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[legislation-health] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "legislation_health_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
