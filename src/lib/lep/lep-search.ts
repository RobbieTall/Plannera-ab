import { InstrumentType, Prisma } from "@prisma/client";

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
  const lgaFilter: Prisma.StringFilter = { contains: lga, mode: "insensitive" };

  const baseFilter: Prisma.InstrumentWhereInput = {
    instrumentType: InstrumentType.LEP,
    OR: [{ slug: lgaFilter }, { name: lgaFilter }, { shortName: lgaFilter }],
  };

  if (!instrument) {
    return baseFilter;
  }

  const instrumentFilter: Prisma.InstrumentWhereInput = {
    OR: [
      { slug: { equals: instrument, mode: "insensitive" } },
      { slug: { contains: instrument, mode: "insensitive" } },
      { name: { contains: instrument, mode: "insensitive" } },
      { shortName: { contains: instrument, mode: "insensitive" } },
    ],
  };

  return { AND: [baseFilter, instrumentFilter] };
};

export const lookupLepInstruments = async (params: {
  lga: string;
  instrument?: string | null;
  clauseRef?: string | null;
}): Promise<LepSearchResponse> => {
  const instrumentWhere = buildLepInstrumentFilter(params.lga, params.instrument ?? undefined);

  const clauseWhere: Prisma.ClauseWhereInput = {
    isCurrent: true,
    ...(params.clauseRef
      ? { clauseKey: { equals: params.clauseRef, mode: "insensitive" } satisfies Prisma.StringFilter }
      : {}),
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
      clauseCount: "_count" in instrumentRecord ? instrumentRecord._count.clauses : undefined,
    })),
  } satisfies LepSearchResponse;
};
