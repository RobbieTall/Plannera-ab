import { NextResponse } from "next/server";
import { z } from "zod";

import { getApplicableClausesForSite, serializeApplicableClausesResult } from "@/lib/legislation";

const requestSchema = z.object({
  address: z.string().min(1),
  parcelId: z.string().optional(),
  topic: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const result = await getApplicableClausesForSite(payload);
    return NextResponse.json({ result: serializeApplicableClausesResult(result) });
  } catch (error) {
    console.error("Applicable legislation lookup error", error);
    return NextResponse.json(
      { error: "Unable to resolve applicable legislation for the site." },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
