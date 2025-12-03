import { NextResponse } from "next/server";
import { lookupLepInstruments } from "@/lib/lep/lep-search";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lga = url.searchParams.get("lga")?.trim();
    const instrument = url.searchParams.get("instrument")?.trim();
    const clauseRef = url.searchParams.get("clauseRef")?.trim();

    if (!lga) {
      return NextResponse.json({ error: "Missing required parameter: lga" }, { status: 400 });
    }

    const instruments = await lookupLepInstruments({ lga, instrument, clauseRef });

    if (!instruments?.instruments?.length) {
      return NextResponse.json({ error: "No LEP found for that query" }, { status: 404 });
    }

    const response = instruments;

    return NextResponse.json(response);
  } catch (error) {
    console.error("[lep] search error", error);
    return NextResponse.json({ error: "Unable to lookup LEP data" }, { status: 500 });
  }
}
