import fs from "fs";
import { NextResponse } from "next/server";

import { buildLepConfigFromFileSync } from "@/lib/lep/lep-ingest-files";
import {
  findLocalNswLepBySlug,
  findLocalNswLepsByLga,
  listLocalNswLepPreparations,
} from "@/lib/lep/nsw-lep-registry";
import { resolveCanonicalNswLga } from "@/lib/lep/nsw-lga-normaliser";
import { parseInstrumentDocument } from "@/lib/legislation/parser";
import { parseNswLepXml } from "@/lib/lep/nsw-lep-parser";
import { syncInstrumentFromDocument } from "@/lib/legislation/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type IngestError = { lga: string; error: string };

const getAdminSecret = () => process.env.ADMIN_SECRET ?? process.env.INGEST_ADMIN_SECRET;

const getProvidedSecret = (request: Request, url: URL) => {
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return (
    bearerToken ??
    request.headers.get("admin-secret") ??
    request.headers.get("admin_secret") ??
    request.headers.get("x-admin-secret") ??
    request.headers.get("x-ingest-secret") ??
    url.searchParams.get("secret")
  );
};

const requireAdmin = (request: Request, url: URL) => {
  const adminSecret = getAdminSecret();
  const providedSecret = getProvidedSecret(request, url);
  return Boolean(adminSecret && providedSecret === adminSecret);
};

const getTargetLabel = (target: ReturnType<typeof listLocalNswLepPreparations>[number]) =>
  target.details.canonicalLga ?? target.details.lgaCode ?? target.details.lgaName ?? target.config.slug;

const getCurrentClauseCount = async (slug: string) => {
  const instrument = await prisma.instrument.findUnique({
    where: { slug },
    select: {
      _count: { select: { clauses: { where: { isCurrent: true } } } },
    },
  });

  return instrument?._count.clauses ?? 0;
};

const backfillProjectLepData = async (lga: string, xmlDocument: string) => {
  const parsed = parseNswLepXml(xmlDocument);
  const projects = await prisma.project.findMany({
    where: {
      zoningCode: { not: null },
      siteContext: {
        OR: [
          { lgaCode: { equals: lga, mode: "insensitive" } },
          { lgaName: { contains: lga, mode: "insensitive" } },
        ],
      },
    },
    select: { id: true },
  });

  let updated = 0;
  for (const project of projects) {
    await prisma.project.update({
      where: { id: project.id },
      data: { lepData: parsed },
    });
    updated += 1;
  }

  return updated;
};

const getIngestTargets = (url: URL) => {
  const lgaParam = url.searchParams.get("lga")?.trim();
  const instrumentParam = url.searchParams.get("instrument")?.trim();

  const normalizedLga = resolveCanonicalNswLga(lgaParam);
  const lgaMatches = normalizedLga ? findLocalNswLepsByLga(normalizedLga) : [];
  const instrumentMatch = instrumentParam ? findLocalNswLepBySlug(instrumentParam) : null;

  const targets = instrumentMatch ? [instrumentMatch] : normalizedLga ? lgaMatches : listLocalNswLepPreparations();

  return { targets, lgaParam, normalizedLga, instrumentParam };
};

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (!requireAdmin(request, url)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  const instruments = await prisma.instrument.findMany({
    where: { instrumentType: "LEP" },
    select: {
      slug: true,
      name: true,
      _count: { select: { clauses: { where: { isCurrent: true } } } },
    },
    orderBy: { name: "asc" },
  });

  const countsByLga: Record<string, number> = {};
  let lepClauseCount = 0;

  for (const instrument of instruments) {
    const registryMatch = findLocalNswLepBySlug(instrument.slug);
    const lgaCode = (
      registryMatch?.details.canonicalLga ??
      registryMatch?.details.lgaCode ??
      registryMatch?.details.lgaName ??
      instrument.name
    )
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const clauseCount = instrument._count.clauses;
    lepClauseCount += clauseCount;
    countsByLga[lgaCode] = (countsByLga[lgaCode] ?? 0) + clauseCount;
  }

  return NextResponse.json({
    lepClauseCount,
    lgasCovered: Object.keys(countsByLga).filter((lgaCode) => countsByLga[lgaCode] > 0).sort(),
    countsByLga,
  });
}

/**
 * Admin-only endpoint to ingest NSW LEP XML files under data/nsw/xml.
 *
 * Usage:
 *   POST /api/admin/ingest-lep
 *   Authorization: Bearer $ADMIN_SECRET
 *
 * Optional query params:
 *   ?lga=BYRON       Ingest one LGA for testing.
 *   ?instrument=...  Ingest one instrument slug.
 *   ?force=true      Re-ingest even when current clauses already exist.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);

  if (!requireAdmin(request, url)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  const force = url.searchParams.get("force") === "true";
  const { targets, lgaParam, normalizedLga, instrumentParam } = getIngestTargets(url);

  console.log("[INGEST-LEP] Start", {
    lga: normalizedLga,
    instrument: instrumentParam,
    matches: targets.length,
    force,
  });

  if (!targets.length) {
    return NextResponse.json(
      {
        ingested: [],
        skipped: [],
        errors: [{ lga: lgaParam ?? instrumentParam ?? "all", error: "No LEP XML found for request" }],
      },
      { status: 404 },
    );
  }

  const ingested: string[] = [];
  const skipped: string[] = [];
  const errors: IngestError[] = [];
  let totalClauses = 0;

  for (const target of targets) {
    const lga = getTargetLabel(target);
    const xmlPath = target.config.xmlLocalPath;

    try {
      const existingClauseCount = await getCurrentClauseCount(target.config.slug);
      if (existingClauseCount > 0 && !force) {
        skipped.push(target.config.slug);
        totalClauses += existingClauseCount;
        continue;
      }

      if (!xmlPath) {
        throw new Error(`No XML path configured for ${target.config.slug}`);
      }

      const xmlDocument = fs.readFileSync(xmlPath, "utf-8");
      const { config } = buildLepConfigFromFileSync(xmlPath, { xml: xmlDocument });
      const parsedClauses = parseInstrumentDocument(config, xmlDocument, "xml");

      if (!parsedClauses.length) {
        throw new Error(`No clauses parsed for ${config.slug}`);
      }

      const result = await syncInstrumentFromDocument(config, xmlDocument, {
        parsedClauses,
        format: "xml",
        forceReplace: force || existingClauseCount === 0,
      });

      if (result.status === "ok") {
        const clauseCount = await prisma.clause.count({
          where: { instrumentId: result.instrument.id, isCurrent: true },
        });
        totalClauses += clauseCount;
        const backfilledProjects = await backfillProjectLepData(lga, xmlDocument);
        ingested.push(config.slug);
        console.log("[INGEST-LEP] Sync complete", { lga, slug: config.slug, clauseCount, backfilledProjects });
        continue;
      }

      if (result.status === "error") {
        throw result.error ?? new Error(`Unknown ingestion failure for ${config.slug}`);
      }

      skipped.push(config.slug);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[INGEST-LEP] Target failed", { lga, slug: target.config.slug, error });
      errors.push({ lga, error: message });
    }
  }

  return NextResponse.json({ ingested, skipped, errors, totalClauses });
}
