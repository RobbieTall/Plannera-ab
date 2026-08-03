import assert from "node:assert/strict";
import test from "node:test";

import { extractUploadEvidence } from "@/lib/upload-evidence";

test("extracts and hashes plain-text evidence", async () => {
  const file = new File(["Site inspection\nNo visible flooding."], "inspection.txt", { type: "text/plain" });
  const result = await extractUploadEvidence({ file, category: "text", extension: "txt" });

  assert.equal(result.evidenceStatus, "READY");
  assert.equal(result.extractedText, "Site inspection\nNo visible flooding.");
  assert.match(result.contentHash, /^[a-f0-9]{64}$/);
  assert.equal(result.segments[0]?.heading, "inspection.txt");
});

test("preserves PDF page provenance supplied by the parser", async () => {
  const file = new File(["pdf-bytes"], "traffic-report.pdf", { type: "application/pdf" });
  const result = await extractUploadEvidence({
    file,
    category: "pdf",
    extension: "pdf",
    deps: {
      parsePdf: async () => ({
        text: "Page one evidence\n\nPage two evidence",
        pageCount: 2,
        pages: [
          { heading: "Page 1", content: "Page one evidence", pageNumber: 1 },
          { heading: "Page 2", content: "Page two evidence", pageNumber: 2 },
        ],
      }),
    },
  });

  assert.equal(result.evidenceStatus, "READY");
  assert.equal(result.pageCount, 2);
  assert.deepEqual(result.segments.map((segment) => segment.pageNumber), [1, 2]);
  assert.deepEqual(result.extractionMetadata.pages, [
    { pageNumber: 1, characterCount: 17 },
    { pageNumber: 2, characterCount: 17 },
  ]);
});

test("preserves XLSX sheet provenance supplied by the parser", async () => {
  const file = new File(["xlsx-bytes"], "controls.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const result = await extractUploadEvidence({
    file,
    category: "spreadsheet",
    extension: "xlsx",
    deps: {
      parseXlsx: async () => ({
        text: "[Parking]\nUse\tRate",
        sheets: [{ heading: "Parking", content: "Use\tRate", sheetName: "Parking" }],
      }),
    },
  });

  assert.equal(result.evidenceStatus, "READY");
  assert.equal(result.segments[0]?.sheetName, "Parking");
  assert.deepEqual(result.extractionMetadata.sheets, [{ name: "Parking", characterCount: 8 }]);
});

test("demotes DOCX extraction warnings for review", async () => {
  const file = new File(["docx-bytes"], "consultant-report.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const result = await extractUploadEvidence({
    file,
    category: "document",
    extension: "docx",
    deps: {
      parseDocx: async () => ({ text: "Consultant findings", warnings: ["Unsupported embedded object"] }),
    },
  });

  assert.equal(result.evidenceStatus, "PARTIALLY_READABLE");
  assert.match(result.reviewReason ?? "", /parser warnings/);
});

test("marks image-only evidence as requiring OCR and visual review", async () => {
  const file = new File([new Uint8Array([1, 2, 3])], "site-map.png", { type: "image/png" });
  const result = await extractUploadEvidence({ file, category: "image", extension: "png" });

  assert.equal(result.evidenceStatus, "IMAGE_ONLY");
  assert.equal(result.extractedText, null);
  assert.match(result.reviewReason ?? "", /OCR and visual review/);
});

test("fails closed for legacy office formats", async () => {
  const file = new File(["legacy"], "old-report.doc", { type: "application/msword" });
  const result = await extractUploadEvidence({ file, category: "document", extension: "doc" });

  assert.equal(result.evidenceStatus, "NEEDS_REVIEW");
  assert.match(result.reviewReason ?? "", /Convert the file to DOCX/);
});

test("marks parser failures for review without losing provenance", async () => {
  const file = new File(["broken"], "broken.pdf", { type: "application/pdf" });
  const result = await extractUploadEvidence({
    file,
    category: "pdf",
    extension: "pdf",
    deps: { parsePdf: async () => { throw new Error("invalid xref"); } },
  });

  assert.equal(result.evidenceStatus, "NEEDS_REVIEW");
  assert.match(result.contentHash, /^[a-f0-9]{64}$/);
  assert.match(result.reviewReason ?? "", /invalid xref/);
});
