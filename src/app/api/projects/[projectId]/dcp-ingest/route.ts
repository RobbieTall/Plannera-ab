import { NextResponse } from "next/server";

import { ingestDcpPdfForProject } from "@/lib/dcp/ingest-service";
import { prisma } from "@/lib/prisma";
import { findProjectByExternalId, normalizeProjectId } from "@/lib/project-identifiers";

const normalizeSourceId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  try {
    const normalizedProjectId = normalizeProjectId(params.projectId);
    if (!normalizedProjectId) {
      return NextResponse.json({ ok: false, error: "project_id_missing" }, { status: 400 });
    }

    const project = await findProjectByExternalId(prisma, normalizedProjectId);
    if (!project) {
      return NextResponse.json({ ok: false, error: "project_not_found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const parsedBody = (body as { sourceId?: unknown }) ?? {};
    const sourceId = normalizeSourceId(parsedBody.sourceId);

    if (!sourceId) {
      return NextResponse.json({ ok: false, error: "source_id_missing" }, { status: 400 });
    }

    const parsed = await ingestDcpPdfForProject({ projectId: project.id, sourceId });
    const sectionHeadings = parsed.sections.slice(0, 10).map((section) => section.heading);

    return NextResponse.json({ ok: true, instrumentName: parsed.instrumentName, sectionHeadings });
  } catch (error) {
    console.error("[dcp-ingest] Failed to process DCP upload", error);
    return NextResponse.json({ ok: false, error: "dcp_ingest_failed" }, { status: 500 });
  }
}
