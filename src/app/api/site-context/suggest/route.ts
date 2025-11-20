import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveSiteFromText } from "@/lib/site-resolver";

const suggestSchema = z.object({ query: z.string().min(2) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = suggestSchema.parse(body);
    const result = await resolveSiteFromText(query, { source: "site-suggest", limit: 10 });

    if (result.status !== "ok") {
      const status = result.status === "property_search_not_configured" ? 503 : 502;
      return NextResponse.json({ error: result.status, message: result.message }, { status });
    }

    const candidates = result.candidates.slice(0, 10).map((candidate) => ({
      ...candidate,
      score: candidate.confidence ?? null,
    }));

    return NextResponse.json({ status: "ok", candidates });
  } catch (error) {
    console.error("[site-context-suggest]", error);
    return NextResponse.json({ error: "site_suggest_error", message: "Unable to suggest NSW addresses." }, { status: 400 });
  }
}
