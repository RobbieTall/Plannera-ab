import { createHash } from "node:crypto";

import {
  LgaCoverageMaturity,
  WorkspaceSourceType,
  type PrismaClient,
} from "@prisma/client";
import pdfParse from "pdf-parse";

import { prisma as defaultPrisma } from "@/lib/prisma";

export const KEMPSEY_DCP_2026_PAGE_URL =
  "https://www.kempsey.nsw.gov.au/Plan-Build/Local-planning-zoning/Kempsey-Development-Control-Plan";
export const KEMPSEY_DCP_2026_PDF_URL =
  "https://www.kempsey.nsw.gov.au/files/sharedassets/public/v/1/docs/departments/dev-and-compliance/development-assessment/kempsey-shire-council-development-control-plan-2026.pdf";

export const KEMPSEY_DCP_2026_PARTS = [
  {
    slug: "part-a-explanation",
    title: "Part A - Explanation",
    url: "https://www.kempsey.nsw.gov.au/files/sharedassets/public/v/1/docs/departments/dev-and-compliance/development-assessment/part-a-explanation-kempsey-shire-council-development-control-plan-2026.pdf",
  },
  {
    slug: "part-b-shire-wide-requirements",
    title: "Part B - Shire-wide requirements",
    url: "https://www.kempsey.nsw.gov.au/files/sharedassets/public/v/1/docs/departments/dev-and-compliance/development-assessment/part-b-shire-wide-requirements-kempsey-shire-council-development-control-plan-2026.pdf",
  },
  {
    slug: "part-c-place-based-requirements",
    title: "Part C - Place-based requirements",
    url: "https://www.kempsey.nsw.gov.au/files/sharedassets/public/v/1/docs/departments/dev-and-compliance/development-assessment/part-c-place-based-requirements-kempsey-shire-council-development-control-plan-2026.pdf",
  },
  {
    slug: "part-d-development-requirements",
    title: "Part D - Development requirements",
    url: "https://www.kempsey.nsw.gov.au/files/sharedassets/public/v/1/docs/departments/dev-and-compliance/development-assessment/part-d-development-requirements-kempsey-shire-council-development-control-plan-2026.pdf",
  },
  {
    slug: "part-e-appendices",
    title: "Part E - Appendices",
    url: "https://www.kempsey.nsw.gov.au/files/sharedassets/public/v/1/docs/departments/dev-and-compliance/development-assessment/part-e-appendices-kempsey-shire-council-development-control-plan-2026.pdf",
  },
] as const;

const LGA_CODE = "KEMPSEY";
const SOURCE = "kempsey-dcp-2026";
const DOCUMENT_TITLE = "Kempsey Development Control Plan 2026";
const DOCUMENT_FILE_NAME = "kempsey-shire-council-development-control-plan-2026.pdf";
const FETCH_TIMEOUT_MS = 30_000;
const TARGET_CHUNK_LENGTH = 800;
const MAX_CHUNK_LENGTH = 1_200;
const MIN_CHUNK_LENGTH = 250;

const hashContent = (content: string) =>
  createHash("sha256").update(content).digest("hex");

type KempseyDcpPart = (typeof KEMPSEY_DCP_2026_PARTS)[number];
type DbClient = PrismaClient;

const chapterRefFor = (part: KempseyDcpPart) => {
  const partMatch = part.title.match(/^Part\s+([A-Z])/i);
  return partMatch ? `Part ${partMatch[1].toUpperCase()}` : part.title;
};

const normalizePdfText = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const fetchPdfBytes = async (part: KempseyDcpPart) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(part.url, {
      signal: controller.signal,
      headers: {
        accept: "application/pdf,*/*;q=0.8",
        "user-agent":
          "Mozilla/5.0 (compatible; Plannera DCP ingestion; +https://plannera.com.au)",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("Response is not a PDF");
    }
    return buffer;
  } finally {
    clearTimeout(timeout);
  }
};

const extractPdfText = async (buffer: Buffer) => {
  const parsed = await pdfParse(buffer);
  return normalizePdfText(parsed.text ?? "");
};

const isLikelyHeading = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 140) return false;
  return (
    /^\d+(?:\.\d+)*\s+\S/.test(trimmed) ||
    /^Part\s+[A-Z]\b/i.test(trimmed) ||
    /^Section\s+\d+/i.test(trimmed) ||
    /^[A-Z][A-Z0-9 /,&()'’-]+$/.test(trimmed)
  );
};

const splitOversizedChunk = (chunk: string) => {
  if (chunk.length <= MAX_CHUNK_LENGTH) return [chunk];

  const sentences = chunk.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > TARGET_CHUNK_LENGTH && current.length >= MIN_CHUNK_LENGTH) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [chunk];
};

const splitTextIntoChunks = (text: string) => {
  const paragraphs = text
    .split(/\n{2,}|(?=\n\d+(?:\.\d+)*\s+\S)/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const paragraphStartsNewSection = isLikelyHeading(paragraph);
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (
      current &&
      (next.length > TARGET_CHUNK_LENGTH || paragraphStartsNewSection) &&
      current.length >= MIN_CHUNK_LENGTH
    ) {
      chunks.push(...splitOversizedChunk(current.trim()));
      current = paragraph;
    } else {
      current = next;
    }
  }

  if (current.trim()) chunks.push(...splitOversizedChunk(current.trim()));
  return chunks;
};

const sectionTitleFor = (chunk: string, fallback: string) => {
  const firstLine = chunk.split("\n").find((line) => line.trim())?.trim();
  if (!firstLine) return fallback;
  return firstLine.length > 160 ? `${firstLine.slice(0, 157)}...` : firstLine;
};

