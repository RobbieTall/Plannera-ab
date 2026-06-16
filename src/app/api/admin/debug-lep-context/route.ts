import { NextResponse } from "next/server";

import { isAuthorized } from "@/lib/admin-auth";
import { getLepContextForProject } from "@/lib/lep/lep-context";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (!isAuthorized(secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const lga = url.searchParams.get("lga");
  if (!lga) {
    return NextResponse.json({ error: "lga is required" }, { status: 400 });
  }

  const resolution = await getLepContextForProject({
    fallbackLga: lga,
    siteContext: null,
    instrumentSlug: null,
  });

  const payload = {
    rawLga: resolution.rawLga,
    normalisedLga: resolution.normalisedLga,
    instruments: resolution.instruments.map((instrument) => ({
      id: instrument.id,
      lga: instrument.lga,
      code: instrument.code,
      clauseCount: instrument.clauseCount ?? null,
    })),
    chosenInstrumentId: resolution.chosenInstrumentId,
    lepClauseCount: resolution.lepClauseCount,
    usedFallback: resolution.usedFallback,
    lepContext: resolution.lepContext,
  };

  return NextResponse.json(payload);
}
