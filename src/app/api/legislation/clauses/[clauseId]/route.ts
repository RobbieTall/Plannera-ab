import { NextResponse } from "next/server";

import { getClauseById, serializeClauseDetail } from "@/lib/legislation";

type RouteContext = {
  params: { clauseId: string };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const clause = await getClauseById(params.clauseId);

    if (!clause) {
      return NextResponse.json({ error: "Clause not found." }, { status: 404 });
    }

    return NextResponse.json({ clause: serializeClauseDetail(clause) });
  } catch (error) {
    console.error("Legislation clause lookup error", error);
    return NextResponse.json({ error: "Unable to load clause." }, { status: 500 });
  }
}
