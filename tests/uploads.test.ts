import assert from "node:assert/strict";
import test from "node:test";

import { MAX_FILE_SIZE_BYTES } from "@/lib/upload-constraints";
import { persistWorkspaceUploads, UploadError } from "@/lib/upload-service";

class MockPrisma {
  uploads: any[] = [];
  constructor(private projectExists = true) {}

  project = {
    findFirst: async ({ where }: any) => {
      if (!this.projectExists) {
        return null;
      }
      const lookupId = where?.OR?.[0]?.publicId ?? where?.id ?? where?.publicId;
      return { id: `db-${lookupId}`, publicId: lookupId };
    },
  };

  workspaceUpload = {
    create: async ({ data, select }: any) => {
      const projectId = data.projectId ?? data.project?.connect?.id;
      const record = {
        id: `upload-${this.uploads.length + 1}`,
        createdAt: new Date(),
        ...data,
        projectId,
      };
      delete record.project;
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

test("creates workspace uploads with metadata only (no binary content)", async () => {
  const prisma = new MockPrisma(true);
  const pdfFile = new File([new Uint8Array([0, 1, 2, 3, 4])], "report.pdf", { type: "application/pdf" });

  const uploads = await persistWorkspaceUploads({
    projectId: "proj-1",
    files: [pdfFile],
    userId: "user-1",
    prisma: prisma as any,
    saveFile: saveFileMock,
  });

  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].fileExtension, "pdf");
  assert.equal(uploads[0].mimeType, "application/pdf");
  assert.equal(prisma.uploads[0].fileName, "report.pdf");
  assert.equal(prisma.uploads[0].fileExtension, "pdf");
  assert.equal(prisma.uploads[0].extractedText, undefined);
  assert.equal(prisma.uploads[0].projectId, "db-proj-1");

  const values = Object.values(prisma.uploads[0]);
  const hasBinaryLikeValue = values.some(
    (value) => value instanceof Buffer || value instanceof ArrayBuffer || value instanceof Uint8Array,
  );
  assert.equal(hasBinaryLikeValue, false);
});

test("associates uploads to an existing project", async () => {
  const prisma = new MockPrisma(true);
  const pdfFile = new File(["pdf-bytes"], "site.pdf", { type: "application/pdf" });

  const uploads = await persistWorkspaceUploads({
    projectId: "proj-42",
    files: [pdfFile],
    prisma: prisma as any,
    saveFile: saveFileMock,
  });

  assert.equal(uploads[0].fileName, "site.pdf");
  assert.equal(prisma.uploads[0].projectId, "db-proj-42");
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

test("rejects uploads when project does not exist", async () => {
  const prisma = new MockPrisma(false);
  const pdfFile = new File(["pdf-bytes"], "missing.pdf", { type: "application/pdf" });

  await assert.rejects(
    () =>
      persistWorkspaceUploads({
        projectId: "proj-missing",
        files: [pdfFile],
        prisma: prisma as any,
        saveFile: saveFileMock,
      }),
    (error) => {
      assert.ok(error instanceof UploadError);
      assert.equal(error.code, "project_not_found");
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
