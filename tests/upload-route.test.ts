import assert from "node:assert/strict";
import test from "node:test";

import { handleUploadPost } from "@/app/api/projects/[projectId]/uploads/handler";
import { UploadError } from "@/lib/upload-service";

const buildRequest = (files: File[]) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  return new Request("http://localhost/api/projects/proj-1/uploads", {
    method: "POST",
    body: formData,
  }) as any;
};

test("returns ok response for valid uploads", async () => {
  const response = await handleUploadPost(
    buildRequest([new File(["bytes"], "doc.pdf", { type: "application/pdf" })]),
    {
      params: { projectId: "proj-1" },
      deps: {
        getStorageStatus: () => ({ ready: true, provider: "noop" as const }),
        validateFile: () => undefined,
        getSession: async () => ({ user: { id: "user-1", plan: "pro" } } as any),
        countUploads: async () => 0,
        persistUploads: async () => [
          {
            id: "upload-1",
            fileName: "doc.pdf",
            fileExtension: "pdf",
            mimeType: "application/pdf",
            fileSize: 5,
            publicUrl: "https://example.com/doc.pdf",
            createdAt: new Date(),
          },
        ],
        storageMode: "noop",
        prisma: {} as any,
        saveFile: async () => ({
          url: "https://example.com/doc.pdf",
          path: "noop",
          mimeType: "application/pdf",
          size: 5,
        }),
      },
    },
  );

  const payload = (await response.json()) as any;
  assert.equal(response.status, 201);
  assert.equal(payload.ok, true);
  assert.equal(payload.uploads[0].fileName, "doc.pdf");
});

test("reports missing storage configuration", async () => {
  const response = await handleUploadPost(buildRequest([]), {
    params: { projectId: "proj-1" },
    deps: {
      getStorageStatus: () => ({ ready: false, provider: "vercel-blob" as const, missingEnv: ["BLOB_READ_WRITE_TOKEN"] }),
      validateFile: () => undefined,
      getSession: async () => null,
      countUploads: async () => 0,
      persistUploads: async () => [],
      storageMode: "vercel-blob",
      prisma: {} as any,
      saveFile: async () => ({ url: "", path: "", mimeType: "", size: 0 }),
    },
  });

  const payload = (await response.json()) as any;
  assert.equal(response.status, 503);
  assert.equal(payload.ok, false);
  assert.equal(payload.errorCode, "storage_config_missing");
});

test("returns structured validation errors", async () => {
  const file = new File(["noop"], "script.exe", { type: "application/octet-stream" });
  const response = await handleUploadPost(buildRequest([file]), {
    params: { projectId: "proj-1" },
    deps: {
      getStorageStatus: () => ({ ready: true, provider: "noop" as const }),
      validateFile: () => {
        throw new UploadError("Unsupported file type", "unsupported_file_type", 400);
      },
      getSession: async () => null,
      countUploads: async () => 0,
      persistUploads: async () => [],
      storageMode: "noop",
      prisma: {} as any,
      saveFile: async () => ({ url: "", path: "", mimeType: "", size: 0 }),
    },
  });

  const payload = (await response.json()) as any;
  assert.equal(response.status, 400);
  assert.equal(payload.ok, false);
  assert.equal(payload.errorCode, "unsupported_file_type");
});
