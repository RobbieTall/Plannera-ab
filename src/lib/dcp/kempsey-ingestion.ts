import { createHash } from "node:crypto";

import { LgaCoverageMaturity, type PrismaClient } from "@prisma/client";
import pdfParse from "pdf-parse";

import { prisma as defaultPrisma } from "@/lib/prisma";

export const KEMPSEY_DCP_2026_PARTS = [
  {
    slug: "part-b-shire-wide-requirements",
    title: "Part B - Shire-wide requirements",
    url: "https://www.kempsey.nsw.gov.au/files/sharedassets/public/v/1/docs/departments/dev-and-compliance/development-assessment/part-b-shire-wide-requirements-kempsey-shire-council-development-control-plan-2026.pdf",
  },
  {
    slug: "part-d-development-requirements",
    title: "Part D - Development requirements",
    url: "https://www.kempsey.nsw.gov.au/files/sharedassets/public/v/1/docs/departments/dev-and-compliance/development-assessment/part-d-development-requirements-kempsey-shire-council-development-control-plan-2026.pdf",
  },
] as const;

const LGA_CODE = "KEMPSEY";
const SOURCE = "KEMPSEY_DCP_2026";
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
    return Buffer.from(await response.arrayBuffer());
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
    /^[A-Z][A-Z0-9 /,&()'’\-]+$/.test(trimmed)
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

export const ingestKempseyDcp = async (db: DbClient = defaultPrisma) => {
  const parsedParts = [] as Array<{
    part: KempseyDcpPart;
    chapterRef: string;
    chunks: string[];
  }>;

  for (const part of KEMPSEY_DCP_2026_PARTS) {
    try {
      const buffer = await fetchPdfBytes(part);
      const text = await extractPdfText(buffer);
      const chunks = splitTextIntoChunks(text);

      if (!chunks.length) {
        console.warn("[kempsey-dcp] No chunks parsed for PDF part", {
          part: part.title,
          url: part.url,
        });
        continue;
      }

      parsedParts.push({ part, chapterRef: chapterRefFor(part), chunks });
    } catch (error) {
      console.warn("[kempsey-dcp] Skipping PDF part after fetch/parse failure", {
        part: part.title,
        url: part.url,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
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
    throw new Error("No Kempsey DCP 2026 PDF parts could be fetched and parsed");
  }

  await db.$transaction(async (tx) => {
    await tx.dCPClause.deleteMany({
      where: { lgaCode: LGA_CODE, instrumentSlug: SOURCE },
    });
    await tx.dCPClause.createMany({
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
          source: SOURCE,
          chapterRef: clause.chapterRef,
          sectionTitle: clause.title,
          partSlug: clause.part.slug,
          chunkIndex: clause.index,
          contentHash: hashContent(`${clause.part.url}:${clause.content}`),
        },
      })),
    });
    await tx.lgaCoverageState.upsert({
      where: { lgaCode: LGA_CODE },
      update: {
        state: LgaCoverageMaturity.SEARCHABLE_READY,
        lastPreparedAt: new Date(),
        errorMessage: null,
      },
      create: {
        lgaCode: LGA_CODE,
        state: LgaCoverageMaturity.SEARCHABLE_READY,
        lastPreparedAt: new Date(),
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
