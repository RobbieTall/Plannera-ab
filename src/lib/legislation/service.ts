import { Prisma, type Instrument } from "@prisma/client";

import { prisma } from "../prisma";

import { ALL_INSTRUMENT_CONFIG, getInstrumentConfig } from "./config";
import { resolveSiteInstruments } from "./site-resolution";
import type {
  ApplicableClausesResult,
  ClauseDetail,
  ClauseSummary,
  InstrumentConfig as InstrumentConfigType,
  InstrumentFetchResult,
  ParsedClause,
  SearchClausesParams,
  SiteResolutionResult,
} from "./types";
import { refreshLepZoneTables } from "../lep/zone-table-extractor";

const DEFAULT_SEARCH_LIMIT = 25;
const MAX_SEARCH_CANDIDATES = 200;
const SEARCH_STOP_WORDS = new Set([
  "a",
  "about",
  "an",
  "and",
  "are",
  "as",
  "at",
  "by",
  "do",
  "does",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "where",
  "with",
]);
let parserModulePromise: Promise<typeof import("./parser")> | null = null;
let fetcherModulePromise: Promise<typeof import("./fetcher")> | null = null;

export type SyncSuccessResult = {
  status: "ok";
  instrument: Instrument;
  config: InstrumentConfigType;
  added: number;
  updated: number;
  parsedClauses: number;
};

export type SyncSkipResult = {
  status: "skipped";
  config: InstrumentConfigType;
  reason: string;
  instrument?: Instrument;
  added: number;
  updated: number;
  parsedClauses?: number;
};

export type SyncErrorResult = {
  status: "error";
  config: InstrumentConfigType;
  instrument?: Instrument;
  added: number;
  updated: number;
  parsedClauses?: number;
  error: Error;
};

export type SyncResult = SyncSuccessResult | SyncSkipResult | SyncErrorResult;

const loadParserModule = () => {
  if (!parserModulePromise) {
    parserModulePromise = import("./parser");
  }
  return parserModulePromise;
};

const loadFetcherModule = () => {
  if (!fetcherModulePromise) {
    fetcherModulePromise = import("./fetcher");
  }
  return fetcherModulePromise;
};

const skipInstrumentWithoutSource = (config: InstrumentConfigType): SyncSkipResult => {
  console.warn(`[legislation] Skipping ${config.slug}: no source file or URL configured`);
  return {
    status: "skipped",
    config,
    reason: "no source",
    added: 0,
    updated: 0,
    parsedClauses: 0,
  };
};

const buildSnippet = (bodyText: string, query?: string) => {
  if (!query) {
    return bodyText.slice(0, 280);
  }

  const index = bodyText.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) {
    return bodyText.slice(0, 280);
  }

  const start = Math.max(index - 80, 0);
  const end = Math.min(index + query.length + 120, bodyText.length);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < bodyText.length ? "…" : "";
  return `${prefix}${bodyText.slice(start, end)}${suffix}`;
};

const upsertInstrument = async (config: InstrumentConfigType): Promise<Instrument> => {
  const { slug, name, shortName, instrumentType, sourceUrl, jurisdiction = "NSW" } = config;
  return prisma.instrument.upsert({
    where: { slug },
    update: { name, shortName, instrumentType, sourceUrl, jurisdiction },
    create: { slug, name, shortName, instrumentType, sourceUrl, jurisdiction },
  });
};

const dedupeParsedClauses = (clauses: ParsedClause[]): ParsedClause[] => {
  const seen = new Map<string, ParsedClause>();
  const unique: ParsedClause[] = [];

  for (const clause of clauses) {
    const existing = seen.get(clause.clauseKey);
    if (!existing) {
      seen.set(clause.clauseKey, clause);
      unique.push(clause);
      continue;
    }

    if (existing.contentHash !== clause.contentHash) {
      console.warn(
        `[legislation] Duplicate clause key with differing content detected: ${clause.clauseKey}; keeping first instance`,
      );
    }
  }

  return unique;
};

const computeRelevance = (bodyText: string, query?: string, title?: string | null, clauseKey?: string) => {
  if (!query) {
    return 0;
  }

  const tokens = tokenizeSearchQuery(query);
  const bodyHaystack = bodyText.toLowerCase();
  const headingHaystack = `${title ?? ""} ${clauseKey ?? ""}`.toLowerCase();
  return tokens.reduce(
    (score, token) =>
      score +
      (bodyHaystack.includes(token) ? 1 : 0) +
      (headingHaystack.includes(token) ? 2 : 0),
    0,
  );
};

const tokenizeSearchQuery = (query?: string) =>
  (query ?? "")
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 1 && !SEARCH_STOP_WORDS.has(token))
    .slice(0, 8) ?? [];

