import { NextResponse } from "next/server";
import { z } from "zod";

import { decideSiteFromCandidates, resolveAddressToSite } from "@/lib/site-context";

const searchSchema = z.object({ query: z.string().min(3) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = searchSchema.parse(body);
    const candidates = await resolveAddressToSite(query);
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
