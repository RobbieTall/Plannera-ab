import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { buildLepConfigFromFile } from "@/lib/lep/lep-ingest-files";
import { syncInstrumentWithConfig } from "@/lib/legislation/service";

/**
 * Admin-only endpoint to ingest every NSW LEP XML file under data/nsw/xml.
 *
 * Usage (after setting INGEST_ADMIN_SECRET in the environment):
 *   POST https://<prod-domain>/api/admin/ingest-lep?secret=<value>
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

  const xmlDir = path.resolve(process.cwd(), "data/nsw/xml");
  let xmlFiles: string[];

  try {
    xmlFiles = (await fs.readdir(xmlDir)).filter((file) => file.toLowerCase().endsWith(".xml"));
  } catch (error) {
    console.error("[lep-ingest] Unable to read XML directory", error);
    return NextResponse.json({ error: "Failed to read LEP XML directory" }, { status: 500 });
  }

  const summary = {
    instrumentsProcessed: 0,
    totalClauses: 0,
    failures: [] as { file: string; error: string }[],
  };

  for (const fileName of xmlFiles) {
    const filePath = path.join(xmlDir, fileName);
    try {
      const { config } = await buildLepConfigFromFile(filePath);
      const result = await syncInstrumentWithConfig(config);

      if (result.status === "ok") {
        summary.instrumentsProcessed += 1;
        summary.totalClauses += result.parsedClauses;
        continue;
      }

      summary.failures.push({
        file: fileName,
        error:
          result.status === "skipped"
            ? result.reason
            : result.error?.message ?? "Unknown ingestion failure",
      });
    } catch (error) {
      console.error(`[lep-ingest] Failed to process ${fileName}`, error);
      summary.failures.push({ file: fileName, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return NextResponse.json(summary);
}