const buildSearchWhere = (
  query: string | undefined,
): Prisma.ClauseWhereInput | undefined => {
  const tokens = tokenizeSearchQuery(query);
  if (!tokens.length) {
    return undefined;
  }

  return {
    OR: tokens.flatMap((token) => [
      { bodyText: { contains: token, mode: Prisma.QueryMode.insensitive } },
      { title: { contains: token, mode: Prisma.QueryMode.insensitive } },
      { clauseKey: { contains: token, mode: Prisma.QueryMode.insensitive } },
    ]),
  };
};

const CLAUSE_WRITE_BATCH_SIZE = 25;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const createClause = (
  tx: Prisma.TransactionClient,
  instrumentId: string,
  clause: ParsedClause,
  retrievedAt: Date,
  version: number,
) =>
  tx.clause.create({
    data: {
      instrumentId,
      clauseKey: clause.clauseKey,
      title: clause.title,
      bodyHtml: clause.bodyHtml,
      bodyText: clause.bodyText,
      hierarchyPath: clause.hierarchyPath,
      version,
      isCurrent: true,
      retrievedAt,
      contentHash: clause.contentHash,
      searchIndex: { create: { bodyText: clause.bodyText } },
    },
  });

const ingestParsedClauses = async (
  config: InstrumentConfigType,
  parsedClauses: ParsedClause[],
  retrievedAt: Date,
  options?: { forceReplace?: boolean },
): Promise<SyncSuccessResult> => {
  const instrument = await upsertInstrument(config);
  const uniqueClauses = dedupeParsedClauses(parsedClauses);

  let updated = 0;
  let added = 0;

  if (options?.forceReplace) {
    await prisma.clause.deleteMany({ where: { instrumentId: instrument.id } });

    for (const clauseBatch of chunk(uniqueClauses, CLAUSE_WRITE_BATCH_SIZE)) {
      await prisma.$transaction(
        clauseBatch.map((clause) =>
          prisma.clause.create({
            data: {
              instrumentId: instrument.id,
              clauseKey: clause.clauseKey,
              title: clause.title,
              bodyHtml: clause.bodyHtml,
              bodyText: clause.bodyText,
              hierarchyPath: clause.hierarchyPath,
              version: 1,
              isCurrent: true,
              retrievedAt,
              contentHash: clause.contentHash,
              searchIndex: { create: { bodyText: clause.bodyText } },
            },
          }),
        ),
      );
      added += clauseBatch.length;
    }

    const updatedInstrument = await prisma.instrument.update({
      where: { id: instrument.id },
      data: { lastSyncedAt: retrievedAt },
    });

    if (config.instrumentType === "LEP") {
      await refreshLepZoneTables(prisma, updatedInstrument.id, uniqueClauses);
    }

    return { status: "ok", config, instrument: updatedInstrument, added, updated, parsedClauses: uniqueClauses.length };
  }

  const currentClauses = await prisma.clause.findMany({
    where: { instrumentId: instrument.id, isCurrent: true },
  });
  const currentByKey = new Map(currentClauses.map((clause) => [clause.clauseKey, clause]));

  const writes = uniqueClauses.flatMap((clause) => {
    const existing = currentByKey.get(clause.clauseKey);
    if (!existing) {
      added += 1;
      return [{ kind: "create" as const, clause, version: 1 }];
    }

    if (existing.contentHash === clause.contentHash) {
      return [];
    }

    updated += 1;
    return [
      { kind: "retire" as const, id: existing.id },
      { kind: "create" as const, clause, version: existing.version + 1 },
    ];
  });

  const parsedKeys = new Set(uniqueClauses.map((clause) => clause.clauseKey));
  for (const clause of currentClauses) {
    if (!parsedKeys.has(clause.clauseKey)) {
      writes.push({ kind: "retire" as const, id: clause.id });
    }
  }

  for (const writeBatch of chunk(writes, CLAUSE_WRITE_BATCH_SIZE)) {
    await prisma.$transaction(async (tx) => {
      for (const write of writeBatch) {
        if (write.kind === "retire") {
          await tx.clause.update({
            where: { id: write.id },
            data: { isCurrent: false, effectiveTo: retrievedAt },
          });
          continue;
        }

        await createClause(tx, instrument.id, write.clause, retrievedAt, write.version);
      }
    });
  }

  const updatedInstrument = await prisma.instrument.update({
    where: { id: instrument.id },
    data: { lastSyncedAt: retrievedAt },
  });

  if (config.instrumentType === "LEP") {
    await refreshLepZoneTables(prisma, updatedInstrument.id, uniqueClauses);
  }

  return { status: "ok", config, instrument: updatedInstrument, added, updated, parsedClauses: uniqueClauses.length };
};

