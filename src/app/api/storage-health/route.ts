import { NextResponse } from "next/server";

import { getStorageHealth } from "@/lib/storage";

export async function GET() {
  try {
    const health = await getStorageHealth();
    return NextResponse.json(health, { status: health.ok ? 200 : 503 });
  } catch (error) {
    console.error("[storage-health]", error);
    return NextResponse.json({ ok: false, mode: "local", error: "unknown_error" }, { status: 500 });
  }
}
