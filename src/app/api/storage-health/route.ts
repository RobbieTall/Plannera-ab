import { NextResponse } from "next/server";

import { getStorageHealth } from "@/lib/storage";

export async function GET() {
  const health = await getStorageHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 500 });
}
