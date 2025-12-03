import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { buildLepConfigFromFile, parseLepFilename } from "@/lib/lep/lep-ingest-files";
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
  const xmlDir = path.join(process.cwd(), "data", "nsw", "xml");
  const summary = {
    instrumentsProcessed: 0,
    totalClauses: 0,
    failed: [] as string[],
  };

  console.log(`[lep-ingest] Incoming LGA filter: ${normalizedLga ?? "ALL"}`);

  try {
    if (!normalizedLga) {
      const message = "Full LEP ingestion is too large for a single request; please specify ?lga=CODE (e.g. BYRON).";
      console.warn(`[lep-ingest] ${message}`);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    let xmlFiles: string[] = [];
    try {
      xmlFiles = (await fs.readdir(xmlDir)).filter((file) => file.toLowerCase().endsWith(".xml"));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[lep-ingest] Unable to read XML directory", error);
      summary.failed.push(`Unable to read XML directory at ${xmlDir}: ${detail}`);
      throw new Error(`Unable to read XML directory at ${xmlDir}: ${detail}`);
    }

    const filesWithInfo = xmlFiles.map((fileName) => ({ fileName, info: parseLepFilename(fileName) }));
    const filesToProcess = filesWithInfo.filter(({ info }) => info.lgaCode === normalizedLga);

    if (filesToProcess.length === 0) {
      summary.failed.push(`No XML files matched LGA ${normalizedLga}`);
      return NextResponse.json(summary);
    }

    console.log(`[lep-ingest] Processing ${filesToProcess.length} instrument(s)`);

    for (const { fileName } of filesToProcess) {
      const filePath = path.join(xmlDir, fileName);
      try {
        const { config } = await buildLepConfigFromFile(filePath);
        const result = await syncInstrumentWithConfig(config);

        if (result.status === "ok") {
          summary.instrumentsProcessed += 1;
          summary.totalClauses += result.parsedClauses;
          continue;
        }

        summary.failed.push(
          `${fileName}: ${
            result.status === "skipped"
              ? result.reason
              : result.error?.message ?? "Unknown ingestion failure"
          }`,
        );
      } catch (error) {
        console.error(`[lep-ingest] Failed to process ${fileName}`, error);
        summary.failed.push(`${fileName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[lep-ingest] Unhandled ingestion failure", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "LEP ingestion failed", details, failed: summary.failed }, { status: 500 });
  }
}
