import { NextResponse } from "next/server";
import { InstrumentType } from "@prisma/client";
import { z } from "zod";

import { searchClauses, serializeClauseSummary } from "@/lib/legislation";

const requestSchema = z.object({
  query: z.string().min(1).optional(),
  instrumentSlugs: z.array(z.string().min(1)).optional(),
  instrumentTypes: z.array(z.nativeEnum(InstrumentType)).optional(),
  isCurrent: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const clauses = await searchClauses(payload);
    return NextResponse.json({ clauses: clauses.map(serializeClauseSummary) });
  } catch (error) {
    console.error("Legislation search error", error);
    return NextResponse.json(
      { error: "Unable to search legislation clauses." },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
