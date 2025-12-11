import { NextResponse } from "next/server";

import { buildQuickSiteCheckLep } from "@/lib/lep/quick-site-check";
import type { QuickSiteCheckLepResponse } from "@/types/quick-site-check-lep";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const projectId = typeof body.projectId === "string" ? body.projectId : null;

    if (!projectId) {
      return NextResponse.json(
        { ok: false, message: "Invalid project id" } satisfies QuickSiteCheckLepResponse,
        { status: 200 },
      );
    }

    const result = await buildQuickSiteCheckLep(projectId);
    return NextResponse.json(result satisfies QuickSiteCheckLepResponse);
  } catch (error) {
    console.error("[quick-site-check-lep] unexpected error", error);
    return NextResponse.json(
      { ok: false, message: "Unable to run LEP Quick Site Check" } satisfies QuickSiteCheckLepResponse,
      { status: 200 },
    );
  }
}