export const ingestInstrument = async (slug: string) => {
  const config = getInstrumentConfig(slug);
  if (!config) {
    throw new Error(`Unknown instrument slug: ${slug}`);
  }

  if (!config.xmlLocalPath && !config.xmlUrl) {
    skipInstrumentWithoutSource(config);
    return { status: "skipped" as const, reason: "no source", clauseCount: 0 };
  }

  const [{ parseInstrumentDocument }, { fetchInstrumentXml }] = await Promise.all([
    loadParserModule(),
    loadFetcherModule(),
  ]);
  const fetchResult = await fetchInstrumentXml(config);
  const parsedClauses = parseInstrumentDocument(config, fetchResult.document, fetchResult.format);

  const result = await ingestParsedClauses(config, parsedClauses, fetchResult.fetchedAt);

  return { instrument: result.instrument, clauseCount: result.parsedClauses };
};

const syncInstrumentInternal = async (config: InstrumentConfigType): Promise<SyncResult> => {
  if (!config.xmlLocalPath && !config.xmlUrl) {
    return skipInstrumentWithoutSource(config);
  }

  const [{ parseInstrumentDocument }, { fetchInstrumentXml }] = await Promise.all([
    loadParserModule(),
    loadFetcherModule(),
  ]);
  const fetchResult = await fetchInstrumentXml(config);
  const parsedClauses = parseInstrumentDocument(config, fetchResult.document, fetchResult.format);

  return ingestParsedClauses(config, parsedClauses, fetchResult.fetchedAt);
};

export const syncInstrument = async (slug: string): Promise<SyncResult> => {
  const config = getInstrumentConfig(slug);
  if (!config) {
    throw new Error(`Unknown instrument slug: ${slug}`);
  }

  return syncInstrumentInternal(config);
};

export const syncInstrumentWithConfig = async (
  config: InstrumentConfigType,
): Promise<SyncResult> => syncInstrumentInternal(config);

export const syncInstrumentFromDocument = async (
  config: InstrumentConfigType,
  document: string,
  options?: {
    format?: InstrumentFetchResult["format"];
    parsedClauses?: ParsedClause[];
    fetchedAt?: Date;
    forceReplace?: boolean;
  },
): Promise<SyncResult> => {
  const [{ parseInstrumentDocument }] = await Promise.all([loadParserModule()]);
  const parsedClauses = options?.parsedClauses ?? parseInstrumentDocument(config, document, options?.format);
  const fetchedAt = options?.fetchedAt ?? new Date();

  return ingestParsedClauses(config, parsedClauses, fetchedAt, { forceReplace: options?.forceReplace });
};

export const syncAllInstruments = async (options?: {
  configs?: InstrumentConfigType[];
  slugs?: string[];
  limit?: number;
}): Promise<SyncResult[]> => {
  const results: SyncResult[] = [];
  const slugFilter = options?.slugs?.length ? new Set(options.slugs) : null;
  const configs = (options?.configs ?? ALL_INSTRUMENT_CONFIG)
    .filter((config) => !slugFilter || slugFilter.has(config.slug))
    .slice(0, options?.limit ?? undefined);

  for (const config of configs) {
    try {
      const result = await syncInstrumentInternal(config);
      results.push(result);
    } catch (error) {
      console.error(`[legislation] Failed to sync ${config.slug}:`, error);
      results.push({
        status: "error",
        config,
        instrument: undefined,
        added: 0,
        updated: 0,
        parsedClauses: 0,
        error: error as Error,
      });
    }
  }
  return results;
};

export const searchClauses = async (params: SearchClausesParams): Promise<ClauseSummary[]> => {
  const { query, instrumentSlugs, instrumentTypes, isCurrent = true, limit = DEFAULT_SEARCH_LIMIT } = params;
  const searchWhere = buildSearchWhere(query);

  const clauses = await prisma.clause.findMany({
    where: {
      ...(isCurrent !== undefined ? { isCurrent } : {}),
      ...(searchWhere ? searchWhere : {}),
      ...(
        instrumentSlugs || instrumentTypes
          ? {
              instrument: {
                ...(instrumentSlugs ? { slug: { in: instrumentSlugs } } : {}),
                ...(instrumentTypes ? { instrumentType: { in: instrumentTypes } } : {}),
              },
            }
          : {}
      ),
    },
    include: { instrument: true },
    take: query ? Math.max(Math.min(limit * 8, MAX_SEARCH_CANDIDATES), limit) : limit,
  });

  const summaries = clauses.map((clause) => ({
    instrumentId: clause.instrumentId,
    instrumentName: clause.instrument.name,
    instrumentType: clause.instrument.instrumentType,
    clauseId: clause.id,
    clauseKey: clause.clauseKey,
    title: clause.title,
    snippet: buildSnippet(clause.bodyText, query),
    isCurrent: clause.isCurrent,
    currentAsAt: clause.retrievedAt ?? clause.updatedAt,
    score: computeRelevance(clause.bodyText, query, clause.title, clause.clauseKey),
  }));

  return summaries
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((summary) => {
      const { score, ...rest } = summary;
      void score;
      return rest;
    });
};

