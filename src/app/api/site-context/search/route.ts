import { NextResponse } from "next/server";
import { z } from "zod";

import { decideSiteFromCandidates } from "@/lib/site-context";
import { resolveSiteFromText } from "@/lib/site-resolver";

const searchSchema = z.object({ query: z.string().min(3) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = searchSchema.parse(body);
    const result = await resolveSiteFromText(query, { source: "site-search" });
    if (result.status !== "ok") {
      const status = result.status === "property_search_not_configured" ? 503 : 502;
      return NextResponse.json({ error: result.status, message: result.error }, { status });
    }
    const { candidates } = result;
    return NextResponse.json({
      candidates,
      decision: decideSiteFromCandidates(candidates),
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
