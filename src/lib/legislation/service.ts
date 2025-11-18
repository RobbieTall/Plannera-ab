import { Prisma, type Instrument } from "@prisma/client";

import { prisma } from "../prisma";

import { INSTRUMENT_CONFIG, getInstrumentConfig } from "./config";
import { resolveSiteInstruments } from "./site-resolution";
import type {
  ApplicableClausesResult,
  ClauseDetail,
  ClauseSummary,
  InstrumentConfig as InstrumentConfigType,
  ParsedClause,
  SearchClausesParams,
  SiteResolutionResult,
} from "./types";

const DEFAULT_SEARCH_LIMIT = 25;
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

const computeRelevance = (bodyText: string, query?: string) => {
  if (!query) {
    return 0;
  }

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = bodyText.toLowerCase();
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
};

export const ingestInstrument = async (slug: string) => {
  const config = getInstrumentConfig(slug);
  if (!config) {
    throw new Error(`Unknown instrument slug: ${slug}`);
  }

  const [{ parseInstrumentDocument }, { fetchInstrumentXml }] = await Promise.all([
    loadParserModule(),
    loadFetcherModule(),
  ]);
  const fetchResult = await fetchInstrumentXml(config);
  const parsedClauses = dedupeParsedClauses(parseInstrumentDocument(config, fetchResult.document, fetchResult.format));

  const instrument = await upsertInstrument(config);

  await prisma.$transaction(async (tx) => {
    await tx.clause.deleteMany({ where: { instrumentId: instrument.id } });
    await Promise.all(
      parsedClauses.map((clause) =>
        tx.clause.create({
          data: {
            instrumentId: instrument.id,
            clauseKey: clause.clauseKey,
            title: clause.title,
            bodyHtml: clause.bodyHtml,
            bodyText: clause.bodyText,
            hierarchyPath: clause.hierarchyPath,
            version: 1,
            isCurrent: true,
            retrievedAt: fetchResult.fetchedAt,
            contentHash: clause.contentHash,
            searchIndex: { create: { bodyText: clause.bodyText } },
          },
        }),
      ),
    );
  });

  const updatedInstrument = await prisma.instrument.update({
    where: { id: instrument.id },
    data: { lastSyncedAt: fetchResult.fetchedAt },
  });

  return { instrument: updatedInstrument, clauseCount: parsedClauses.length };
};

const syncInstrumentInternal = async (config: InstrumentConfigType): Promise<SyncResult> => {
  const instrument = await upsertInstrument(config);
  const [{ parseInstrumentDocument }, { fetchInstrumentXml }] = await Promise.all([
    loadParserModule(),
    loadFetcherModule(),
  ]);
  const fetchResult = await fetchInstrumentXml(config);
  const parsedClauses = dedupeParsedClauses(parseInstrumentDocument(config, fetchResult.document, fetchResult.format));
  const now = fetchResult.fetchedAt;
  const currentClauses = await prisma.clause.findMany({
    where: { instrumentId: instrument.id, isCurrent: true },
  });

  let updated = 0;
  let added = 0;

  await prisma.$transaction(async (tx) => {
    for (const clause of parsedClauses) {
      const existing = currentClauses.find((record) => record.clauseKey === clause.clauseKey);
      if (!existing) {
        await tx.clause.create({
          data: {
            instrumentId: instrument.id,
            clauseKey: clause.clauseKey,
            title: clause.title,
            bodyHtml: clause.bodyHtml,
            bodyText: clause.bodyText,
            hierarchyPath: clause.hierarchyPath,
            version: 1,
            isCurrent: true,
            retrievedAt: now,
            contentHash: clause.contentHash,
            searchIndex: { create: { bodyText: clause.bodyText } },
          },
        });
        added += 1;
        continue;
      }

      if (existing.contentHash === clause.contentHash) {
        continue;
      }

      await tx.clause.update({
        where: { id: existing.id },
        data: { isCurrent: false, effectiveTo: now },
      });

      await tx.clause.create({
        data: {
          instrumentId: instrument.id,
          clauseKey: clause.clauseKey,
          title: clause.title,
          bodyHtml: clause.bodyHtml,
          bodyText: clause.bodyText,
          hierarchyPath: clause.hierarchyPath,
          version: existing.version + 1,
          isCurrent: true,
          retrievedAt: now,
          contentHash: clause.contentHash,
          searchIndex: { create: { bodyText: clause.bodyText } },
        },
      });
      updated += 1;
    }

    const parsedKeys = new Set(parsedClauses.map((clause) => clause.clauseKey));
    const removedClauses = currentClauses.filter((clause) => !parsedKeys.has(clause.clauseKey));
    await Promise.all(
      removedClauses.map((clause) =>
        tx.clause.update({
          where: { id: clause.id },
          data: { isCurrent: false, effectiveTo: now },
        }),
      ),
    );
  });

  const updatedInstrument = await prisma.instrument.update({
    where: { id: instrument.id },
    data: { lastSyncedAt: now },
  });

  return { status: "ok", config, instrument: updatedInstrument, added, updated, parsedClauses: parsedClauses.length };
};

export const syncInstrument = async (slug: string): Promise<SyncResult> => {
  const config = getInstrumentConfig(slug);
  if (!config) {
    throw new Error(`Unknown instrument slug: ${slug}`);
  }

  return syncInstrumentInternal(config);
};

export const syncAllInstruments = async (): Promise<SyncResult[]> => {
  const results: SyncResult[] = [];

  for (const config of INSTRUMENT_CONFIG) {
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

  const clauses = await prisma.clause.findMany({
    where: {
      ...(isCurrent !== undefined ? { isCurrent } : {}),
      ...(query ? { bodyText: { contains: query, mode: Prisma.QueryMode.insensitive } } : {}),
      ...(instrumentSlugs ? { instrument: { slug: { in: instrumentSlugs } } } : {}),
      ...(instrumentTypes ? { instrument: { instrumentType: { in: instrumentTypes } } } : {}),
    },
    include: { instrument: true },
    take: limit,
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
    score: computeRelevance(clause.bodyText, query),
  }));

  return summaries
    .sort((a, b) => b.score - a.score)
    .map((summary) => {
      const { score, ...rest } = summary;
      void score;
      return rest;
    });
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
