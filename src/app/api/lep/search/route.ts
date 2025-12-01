import { NextResponse } from "next/server";
import { InstrumentType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const buildInstrumentFilter = (lga: string, instrument?: string): Prisma.InstrumentWhereInput => {
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lga = url.searchParams.get("lga")?.trim();
    const instrument = url.searchParams.get("instrument")?.trim();
    const clauseRef = url.searchParams.get("clauseRef")?.trim();

    if (!lga) {
      return NextResponse.json({ error: "Missing required parameter: lga" }, { status: 400 });
    }

    const instrumentWhere = buildInstrumentFilter(lga, instrument);

    const clauseWhere: Prisma.ClauseWhereInput = {
      isCurrent: true,
      ...(clauseRef
        ? { clauseKey: { equals: clauseRef, mode: "insensitive" } satisfies Prisma.StringFilter }
        : {}),
    };

    const instrumentsWithClauses = instrument
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

    const instrumentsSummary = instrument
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

    if (!instruments || !instruments.length) {
      return NextResponse.json({ error: "No LEP found for that query" }, { status: 404 });
    }

    const response = {
      instruments: instruments.map((instrumentRecord) => ({
        id: instrumentRecord.id,
        lga,
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
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[lep] search error", error);
    return NextResponse.json({ error: "Unable to lookup LEP data" }, { status: 500 });
  }
}
