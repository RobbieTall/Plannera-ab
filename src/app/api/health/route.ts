import { NextRequest, NextResponse } from "next/server";
import { journalDb } from "../../../../db";
import { sql } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  const status: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    environment: process.env.NODE_ENV,
  };

  try {
    await journalDb.execute(sql`SELECT 1`);
    status.database = "connected";
  } catch (err) {
    status.database = "error";
    status.databaseError = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ...status, status: "degraded" }, { status: 503 });
  }

  return NextResponse.json(status);
}
