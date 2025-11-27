declare module "pdf-parse" {
  export interface PdfParseMeta {
    info?: unknown;
    metadata?: unknown;
    version?: string;
  }

  export interface PdfParseResult extends PdfParseMeta {
    text: string;
  }

  // Minimal signature that matches how we use it
  export default function pdfParse(
    data: Buffer | Uint8Array | ArrayBuffer
  ): Promise<PdfParseResult>;
}
