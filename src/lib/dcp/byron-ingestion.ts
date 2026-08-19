import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { InstrumentType, Prisma, WorkspaceSourceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { parseDcpDocument } from "./parser";
import type { ParsedDcpClause } from "./parser";

type ClauseInput = ParsedDcpClause & {
  clauseKey: string;
  contentHash: string;
  sourcePath: string;
};

type ByronDcpSource = {
  path: string;
  chapter: string;
};

const DCP_SOURCES: ByronDcpSource[] = [
  { path: "/dcp/byron-dcp-2014-chapter-d1.html", chapter: "Chapter D1 Residential Development" },
  { path: "/dcp/byron-dcp-2014-chapter-b4.html", chapter: "Chapter B4 Traffic, Parking and Access" },
];
const DCP_SLUG = "byron-dcp-2014";
const DCP_NAME = "Byron Shire Development Control Plan 2014";
const DCP_SHORT_NAME = "Byron DCP 2014";
const DCP_LGA = "BYRON";
const PRIMARY_DCP_SOURCE_PATH = DCP_SOURCES[0]?.path ?? "";

const hashContent = (content: string) => createHash("sha256").update(content).digest("hex");

const buildClauseKey = (headingPath: string[], index: number, ref?: string | null) => {
  if (ref) return ref.toLowerCase().replace(/\s+/g, "-");
  const slug = headingPath
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

  return slug ? `${index + 1}-${slug}` : `clause-${index + 1}`;
};

const loadByronDcpSources = async () => {
  const publicDir = join(process.cwd(), "public");
  const sources = await Promise.all(
    DCP_SOURCES.map(async (source) => {
      const htmlPath = join(publicDir, source.path.replace(/^\//, ""));
      try {
        const html = await readFile(htmlPath, "utf-8");
        return { ...source, html };
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown";
        throw new Error(`Failed to load Byron DCP source from ${source.path}: ${reason}`);
      }
    }),
  );

  return sources;
};

const buildClauses = (htmlSources: Array<ByronDcpSource & { html: string }>): { clauses: ClauseInput[]; tableCount: number } => {
  const clauses: ClauseInput[] = [];
  let globalIndex = 0;
  let tableCount = 0;

  for (const source of htmlSources) {
    const parsed = parseDcpDocument(source.html, { documentTitle: `${DCP_NAME} - ${source.chapter}` });

    tableCount += parsed.tableCount;

    for (const clause of parsed.clauses) {
      const clauseKey = buildClauseKey(clause.headingPath, globalIndex, clause.ref ?? clause.title ?? undefined);
      const contentHash = hashContent(`${clause.bodyText}-${clause.ref ?? ""}`);
      clauses.push({
        ...clause,
        clauseKey,
        contentHash,
        sourcePath: source.path,
      });
      globalIndex += 1;
    }
  }

  return { clauses, tableCount };
};

const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();

const fallbackIndexWorkspaceChunks = async (
  tx: Prisma.TransactionClient,
  clauses: ClauseInput[],
  instrumentId: string,
) => {
  const normalizedChunks = clauses
    .map((clause, index) => ({
      heading: clause.title ?? `Clause ${index + 1}`,
      content: normalizeText(clause.bodyText),
      metadata: {
        instrumentId,
        instrumentSlug: DCP_SLUG,
        clauseKey: clause.clauseKey,
        lgaCode: DCP_LGA,
        sourceUrl: clause.sourcePath,
        sourceType: "DCP",
        ref: clause.ref,
        topicTags: clause.topicTags,
        numericMeta: clause.numericMeta,
      },
    }))
    .filter((chunk) => chunk.content.length > 0);

  if (!normalizedChunks.length) return { created: 0 } as const;

  await tx.workspaceSourceChunk.createMany({
    data: normalizedChunks.map((chunk) => ({
      heading: chunk.heading,
      content: chunk.content,
      lgaCode: DCP_LGA,
      sourceType: WorkspaceSourceType.council_dcp,
      metadata: chunk.metadata as Prisma.InputJsonValue,
    })),
  });

  return { created: normalizedChunks.length } as const;
};

export const ingestByronDcp = async () => {
  const sources = await loadByronDcpSources();
  const { clauses, tableCount } = buildClauses(sources);

  if (!clauses.length) {
    throw new Error("No clauses could be parsed from Byron DCP");
  }

  if (clauses.length <= 5) {
    throw new Error(`Unexpectedly low clause count parsed for Byron DCP: ${clauses.length}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const instrument = await tx.instrument.upsert({
      where: { slug: DCP_SLUG },
      create: {
        slug: DCP_SLUG,
        name: DCP_NAME,
        shortName: DCP_SHORT_NAME,
        instrumentType: InstrumentType.DCP,
        jurisdiction: "NSW",
        sourceUrl: PRIMARY_DCP_SOURCE_PATH,
        lastSyncedAt: new Date(),
      },
      update: {
        name: DCP_NAME,
        shortName: DCP_SHORT_NAME,
        instrumentType: InstrumentType.DCP,
        jurisdiction: "NSW",
        sourceUrl: PRIMARY_DCP_SOURCE_PATH,
        lastSyncedAt: new Date(),
      },
    });

    await tx.clause.deleteMany({ where: { instrumentId: instrument.id } });

    const clauseInsert = await tx.clause.createMany({
      data: clauses.map((clause) => ({
        clauseKey: clause.clauseKey,
        title: clause.title,
        bodyHtml: clause.bodyHtml,
        bodyText: clause.bodyText,
        hierarchyPath: clause.headingPath,
        contentHash: clause.contentHash,
        instrumentId: instrument.id,
        effectiveFrom: null,
        effectiveTo: null,
        retrievedAt: new Date(),
      })),
    });

    await tx.dCPClause.deleteMany({ where: { lgaCode: DCP_LGA } });

    const dcpInsert = await tx.dCPClause.createMany({
      data: clauses.map((clause) => ({
        lgaCode: DCP_LGA,
        instrumentSlug: DCP_SLUG,
        ref: clause.ref,
        title: clause.title,
        headingPath: clause.headingPath,
        parentRef: clause.parentRef,
        depth: clause.depth,
        bodyHtml: clause.bodyHtml,
        bodyText: clause.bodyText,
        topicTags: clause.topicTags,
        numericMeta: clause.numericMeta,
      })),
    });

    await tx.workspaceSourceChunk.deleteMany({
      where: { lgaCode: DCP_LGA, sourceType: WorkspaceSourceType.council_dcp },
    });

    // Byron uses deterministic non-embedded chunks until embedded batching is proven safe.
    // This preserves council-source provenance instead of silently reporting zero chunks.
    const chunkResult = await fallbackIndexWorkspaceChunks(tx, clauses, instrument.id);

    const clauseCount = await tx.clause.count({ where: { instrumentId: instrument.id, isCurrent: true } });
    const dcpClauseCount = await tx.dCPClause.count({ where: { lgaCode: DCP_LGA } });

    // Sanity check to ensure the parser output is fully persisted.
    if (clauseInsert.count !== clauses.length || dcpInsert.count !== clauses.length) {
      throw new Error(
        `Mismatch inserting Byron DCP clauses (parsed ${clauses.length}, clauses stored ${clauseInsert.count}, dcp stored ${dcpInsert.count})`,
      );
    }

    return {
      instrumentId: instrument.id,
      clauseCount,
      dcpClauseCount,
      chunkCount: chunkResult.created,
      tableCount,
    };
  });

  return { ...result, lga: DCP_LGA, slug: DCP_SLUG };
};

export const getByronDcpCoverage = async () => {
  const instrument = await prisma.instrument.findUnique({ where: { slug: DCP_SLUG } });

  if (!instrument) {
    return { lga: DCP_LGA, instrumentId: null, clauseCount: 0, dcpClauseCount: 0, chunkCount: 0 } as const;
  }

  const [clauseCount, chunkCount, dcpClauseCount] = await Promise.all([
    prisma.clause.count({ where: { instrumentId: instrument.id, isCurrent: true } }),
    prisma.workspaceSourceChunk.count({ where: { lgaCode: DCP_LGA, sourceType: WorkspaceSourceType.council_dcp } }),
    prisma.dCPClause.count({ where: { lgaCode: DCP_LGA } }),
  ]);

  return { lga: DCP_LGA, instrumentId: instrument.id, clauseCount, dcpClauseCount, chunkCount } as const;
};

export const BYRON_DCP_CONSTANTS = {
  slug: DCP_SLUG,
  lga: DCP_LGA,
  sourcePaths: DCP_SOURCES.map((source) => source.path),
  primarySourcePath: PRIMARY_DCP_SOURCE_PATH,
  name: DCP_NAME,
  shortName: DCP_SHORT_NAME,
};
