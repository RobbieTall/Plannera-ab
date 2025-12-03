import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { buildLepConfigFromFile } from "@/lib/lep/lep-ingest-files";
import { syncInstrumentWithConfig } from "@/lib/legislation/service";

/**
 * Admin-only endpoint to ingest NSW LEP XML files under data/nsw/xml.
 *
 * Usage (after setting INGEST_ADMIN_SECRET in the environment):
 *   POST https://<prod-domain>/api/admin/ingest-lep?secret=<value>&lga=BYRON
 *
 * The endpoint will parse each XML, upsert the instrument + clauses, and
 * can be safely re-run without creating duplicates.
 */
export async function POST(request: Request) {
  const adminSecret = process.env.INGEST_ADMIN_SECRET;
  const url = new URL(request.url);
  const providedSecret = url.searchParams.get("secret") ?? request.headers.get("x-ingest-secret");

  if (!adminSecret || providedSecret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lgaParam = url.searchParams.get("lga")?.trim();
  const normalizedLga = lgaParam?.toUpperCase().replace(/[^A-Z0-9]+/g, "_") ?? null;

  console.log("[INGEST-LEP] Start", { lga: normalizedLga });

  if (normalizedLga !== "BYRON") {
    return NextResponse.json({ error: "Only BYRON ingest is supported for now" }, { status: 400 });
  }

  const xmlDir = path.join(process.cwd(), "data", "nsw", "xml");
  const byronFileName = "Byron-lep-2014.xml";
  const xmlPath = path.join(xmlDir, byronFileName);

  try {
    await fs.access(xmlPath);
  } catch (error) {
    const message = `Byron XML not found at ${xmlPath}`;
    console.error("[INGEST-LEP] Byron error", error);
    return NextResponse.json({ error: "LEP ingestion failed for BYRON", details: message }, { status: 500 });
  }

  try {
    console.log("[INGEST-LEP] Byron config ready", { xmlPath, lgaCode: "BYRON" });

    const { config } = await buildLepConfigFromFile(xmlPath);
    const result = await syncInstrumentWithConfig(config);

    const instrumentsProcessed = result.status === "ok" ? 1 : 0;
    const totalClauses = result.status === "ok" ? result.parsedClauses : 0;
    const failed = result.status === "ok"
      ? []
      : [result.error?.message || result.reason || "Unknown ingestion failure"];

    console.log("[INGEST-LEP] Byron result", {
      instrumentsProcessed,
      totalClauses,
      failedCount: failed.length,
    });

    return NextResponse.json({ lga: "BYRON", instrumentsProcessed, totalClauses, failed });
  } catch (error) {
    console.error("[INGEST-LEP] Byron error", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "LEP ingestion failed for BYRON", details }, { status: 500 });
  }
}
