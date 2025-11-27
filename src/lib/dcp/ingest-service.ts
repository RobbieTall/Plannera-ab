import { readFile } from "node:fs/promises";

import pdfParse from "pdf-parse";

import { prisma } from "@/lib/prisma";
import type { DcpControlChunk, DcpParseResult } from "./types";

const toAbsoluteUrl = (url: string) => {
  if (url.startsWith("http")) {
    return url;
  }
  const baseUrl =
    process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
};

const loadUploadBuffer = async (upload: { storagePath: string; publicUrl: string }) => {
  if (upload.storagePath && upload.storagePath !== "noop") {
    try {
      return await readFile(upload.storagePath);
    } catch (error) {
      console.warn("[dcp-ingest] Failed to read upload from storagePath; falling back to publicUrl", error);
    }
  }

  if (!upload.publicUrl) {
    throw new Error("Upload has no retrievable location");
  }

  const response = await fetch(toAbsoluteUrl(upload.publicUrl));
  if (!response.ok) {
    throw new Error(`Unable to fetch upload content (status ${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const isHeadingLine = (line: string) => {
  const headingPattern = /^\d+(?:\.\d+)*\s+.+$/;
  const isUppercase = line === line.toUpperCase() && /[A-Z]/.test(line) && line.length >= 5;
  return headingPattern.test(line) || isUppercase;
};

const splitIntoChunks = (text: string): DcpControlChunk[] => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  let currentHeading: string | null = null;
  let currentBody: string[] = [];
  const chunks: DcpControlChunk[] = [];

  const pushChunk = () => {
    if (!currentHeading && currentBody.length === 0) return;
    const heading = currentHeading?.trim() || "General";
    const body = currentBody.join(" ").trim();
    chunks.push({ heading, body });
  };

  for (const line of lines) {
    if (isHeadingLine(line)) {
      if (currentHeading || currentBody.length) {
        pushChunk();
      }
      currentHeading = line;
      currentBody = [];
      continue;
    }
    currentBody.push(line);
  }

  if (currentHeading || currentBody.length) {
    pushChunk();
  }

  if (!chunks.length && text.trim()) {
    chunks.push({ heading: "Document", body: text.trim() });
  }

  return chunks;
};

const parseDcpText = (text: string): DcpParseResult => {
  const normalized = text.trim();
  const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const instrumentName =
    lines.find((line) => /\bDCP\b/i.test(line)) || lines[0] || "Development Control Plan";

  const sections = splitIntoChunks(normalized);

  return {
    instrumentName,
    lgaName: null,
    sections,
  };
};

export async function ingestDcpPdfForProject({
  projectId,
  sourceId,
}: {
  projectId: string;
  sourceId: string;
}): Promise<DcpParseResult> {
  const upload = await prisma.workspaceUpload.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      projectId: true,
      storagePath: true,
      publicUrl: true,
    },
  });

  if (!upload || upload.projectId !== projectId) {
    throw new Error("Upload not found for project");
  }

  const buffer = await loadUploadBuffer(upload);
  const parsedPdf = await pdfParse(buffer);
  const rawText = parsedPdf.text?.trim() || buffer.toString("utf-8").trim();

  if (!rawText) {
    throw new Error("No text could be extracted from the PDF");
  }

  const parsed = parseDcpText(rawText);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      dcpData: parsed,
    },
  });

  return parsed;
}
