import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureProjectExists, ensureProjectInputSchema } from "@/lib/project-service";

const requestSchema = ensureProjectInputSchema.extend({
  description: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = requestSchema.parse(body);
    const project = await ensureProjectExists(payload);

    return NextResponse.json({ ok: true, project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "invalid_request", message: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    console.error("[project-ensure-error]", error);
    return NextResponse.json(
      { ok: false, error: "project_ensure_failed", message: "Unable to ensure project exists" },
      { status: 500 },
    );
  }
}
