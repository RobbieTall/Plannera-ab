import { NextResponse } from "next/server";

import { getClauseByKey, serializeClauseDetail } from "@/lib/legislation";

type RouteContext = {
  params: { clauseKey: string };
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { searchParams } = new URL(request.url);
    const versionParam = searchParams.get("version");
    const version = versionParam ? Number.parseInt(versionParam, 10) : undefined;

    if (versionParam && Number.isNaN(version)) {
      return NextResponse.json({ error: "Version must be a number." }, { status: 400 });
    }

    const clause = await getClauseByKey(decodeURIComponent(params.clauseKey), version);

    if (!clause) {
      return NextResponse.json({ error: "Clause not found." }, { status: 404 });
    }

    return NextResponse.json({ clause: serializeClauseDetail(clause) });
  } catch (error) {
    console.error("Legislation clause key lookup error", error);
    return NextResponse.json({ error: "Unable to load clause." }, { status: 500 });
  }
}
