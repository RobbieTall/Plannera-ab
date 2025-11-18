import { NextResponse } from "next/server";

import { ingestInstrument } from "@/lib/legislation/service";

export async function GET() {
  if (process.env.SKIP_LEGISLATION_INGEST === "true") {
    return NextResponse.json({ status: "skipped" });
  }

  try {
    process.env.LEGISLATION_USE_FIXTURES = "true";
    const result = await ingestInstrument("sydney-lep-2012");

    return NextResponse.json({
      clauseCount: result.clauseCount,
      instrument: {
        id: result.instrument.id,
        slug: result.instrument.slug,
        name: result.instrument.name,
        shortName: result.instrument.shortName,
        instrumentType: result.instrument.instrumentType,
        jurisdiction: result.instrument.jurisdiction,
        lastSyncedAt: result.instrument.lastSyncedAt,
      },
    });
  } catch (error) {
    console.error("Legislation ingestion failed", error);
    return NextResponse.json(
      {
        error: "Failed to ingest the Sydney LEP 2012 instrument.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