export const getLegislationHealth = async () => {
  const [instrumentCount, clauseCount, clausesByInstrument, instruments] = await Promise.all([
    prisma.instrument.count(),
    prisma.clause.count({ where: { isCurrent: true } }),
    prisma.clause.groupBy({
      by: ["instrumentId"],
      where: { isCurrent: true },
      _count: { _all: true },
    }),
    prisma.instrument.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        shortName: true,
        instrumentType: true,
        jurisdiction: true,
        lastSyncedAt: true,
        updatedAt: true,
      },
      orderBy: [{ instrumentType: "asc" }, { slug: "asc" }],
    }),
  ]);

  const clauseCountsByInstrumentId = new Map(
    clausesByInstrument.map((row) => [row.instrumentId, row._count._all]),
  );

  return {
    instrumentCount,
    clauseCount,
    instruments: instruments.map((instrument) => ({
      id: instrument.id,
      slug: instrument.slug,
      name: instrument.name,
      shortName: instrument.shortName,
      instrumentType: instrument.instrumentType,
      jurisdiction: instrument.jurisdiction,
      currentClauseCount: clauseCountsByInstrumentId.get(instrument.id) ?? 0,
      lastSyncedAt: instrument.lastSyncedAt,
      updatedAt: instrument.updatedAt,
    })),
  };
};

export const getClauseById = async (clauseId: string): Promise<ClauseDetail | null> => {
  const clause = await prisma.clause.findUnique({
    where: { id: clauseId },
    include: { instrument: true },
  });

  if (!clause) {
    return null;
  }

  return {
    instrumentId: clause.instrumentId,
    instrumentName: clause.instrument.name,
    instrumentType: clause.instrument.instrumentType,
    clauseId: clause.id,
    clauseKey: clause.clauseKey,
    title: clause.title,
    snippet: clause.bodyText.slice(0, 280),
    isCurrent: clause.isCurrent,
    currentAsAt: clause.retrievedAt ?? clause.updatedAt,
    hierarchyPath: clause.hierarchyPath,
    bodyHtml: clause.bodyHtml,
    bodyText: clause.bodyText,
    version: clause.version,
    effectiveFrom: clause.effectiveFrom,
    effectiveTo: clause.effectiveTo,
    retrievedAt: clause.retrievedAt,
  };
};

export const getClauseByKey = async (clauseKey: string, version?: number): Promise<ClauseDetail | null> => {
  const clause = await prisma.clause.findFirst({
    where: {
      clauseKey,
      ...(version ? { version } : { isCurrent: true }),
    },
    include: { instrument: true },
    orderBy: version ? undefined : { version: "desc" },
  });

  if (!clause) {
    return null;
  }

  return {
    instrumentId: clause.instrumentId,
    instrumentName: clause.instrument.name,
    instrumentType: clause.instrument.instrumentType,
    clauseId: clause.id,
    clauseKey: clause.clauseKey,
    title: clause.title,
    snippet: clause.bodyText.slice(0, 280),
    isCurrent: clause.isCurrent,
    currentAsAt: clause.retrievedAt ?? clause.updatedAt,
    hierarchyPath: clause.hierarchyPath,
    bodyHtml: clause.bodyHtml,
    bodyText: clause.bodyText,
    version: clause.version,
    effectiveFrom: clause.effectiveFrom,
    effectiveTo: clause.effectiveTo,
    retrievedAt: clause.retrievedAt,
  };
};

export const getApplicableClausesForSite = async (
  input: Pick<SiteResolutionResult, "address" | "parcelId"> & { topic?: string },
): Promise<ApplicableClausesResult> => {
  const resolution = await resolveSiteInstruments(input);

  const siteInstruments = await prisma.instrument.findMany({
    where: { slug: { in: resolution.instrumentSlugs } },
  });

  const clauses = await searchClauses({
    query: input.topic,
    instrumentSlugs: resolution.instrumentSlugs,
    isCurrent: true,
  });

  return {
    siteInstruments,
    clauses,
  };
};
