import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { InstrumentType, WorkspaceSourceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { indexWorkspaceChunks } from "@/lib/source-indexing";

import { parseCouncilDcpHtml } from "./html-chunker";

type ClauseInput = {
  clauseKey: string;
  title: string | null;
  bodyHtml: string;
  bodyText: string;
  hierarchyPath: string[];
  contentHash: string;
};

const DCP_SOURCE_PATH = "/dcp/byron-shire-dcp-2014.html";
const DCP_SLUG = "byron-dcp-2014";
const DCP_NAME = "Byron Shire Development Control Plan 2014";
const DCP_SHORT_NAME = "Byron DCP 2014";
const DCP_LGA = "BYRON";

const hashContent = (content: string) => createHash("sha256").update(content).digest("hex");

const buildClauseKey = (headingPath: string[], index: number) => {
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
  const html = await readFile(htmlPath, "utf-8");
  return html;
};

const buildClauses = (html: string): ClauseInput[] => {
  const parsed = parseCouncilDcpHtml(html, DCP_NAME);
  const sections = parsed.sections ?? [];

  if (!sections.length) {
    return parsed.chunks.map((chunk, index) => {
      const paragraphs = chunk.content.split(/\n\n+/).filter(Boolean);
      const bodyText = paragraphs.join("\n\n");
      return {
        clauseKey: `clause-${index + 1}`,
        title: chunk.heading || null,
        bodyText,
        bodyHtml: paragraphs.map((para) => `<p>${para}</p>`).join(""),
        hierarchyPath: [chunk.heading || DCP_NAME],
        contentHash: hashContent(bodyText),
      };
    });
  }

  return sections.map((section, index) => {
    const bodyText = section.paragraphs.join("\n\n");
    const title = section.headingPath.at(-1) ?? null;

    return {
      clauseKey: buildClauseKey(section.headingPath, index),
      title,
      bodyText,
      bodyHtml: section.paragraphs.map((para) => `<p>${para}</p>`).join(""),
      hierarchyPath: section.headingPath,
      contentHash: hashContent(bodyText),
    };
  });
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
        ...clause,
        instrumentId: instrument.id,
        effectiveFrom: null,
        effectiveTo: null,
        retrievedAt: new Date(),
      })),
    });

    await tx.workspaceSourceChunk.deleteMany({
      where: { lgaCode: DCP_LGA, sourceType: WorkspaceSourceType.council_dcp },
    });

    const chunkResult = await indexWorkspaceChunks({
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
    });

    const clauseCount = await tx.clause.count({ where: { instrumentId: instrument.id, isCurrent: true } });

    return {
      instrumentId: instrument.id,
      clauseCount,
      chunkCount: chunkResult.created,
    };
  });

  return { ...result, lga: DCP_LGA, slug: DCP_SLUG };
};

export const getByronDcpCoverage = async () => {
  const instrument = await prisma.instrument.findUnique({ where: { slug: DCP_SLUG } });

  if (!instrument) {
    return { lga: DCP_LGA, instrumentId: null, clauseCount: 0, chunkCount: 0 } as const;
  }

  const [clauseCount, chunkCount] = await Promise.all([
    prisma.clause.count({ where: { instrumentId: instrument.id, isCurrent: true } }),
    prisma.workspaceSourceChunk.count({ where: { lgaCode: DCP_LGA, sourceType: WorkspaceSourceType.council_dcp } }),
  ]);

  return { lga: DCP_LGA, instrumentId: instrument.id, clauseCount, chunkCount } as const;
};

export const BYRON_DCP_CONSTANTS = {
  slug: DCP_SLUG,
  lga: DCP_LGA,
  sourcePath: DCP_SOURCE_PATH,
  name: DCP_NAME,
  shortName: DCP_SHORT_NAME,
};
