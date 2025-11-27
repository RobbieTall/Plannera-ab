import { NextResponse } from "next/server";
import { z } from "zod";

import { searchNswSite } from "@/lib/site/nsw-search";

const searchSchema = z.object({ query: z.string().min(3) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = searchSchema.parse(body);
    const result = await searchNswSite(query, { source: "site-search" });
    if (result.status !== "ok") {
      const status = result.status === "property_search_not_configured" ? 503 : 502;
      const message =
        result.message ??
        (result.status === "property_search_not_configured"
          ? "NSW property search is not configured in this environment."
          : "NSW property search failed. Please try again.");
      return NextResponse.json({ error: result.status, message }, { status });
    }
    return NextResponse.json({
      candidates: result.candidates,
      decision: result.decision,
      addressInput: query,
    });
  } catch (error) {
    console.error("[site-context-search]", error);
    return NextResponse.json(
      { error: "site_search_error", message: "Address search failed. Please refine and try again." },
      { status: 400 },
    );
  }
}
