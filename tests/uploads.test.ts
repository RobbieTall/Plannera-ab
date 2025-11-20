import assert from "node:assert/strict";
import test from "node:test";

import { MAX_FILE_SIZE_BYTES } from "@/lib/upload-constraints";
import { persistWorkspaceUploads, UploadError } from "@/lib/upload-service";

class MockPrisma {
  uploads: any[] = [];
  constructor(private projectExists = true) {}

  project = {
    findUnique: async ({ where }: any) => (this.projectExists ? { id: where.id } : null),
  };

  workspaceUpload = {
    create: async ({ data, select }: any) => {
      const record = { id: `upload-${this.uploads.length + 1}`, createdAt: new Date(), ...data };
      this.uploads.push(record);
      const selected: Record<string, unknown> = {};
      Object.entries(select ?? {}).forEach(([key, enabled]) => {
        if (enabled) {
          // @ts-expect-error - mock selection
          selected[key] = record[key];
        }
      });
      return selected;
    },
  };
}

const saveFileMock = async (file: File) => ({
  url: `/mock/${file.name}`,
  path: `/tmp/${file.name}`,
  mimeType: file.type,
  size: file.size,
});

test("creates workspace uploads with metadata and extracted text", async () => {
  const prisma = new MockPrisma(true);
  const pdfFile = new File(["pdf-bytes"], "report.pdf", { type: "application/pdf" });

  const uploads = await persistWorkspaceUploads({
    projectId: "proj-1",
    files: [pdfFile],
    userId: "user-1",
    prisma: prisma as any,
    saveFile: saveFileMock,
    extractPdfText: async () => "sample text",
  });

  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].fileExtension, "pdf");
  assert.equal(uploads[0].mimeType, "application/pdf");
  assert.equal(prisma.uploads[0].fileName, "report.pdf");
  assert.equal(prisma.uploads[0].fileExtension, "pdf");
  assert.equal(prisma.uploads[0].extractedText, "sample text");
});

test("rejects unsupported file types", async () => {
  const prisma = new MockPrisma(true);
  const badFile = new File(["noop"], "script.exe", { type: "application/octet-stream" });

  await assert.rejects(
    () =>
      persistWorkspaceUploads({
        projectId: "proj-1",
        files: [badFile],
        prisma: prisma as any,
        saveFile: saveFileMock,
      }),
    (error) => {
      assert.ok(error instanceof UploadError);
      assert.equal(error.code, "unsupported_file_type");
      return true;
    },
  );
});

test("rejects oversized files", async () => {
  const prisma = new MockPrisma(true);
  const largeBuffer = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
  const largeFile = new File([largeBuffer], "large.pdf", { type: "application/pdf" });

  await assert.rejects(
    () =>
      persistWorkspaceUploads({
        projectId: "proj-1",
        files: [largeFile],
        prisma: prisma as any,
        saveFile: saveFileMock,
      }),
    (error) => {
      assert.ok(error instanceof UploadError);
      assert.equal(error.code, "file_too_large");
      return true;
    },
  );
});
