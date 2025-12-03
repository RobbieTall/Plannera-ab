import fs from "fs/promises";
import { NextResponse } from "next/server";

import { buildLepConfigFromFile } from "@/lib/lep/lep-ingest-files";
import { findLocalNswLepBySlug, findLocalNswLepsByLga } from "@/lib/lep/nsw-lep-registry";
import { resolveCanonicalNswLga } from "@/lib/lep/nsw-lga-normaliser";
import { parseInstrumentDocument } from "@/lib/legislation/parser";
import { syncInstrumentFromDocument } from "@/lib/legislation/service";
import { prisma } from "@/lib/prisma";

/**
 * Admin-only endpoint to ingest NSW LEP XML files under data/nsw/xml.
 *
 * Usage (after setting INGEST_ADMIN_SECRET in the environment):
 *   POST https://<prod-domain>/api/admin/ingest-lep?secret=<value>&lga=<LGA>
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
  const instrumentParam = url.searchParams.get("instrument")?.trim();

  const normalizedLga = resolveCanonicalNswLga(lgaParam);
  const lgaMatches = normalizedLga ? findLocalNswLepsByLga(normalizedLga) : [];
  const instrumentMatch = instrumentParam ? findLocalNswLepBySlug(instrumentParam) : null;

  const ingestionTargets = instrumentMatch
    ? [instrumentMatch]
    : normalizedLga
      ? lgaMatches
      : [];

  console.log("[INGEST-LEP] Start", { lga: normalizedLga, instrument: instrumentParam, matches: ingestionTargets.length });

  if (!ingestionTargets.length) {
    return NextResponse.json({ error: "No LEP XML found for requested LGA", lga: lgaParam }, { status: 404 });
  }

  let instrumentsProcessed = 0;
  let totalClauses = 0;
  const failed: string[] = [];

  try {
    for (const target of ingestionTargets) {
      const xmlPath = target.config.xmlLocalPath ?? target.details.fileName;
      try {
        await fs.access(xmlPath);
      } catch (error) {
        const message = `XML not found at ${xmlPath}`;
        console.error("[INGEST-LEP] Missing XML", { xmlPath, error });
        failed.push(message);
        continue;
      }

      console.log("[INGEST-LEP] Config ready", { xmlPath, lgaCode: target.details.lgaCode, slug: target.config.slug });

      const xmlDocument = await fs.readFile(xmlPath, "utf-8");
      const { config } = await buildLepConfigFromFile(xmlPath, { xml: xmlDocument });
      const parsedClauses = parseInstrumentDocument(config, xmlDocument, "xml");

      console.log("[INGEST-LEP] Parsed clauses length", parsedClauses.length, {
        lga: target.details.lgaName,
        instrument: config.slug,
      });

      if (!parsedClauses.length) {
        failed.push(`No clauses parsed for ${config.slug}`);
        continue;
      }

      const result = await syncInstrumentFromDocument(config, xmlDocument, {
        parsedClauses,
        format: "xml",
        forceReplace: true,
      });

      if (result.status === "ok") {
        instrumentsProcessed += 1;
        const clauseCount = await prisma.clause.count({ where: { instrumentId: result.instrument.id, isCurrent: true } });
        totalClauses += clauseCount;
        console.log("[INGEST-LEP] Sync complete", {
          instrumentId: result.instrument.id,
          clauseCount,
          slug: config.slug,
        });
      } else {
        const message = result.error?.message ?? `Unknown ingestion failure for ${config.slug}`;
        failed.push(message);
      }
    }

    return NextResponse.json({ lga: normalizedLga ?? lgaParam, instrumentsProcessed, totalClauses, failed });
  } catch (error) {
    console.error("[INGEST-LEP] Error", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "LEP ingestion failed", details }, { status: 500 });
  }
}