const parsePart = async (part: KempseyDcpPart) => {
  try {
    const buffer = await fetchPdfBytes(part);
    const text = await extractPdfText(buffer);
    const chunks = splitTextIntoChunks(text);

    if (!chunks.length) {
      throw new Error("No substantive text chunks were parsed");
    }

    return { part, chapterRef: chapterRefFor(part), chunks };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    throw new Error(
      `Kempsey DCP 2026 ingestion stopped at ${part.title}: ${reason}`,
    );
  }
};

export const ingestKempseyDcp = async (db: DbClient = defaultPrisma) => {
  const parsedParts = await Promise.all(
    KEMPSEY_DCP_2026_PARTS.map((part) => parsePart(part)),
  );

  if (parsedParts.length !== KEMPSEY_DCP_2026_PARTS.length) {
    throw new Error("All five Kempsey DCP 2026 parts are required");
  }

  const clauses = parsedParts.flatMap(({ part, chapterRef, chunks }) =>
    chunks.map((chunk, index) => ({
      part,
      chapterRef,
      ref: `${chapterRef}-${index + 1}`,
      title: sectionTitleFor(chunk, part.title),
      content: chunk,
      index,
    })),
  );

  if (!clauses.length) {
    throw new Error("No Kempsey DCP 2026 clauses were parsed");
  }

  await db.$transaction(async (tx) => {
    const ingestedAt = new Date();
    const councilDocument = await tx.councilDocument.upsert({
      where: { lgaCode: LGA_CODE },
      update: {
        title: DOCUMENT_TITLE,
        sourceUrl: KEMPSEY_DCP_2026_PAGE_URL,
        fileName: DOCUMENT_FILE_NAME,
        fileExtension: "pdf",
        mimeType: "application/pdf",
        storagePath: KEMPSEY_DCP_2026_PDF_URL,
        publicUrl: KEMPSEY_DCP_2026_PDF_URL,
        extractedText: null,
      },
      create: {
        lgaCode: LGA_CODE,
        title: DOCUMENT_TITLE,
        sourceUrl: KEMPSEY_DCP_2026_PAGE_URL,
        fileName: DOCUMENT_FILE_NAME,
        fileExtension: "pdf",
        mimeType: "application/pdf",
        storagePath: KEMPSEY_DCP_2026_PDF_URL,
        publicUrl: KEMPSEY_DCP_2026_PDF_URL,
      },
    });

    await tx.workspaceSourceChunk.deleteMany({
      where: {
        lgaCode: LGA_CODE,
        sourceType: {
          in: [WorkspaceSourceType.council_dcp, WorkspaceSourceType.dcp],
        },
      },
    });
    await tx.dCPClause.deleteMany({
      where: { lgaCode: LGA_CODE },
    });

    const dcpInsert = await tx.dCPClause.createMany({
      data: clauses.map((clause) => ({
        lgaCode: LGA_CODE,
        instrumentSlug: SOURCE,
        ref: clause.ref,
        title: clause.title,
        headingPath: [clause.part.title, clause.title],
        parentRef: clause.chapterRef,
        depth: 2,
        bodyHtml: `<p>${clause.content
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n{2,}/g, "</p><p>")}</p>`,
        bodyText:
          `Kempsey DCP 2026 ${clause.chapterRef} ${clause.title}\n\n${clause.content}`.trim(),
        topicTags: [],
        numericMeta: {
          sourceUrl: clause.part.url,
          sourcePageUrl: KEMPSEY_DCP_2026_PAGE_URL,
          source: SOURCE,
          edition: 2026,
          effectiveFrom: "2026-07-01",
          chapterRef: clause.chapterRef,
          sectionTitle: clause.title,
          partSlug: clause.part.slug,
          chunkIndex: clause.index,
          contentHash: hashContent(`${clause.part.url}:${clause.content}`),
        },
      })),
    });

    const chunkInsert = await tx.workspaceSourceChunk.createMany({
      data: clauses.map((clause) => ({
        councilDocumentId: councilDocument.id,
        lgaCode: LGA_CODE,
        heading: `${clause.chapterRef} - ${clause.title}`,
        content: clause.content,
        sourceType: WorkspaceSourceType.council_dcp,
        metadata: {
          sourceUrl: clause.part.url,
          sourcePageUrl: KEMPSEY_DCP_2026_PAGE_URL,
          source: SOURCE,
          edition: 2026,
          effectiveFrom: "2026-07-01",
          chapterRef: clause.chapterRef,
          sectionTitle: clause.title,
          partSlug: clause.part.slug,
          chunkIndex: clause.index,
          contentHash: hashContent(`${clause.part.url}:${clause.content}`),
        },
      })),
    });

    if (
      dcpInsert.count !== clauses.length ||
      chunkInsert.count !== clauses.length
    ) {
      throw new Error("Kempsey DCP 2026 corpus replacement was incomplete");
    }

    await tx.lgaCoverageState.upsert({
      where: { lgaCode: LGA_CODE },
      update: {
        state: LgaCoverageMaturity.SEARCHABLE_READY,
        lastPreparedAt: ingestedAt,
        errorMessage: null,
      },
      create: {
        lgaCode: LGA_CODE,
        state: LgaCoverageMaturity.SEARCHABLE_READY,
        lastPreparedAt: ingestedAt,
      },
    });
  });

  return {
    ok: true as const,
    status: "ok" as const,
    lga: LGA_CODE,
    source: SOURCE,
    partsIngested: parsedParts.length,
    totalChunks: clauses.length,
  };
};
