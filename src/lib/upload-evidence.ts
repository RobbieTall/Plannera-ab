import { createHash } from "node:crypto";

import pdfParse, { type PdfPageData } from "pdf-parse";

import type { UploadCategory } from "@/lib/upload-constraints";

export type EvidenceReadabilityStatus =
  | "READY"
  | "PARTIALLY_READABLE"
  | "IMAGE_ONLY"
  | "NEEDS_REVIEW";

export type EvidenceSegment = {
  heading: string;
  content: string;
  pageNumber?: number;
  sheetName?: string;
};

export type UploadEvidenceExtraction = {
  contentHash: string;
  extractedText: string | null;
  extractionMethod: string | null;
  extractionMetadata: Record<string, unknown>;
  extractedAt: Date;
  pageCount: number | null;
  evidenceStatus: EvidenceReadabilityStatus;
  reviewReason: string | null;
  segments: EvidenceSegment[];
};

type PdfExtraction = {
  text: string;
  pageCount: number | null;
  pages: EvidenceSegment[];
};

type DocumentExtraction = {
  text: string;
  warnings: string[];
};

type SpreadsheetExtraction = {
  text: string;
  sheets: EvidenceSegment[];
};

export type UploadEvidenceExtractorDeps = {
  parsePdf?: (buffer: Buffer) => Promise<PdfExtraction>;
  parseDocx?: (buffer: Buffer) => Promise<DocumentExtraction>;
  parseXlsx?: (buffer: Buffer) => Promise<SpreadsheetExtraction>;
};

const normalizeExtractedText = (value: string) =>
  value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const renderPdfPage = async (pageData: PdfPageData) => {
  const content = await pageData.getTextContent();
  let lastY: number | null = null;
  let text = "";

  for (const item of content.items) {
    const value = item.str?.trim();
    if (!value) continue;
    const y = item.transform?.[5];
    const separator = lastY !== null && typeof y === "number" && Math.abs(y - lastY) > 2 ? "\n" : " ";
    text += `${text ? separator : ""}${value}`;
    if (typeof y === "number") lastY = y;
  }

  return normalizeExtractedText(text);
};

const parsePdfDefault = async (buffer: Buffer): Promise<PdfExtraction> => {
  const pages: EvidenceSegment[] = [];
  let fallbackPage = 0;
  const parsed = await pdfParse(buffer, {
    pagerender: async (pageData) => {
      fallbackPage += 1;
      const pageNumber = pageData.pageNumber ?? fallbackPage;
      const content = await renderPdfPage(pageData);
      if (content) pages.push({ heading: `Page ${pageNumber}`, content, pageNumber });
      return content;
    },
  });

  const text = normalizeExtractedText(
    pages.length ? pages.map((page) => page.content).join("\n\n") : parsed.text ?? "",
  );
  return { text, pageCount: parsed.numpages ?? (pages.length || null), pages };
};

const parseDocxDefault = async (buffer: Buffer): Promise<DocumentExtraction> => {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: normalizeExtractedText(result.value ?? ""),
    warnings: result.messages.map((message) => message.message),
  };
};

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (record.result !== undefined) return cellText(record.result);
    if (Array.isArray(record.richText)) {
      return record.richText
        .map((entry) => (entry && typeof entry === "object" ? String((entry as Record<string, unknown>).text ?? "") : ""))
        .join("");
    }
  }
  return String(value);
};

const parseXlsxDefault = async (buffer: Buffer): Promise<SpreadsheetExtraction> => {
  const readExcelFile = (await import("read-excel-file/universal")).default;
  const workbook = await readExcelFile(Uint8Array.from(buffer).buffer);
  const sheets = workbook.flatMap<EvidenceSegment>((worksheet) => {
    const rows = worksheet.data
      .map((row) => row.map(cellText).join("\t").trim())
      .filter(Boolean);
    const content = normalizeExtractedText(rows.join("\n"));
    return content
      ? [{ heading: worksheet.sheet, content, sheetName: worksheet.sheet }]
      : [];
  });

  return {
    text: sheets.map((sheet) => `[${sheet.heading}]\n${sheet.content}`).join("\n\n"),
    sheets,
  };
};

