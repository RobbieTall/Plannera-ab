import { NextResponse } from "next/server";

import { getLgaMapInfo, NSW_SPATIAL_VIEWER_URL } from "@/lib/lga-map-registry";
import { resolveMapUrl } from "@/lib/maps/map-url-resolver";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const lgaName: string | null = body?.lgaName ?? null;

  if (!lgaName) {
    return NextResponse.json({ error: "Missing LGA name" }, { status: 400 });
  }

  const lgaMapInfo = getLgaMapInfo(lgaName);

  const resolution = await resolveMapUrl({
    primaryUrl: lgaMapInfo?.primaryMapUrl,
    fallbackUrls: lgaMapInfo?.fallbackMapUrls ?? [],
    nswSpatialViewerUrl: NSW_SPATIAL_VIEWER_URL,
  });

  return NextResponse.json({
    resolvedUrl: resolution.resolvedUrl,
    attemptedUrls: resolution.attemptedUrls,
    fallbackUsed: resolution.fallbackUsed,
    source: resolution.source,
    lgaName: lgaMapInfo?.lgaName ?? lgaName,
    hasCouncilMap: Boolean(lgaMapInfo?.primaryMapUrl || (lgaMapInfo?.fallbackMapUrls?.length ?? 0) > 0),
  });
}
