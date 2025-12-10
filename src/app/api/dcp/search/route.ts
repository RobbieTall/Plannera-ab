import { NextResponse } from "next/server";

import { searchDcpClauses } from "@/lib/dcp/search";

const DEFAULT_LGA = "BYRON";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = (url.searchParams.get("query") || url.searchParams.get("q") || "").trim();
    const lgaCode = (url.searchParams.get("lga") || DEFAULT_LGA).toUpperCase();

    if (!query) {
      return NextResponse.json({ ok: false, error: "query_required" }, { status: 400 });
    }

    const results = await searchDcpClauses({ query, lgaCode, limit: 10 });
    const serialized = results.map((clause) => ({
      ref: clause.ref,
      title: clause.title,
      headingPath: clause.headingPath,
      bodyHtml: clause.bodyHtml,
      bodyText: clause.bodyText,
      topicTags: clause.topicTags,
      numericMeta: clause.numericMeta,
      depth: clause.depth,
      parentRef: clause.parentRef,
      score: clause.score,
    }));

    return NextResponse.json({ ok: true, count: serialized.length, results: serialized });
  } catch (error) {
    console.error("[dcp-search]", error);
    return NextResponse.json({ ok: false, error: "search_failed" }, { status: 500 });
  }
}