const textResult = ({
  contentHash,
  text,
  method,
  segments,
  metadata = {},
  pageCount = null,
  partialReason = null,
  emptyStatus = "NEEDS_REVIEW",
  emptyReason = "No machine-readable content was found. Manual review is required.",
}: {
  contentHash: string;
  text: string;
  method: string;
  segments: EvidenceSegment[];
  metadata?: Record<string, unknown>;
  pageCount?: number | null;
  partialReason?: string | null;
  emptyStatus?: Extract<EvidenceReadabilityStatus, "IMAGE_ONLY" | "NEEDS_REVIEW">;
  emptyReason?: string;
}): UploadEvidenceExtraction => {
  const normalized = normalizeExtractedText(text);
  if (!normalized) {
    return {
      contentHash,
      extractedText: null,
      extractionMethod: method,
      extractionMetadata: { schemaVersion: 1, ...metadata },
      extractedAt: new Date(),
      pageCount,
      evidenceStatus: emptyStatus,
      reviewReason: emptyReason,
      segments: [],
    };
  }

  return {
    contentHash,
    extractedText: normalized,
    extractionMethod: method,
    extractionMetadata: { schemaVersion: 1, ...metadata },
    extractedAt: new Date(),
    pageCount,
    evidenceStatus: partialReason ? "PARTIALLY_READABLE" : "READY",
    reviewReason: partialReason,
    segments: segments.length ? segments : [{ heading: "Document", content: normalized }],
  };
};

const unprocessedResult = ({
  contentHash,
  status,
  reason,
  method = null,
}: {
  contentHash: string;
  status: Extract<EvidenceReadabilityStatus, "IMAGE_ONLY" | "NEEDS_REVIEW">;
  reason: string;
  method?: string | null;
}): UploadEvidenceExtraction => ({
  contentHash,
  extractedText: null,
  extractionMethod: method,
  extractionMetadata: { schemaVersion: 1 },
  extractedAt: new Date(),
  pageCount: null,
  evidenceStatus: status,
  reviewReason: reason,
  segments: [],
});

export const extractUploadEvidence = async ({
  file,
  category,
  extension,
  deps = {},
}: {
  file: File;
  category: UploadCategory;
  extension: string;
  deps?: UploadEvidenceExtractorDeps;
}): Promise<UploadEvidenceExtraction> => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentHash = createHash("sha256").update(buffer).digest("hex");

  try {
    if (category === "pdf") {
      const result = await (deps.parsePdf ?? parsePdfDefault)(buffer);
      return textResult({
        contentHash,
        text: result.text,
        method: "pdf-text-v1",
        segments: result.pages,
        pageCount: result.pageCount,
        metadata: {
          pages: result.pages.map((page) => ({ pageNumber: page.pageNumber, characterCount: page.content.length })),
        },
        emptyStatus: "IMAGE_ONLY",
        emptyReason: "No machine-readable text was found. OCR or manual review is required.",
      });
    }

    if (extension === "docx") {
      const result = await (deps.parseDocx ?? parseDocxDefault)(buffer);
      return textResult({
        contentHash,
        text: result.text,
        method: "docx-raw-text-v1",
        segments: [{ heading: file.name, content: result.text }],
        metadata: { warnings: result.warnings },
        partialReason: result.warnings.length ? "The document was extracted with parser warnings and needs review." : null,
        emptyStatus: "IMAGE_ONLY",
        emptyReason: "No machine-readable text was found. OCR or manual review is required.",
      });
    }

    if (extension === "xlsx") {
      const result = await (deps.parseXlsx ?? parseXlsxDefault)(buffer);
      return textResult({
        contentHash,
        text: result.text,
        method: "xlsx-cells-v1",
        segments: result.sheets,
        metadata: {
          sheets: result.sheets.map((sheet) => ({ name: sheet.sheetName, characterCount: sheet.content.length })),
        },
      });
    }

    if (category === "text" || extension === "csv") {
      const text = normalizeExtractedText(buffer.toString("utf8"));
      return textResult({
        contentHash,
        text,
        method: extension === "csv" ? "csv-text-v1" : "plain-text-v1",
        segments: [{ heading: file.name, content: text }],
      });
    }

    if (category === "image") {
      return unprocessedResult({
        contentHash,
        status: "IMAGE_ONLY",
        reason: "Image evidence requires OCR and visual review before it can support an SEE claim.",
      });
    }

    const legacyReason = extension === "doc" || extension === "xls"
      ? `Legacy .${extension} extraction is not supported. Convert the file to ${extension === "doc" ? "DOCX" : "XLSX"} or review it manually.`
      : "This archive cannot be used as evidence until its contents are reviewed and uploaded individually.";
    return unprocessedResult({ contentHash, status: "NEEDS_REVIEW", reason: legacyReason });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown extraction failure";
    return unprocessedResult({
      contentHash,
      status: "NEEDS_REVIEW",
      reason: `Automatic extraction failed: ${message}`,
    });
  }
};
