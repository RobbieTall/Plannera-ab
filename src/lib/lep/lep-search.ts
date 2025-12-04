import { InstrumentType, Prisma } from "@prisma/client";

import { expandNswLgaAliases } from "./nsw-lga-normaliser";

import { prisma } from "@/lib/prisma";

export type LepSearchInstrument = {
  id: string;
  lga: string;
  name: string;
  code: string;
  clauseCount?: number;
  clauses?: { id: string; ref: string; title: string | null; text: string }[];
};

export type LepSearchResponse = { instruments: LepSearchInstrument[] };

export const buildLepInstrumentFilter = (
  lga: string,
  instrument?: string,
): Prisma.InstrumentWhereInput => {
  const lgaKeys = expandNswLgaAliases(lga);
  const normalizedKeys = lgaKeys.length ? lgaKeys : [lga];

  const baseOr: Prisma.InstrumentWhereInput[] = normalizedKeys.flatMap((key) => {
    const normalizedKey = key.toLowerCase();
    const titleKey = normalizedKey.replace(/\b\w/g, (char) => char.toUpperCase());
    return [
      { slug: { contains: normalizedKey } },
      { name: { contains: titleKey } },
      { shortName: { contains: titleKey } },
    ];
  });

  const baseFilter: Prisma.InstrumentWhereInput = {
    instrumentType: InstrumentType.LEP,
    OR: baseOr,
  };

  if (!instrument) {
    return baseFilter;
  }

  const normalizedInstrument = instrument.toLowerCase();
  const titleCaseInstrument = normalizedInstrument.replace(/\b\w/g, (char) => char.toUpperCase());

  const instrumentFilter: Prisma.InstrumentWhereInput = {
    OR: [
      { slug: { equals: normalizedInstrument } },
      { slug: { contains: normalizedInstrument } },
      { name: { contains: titleCaseInstrument } },
      { shortName: { contains: titleCaseInstrument } },
    ],
  };

  return { AND: [baseFilter, instrumentFilter] };
};

export const lookupLepInstruments = async (params: {
  lga: string;
  instrument?: string | null;
  clauseRef?: string | null;
}): Promise<LepSearchResponse> => {
  if (!process.env.DATABASE_URL) {
    console.warn("[lep-search] DATABASE_URL is not configured; returning empty LEP results");
    return { instruments: [] } satisfies LepSearchResponse;
  }

  const instrumentWhere = buildLepInstrumentFilter(params.lga, params.instrument ?? undefined);

  const clauseWhere: Prisma.ClauseWhereInput = {
    isCurrent: true,
    ...(params.clauseRef ? { clauseKey: { equals: params.clauseRef } satisfies Prisma.StringFilter } : {}),
  };

  const instrumentsWithClauses = params.instrument
    ? await prisma.instrument.findMany({
        where: instrumentWhere,
        include: {
          clauses: {
            where: clauseWhere,
            orderBy: { clauseKey: "asc" },
            select: {
              id: true,
              clauseKey: true,
              title: true,
              bodyText: true,
            },
          },
        },
        orderBy: { name: "asc" },
      })
    : null;

  const instrumentsSummary = params.instrument
    ? null
    : await prisma.instrument.findMany({
        where: instrumentWhere,
        select: {
          id: true,
          slug: true,
          name: true,
          _count: { select: { clauses: true } },
        },
        orderBy: { name: "asc" },
      });

  const instruments = instrumentsWithClauses ?? instrumentsSummary ?? [];

  return {
    instruments: instruments.map((instrumentRecord) => ({
      id: instrumentRecord.id,
      lga: params.lga,
      name: instrumentRecord.name,
      code: instrumentRecord.slug,
      clauses: "clauses" in instrumentRecord
        ? instrumentRecord.clauses.map((clause) => ({
            id: clause.id,
            ref: clause.clauseKey,
            title: clause.title,
            text: clause.bodyText,
          }))
        : undefined,
      clauseCount:
        "_count" in instrumentRecord
          ? instrumentRecord._count.clauses
          : instrumentRecord.clauses?.length,
    })),
  } satisfies LepSearchResponse;
};
