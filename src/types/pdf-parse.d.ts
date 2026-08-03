// Local type declarations for pdf-parse

declare module "pdf-parse" {
  export interface PdfParseMeta {
    info?: unknown;
    metadata?: unknown;
    version?: string;
  }

  export interface PdfParseResult extends PdfParseMeta {
    text: string;
    numpages?: number;
  }

  export interface PdfPageData {
    pageNumber?: number;
    getTextContent(): Promise<{
      items: Array<{ str?: string; transform?: number[] }>;
    }>;
  }

  export interface PdfParseOptions {
    pagerender?: (pageData: PdfPageData) => Promise<string>;
  }

  // Minimal signature that matches how we use it
  export default function pdfParse(
    data: Buffer | Uint8Array | ArrayBuffer,
    options?: PdfParseOptions,
  ): Promise<PdfParseResult>;
}
