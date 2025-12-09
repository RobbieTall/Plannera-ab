import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { InstrumentType, Prisma, WorkspaceSourceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { indexWorkspaceChunks } from "@/lib/source-indexing";

import { parseDcpDocument } from "./parser";
import type { ParsedDcpClause } from "./parser";

type ClauseInput = ParsedDcpClause & {
  clauseKey: string;
  contentHash: string;
};

const DCP_SOURCE_PATH = "/dcp/byron-shire-dcp-2014.html";
const DCP_SLUG = "byron-dcp-2014";
const DCP_NAME = "Byron Shire Development Control Plan 2014";
const DCP_SHORT_NAME = "Byron DCP 2014";
const DCP_LGA = "BYRON";

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

const loadByronDcpHtml = async () => {
  const publicDir = join(process.cwd(), "public");
  const htmlPath = join(publicDir, DCP_SOURCE_PATH.replace(/^\//, ""));
  try {
    const html = await readFile(htmlPath, "utf-8");
    return html;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    throw new Error(`Failed to load Byron DCP source from ${DCP_SOURCE_PATH}: ${reason}`);
  }
};

const buildClauses = (html: string): ClauseInput[] => {
  const clauses = parseDcpDocument(html, { documentTitle: DCP_NAME });

  return clauses.map((clause, index) => {
    const clauseKey = buildClauseKey(clause.headingPath, index, clause.ref ?? clause.title ?? undefined);
    const contentHash = hashContent(`${clause.bodyText}-${clause.ref ?? ""}`);
    return {
      ...clause,
      clauseKey,
      contentHash,
    };
  });
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
        sourceUrl: DCP_SOURCE_PATH,
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
  const html = await loadByronDcpHtml();
  const clauses = buildClauses(html);

  if (!clauses.length) {
    throw new Error("No clauses could be parsed from Byron DCP");
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
        sourceUrl: DCP_SOURCE_PATH,
        lastSyncedAt: new Date(),
      },
      update: {
        name: DCP_NAME,
        shortName: DCP_SHORT_NAME,
        instrumentType: InstrumentType.DCP,
        jurisdiction: "NSW",
        sourceUrl: DCP_SOURCE_PATH,
        lastSyncedAt: new Date(),
      },
    });

    await tx.clause.deleteMany({ where: { instrumentId: instrument.id } });

    await tx.clause.createMany({
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

    await tx.dCPClause.createMany({
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

    // TODO: Re-enable workspace chunking for Byron DCP once batching issues are resolved.
    const chunkResult = DCP_LGA === "BYRON"
      ? { created: 0 as const }
      : await indexWorkspaceChunks({
          chunks: clauses.map((clause, index) => ({
            heading: clause.title ?? `Clause ${index + 1}`,
            content: clause.bodyText,
            metadata: {
              instrumentId: instrument.id,
              instrumentSlug: instrument.slug,
              clauseKey: clause.clauseKey,
              lgaCode: DCP_LGA,
              sourceUrl: DCP_SOURCE_PATH,
              sourceType: "DCP",
              ref: clause.ref,
              topicTags: clause.topicTags,
              numericMeta: clause.numericMeta,
            },
          })),
          lgaCode: DCP_LGA,
          sourceType: WorkspaceSourceType.council_dcp,
          metadata: {
            instrumentId: instrument.id,
            instrumentSlug: instrument.slug,
            sourceUrl: DCP_SOURCE_PATH,
            lgaCode: DCP_LGA,
          },
          prismaClient: tx,
        }).catch(async (error) => {
          console.warn("[byron-dcp] Falling back to non-embedded chunks", error);
          return fallbackIndexWorkspaceChunks(tx, clauses, instrument.id);
        });

    const clauseCount = await tx.clause.count({ where: { instrumentId: instrument.id, isCurrent: true } });
    const dcpClauseCount = await tx.dCPClause.count({ where: { lgaCode: DCP_LGA } });

    return {
      instrumentId: instrument.id,
      clauseCount,
      dcpClauseCount,
      chunkCount: chunkResult.created,
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
  sourcePath: DCP_SOURCE_PATH,
  name: DCP_NAME,
  shortName: DCP_SHORT_NAME,
};
