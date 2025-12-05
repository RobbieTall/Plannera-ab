import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  lgaCode: z.string().trim().min(1),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parseResult = querySchema.safeParse({ lgaCode: searchParams.get("lgaCode") ?? "" });

  if (!parseResult.success) {
    return NextResponse.json({ error: "invalid_lga_code", url: null }, { status: 400 });
  }

  const lgaCode = parseResult.data.lgaCode.toUpperCase();

  try {
    const link = await prisma.developmentControlPlanLink.findUnique({
      where: { lgaCode },
      select: { lgaCode: true, name: true, url: true },
    });

    if (!link) {
      return NextResponse.json({ lgaCode, name: null, url: null });
    }

    return NextResponse.json(link);
  } catch (error) {
    console.error("[dcp-link] Failed to fetch DCP link", { lgaCode, error });
    return NextResponse.json({ lgaCode, name: null, url: null });
  }
}
