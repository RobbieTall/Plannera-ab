import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/artefact-service";
import { inspectPreviewDatabaseTarget } from "@/lib/preview-database-target";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = inspectPreviewDatabaseTarget(process.env);
  if (result === null) {
    return new Response(null, { status: 404 });
  }

  try {
    await requireSessionUser();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { target: result },
    { headers: { "Cache-Control": "no-store" } },
  );
}
