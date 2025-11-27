import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

import { ingestLepXmlForProject } from "@/lib/lep/ingest-service";
import { prisma } from "@/lib/prisma";
import { findProjectByExternalId, normalizeProjectId } from "@/lib/project-identifiers";

const normalizeSourceId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const toAbsoluteUrl = (url: string) => {
  if (url.startsWith("http")) {
    return url;
  }
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
};

const loadUploadXml = async (upload: { storagePath: string; publicUrl: string }): Promise<string> => {
  if (upload.storagePath && upload.storagePath !== "noop") {
    try {
      const buffer = await readFile(upload.storagePath);
      return buffer.toString("utf-8");
    } catch (error) {
      console.warn("[lep-ingest] Failed to read upload from storagePath; falling back to publicUrl", error);
    }
  }

  if (!upload.publicUrl) {
    throw new Error("Upload has no retrievable location");
  }

  const response = await fetch(toAbsoluteUrl(upload.publicUrl));
  if (!response.ok) {
    throw new Error(`Unable to fetch upload content (status ${response.status})`);
  }
  return response.text();
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

    const url = new URL(request.url);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const parsedBody = (body as { sourceId?: unknown }) ?? {};
    const sourceId =
      normalizeSourceId(parsedBody.sourceId) ?? normalizeSourceId(url.searchParams.get("sourceId"));

    if (!sourceId) {
      return NextResponse.json({ ok: false, error: "source_id_missing" }, { status: 400 });
    }

    const upload = await prisma.workspaceUpload.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        projectId: true,
        storagePath: true,
        publicUrl: true,
      },
    });

    if (!upload || upload.projectId !== project.id) {
      return NextResponse.json({ ok: false, error: "source_not_found" }, { status: 404 });
    }

    const xml = await loadUploadXml(upload);
    const parsed = await ingestLepXmlForProject({ projectId: project.id, xml });
    const summary = {
      metadata: parsed.metadata,
      zones: parsed.zones.map((zone) => ({ zoneCode: zone.zoneCode, zoneName: zone.zoneName })),
    };

    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[lep-ingest] Failed to process LEP upload", error);
    return NextResponse.json({ ok: false, error: "lep_ingest_failed" }, { status: 500 });
  }
}
