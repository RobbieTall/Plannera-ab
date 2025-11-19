import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { put } from "@vercel/blob";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

export type SavedFile = {
  url: string;
  path: string;
  mimeType: string;
  size: number;
};

type StorageProvider = "local" | "vercel-blob" | "noop";

const normalizeProvider = (provider?: string | null): StorageProvider | undefined => {
  if (!provider) {
    return undefined;
  }
  const value = provider.toLowerCase();
  if (value === "local" || value === "vercel-blob" || value === "noop") {
    return value;
  }
  return undefined;
};

const configuredProvider = normalizeProvider(process.env.WORKSPACE_UPLOAD_STORAGE);
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

const WORKSPACE_STORAGE_PROVIDER: StorageProvider = configuredProvider ?? (blobToken ? "vercel-blob" : "local");

type StorageStatus =
  | { ready: true; provider: StorageProvider }
  | { ready: false; provider: StorageProvider; missingEnv?: string[]; reason?: string };

const REQUIRED_ENV_VARS: Record<Exclude<StorageProvider, "local">, string[]> = {
  "vercel-blob": ["BLOB_READ_WRITE_TOKEN"],
  noop: [],
};

const ensureUploadsDir = async () => {
  await mkdir(UPLOADS_DIR, { recursive: true });
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 150);

const saveFileLocally = async (file: File): Promise<SavedFile> => {
  await ensureUploadsDir();

  const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const safeExtension = extension ? `.${extension}` : "";
  const fileName = `${randomUUID()}${safeExtension}`;
  const destination = join(UPLOADS_DIR, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(destination, buffer);

  return {
    url: `/uploads/${fileName}`,
    path: destination,
    mimeType: file.type,
    size: buffer.byteLength,
  };
};

const saveFileToBlob = async (file: File): Promise<SavedFile> => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = sanitizeFileName(file.name) || "upload";
  const objectPath = `workspace-uploads/${randomUUID()}-${fileName}`;

  const blob = await put(objectPath, buffer, {
    access: "public",
    contentType: file.type || undefined,
    token: blobToken,
  });

  return {
    url: blob.url,
    path: blob.pathname ?? objectPath,
    mimeType: blob.contentType ?? file.type ?? "application/octet-stream",
    size: buffer.byteLength,
  };
};

const saveFileNoop = async (file: File): Promise<SavedFile> => ({
  url: `workspace-upload://${randomUUID()}`,
  path: "noop",
  mimeType: file.type,
  size: file.size,
});

export const getWorkspaceStorageStatus = (): StorageStatus => {
  if (WORKSPACE_STORAGE_PROVIDER === "noop") {
    return { ready: true, provider: WORKSPACE_STORAGE_PROVIDER };
  }

  if (WORKSPACE_STORAGE_PROVIDER === "local" && process.env.VERCEL === "1") {
    return {
      ready: false,
      provider: WORKSPACE_STORAGE_PROVIDER,
      reason: "Local filesystem uploads are not supported on this platform. Configure WORKSPACE_UPLOAD_STORAGE=vercel-blob.",
    };
  }

  if (WORKSPACE_STORAGE_PROVIDER === "vercel-blob") {
    const missingEnv = REQUIRED_ENV_VARS["vercel-blob"].filter((key) => !process.env[key]);
    if (missingEnv.length) {
      return { ready: false, provider: WORKSPACE_STORAGE_PROVIDER, missingEnv };
    }
  }

  return { ready: true, provider: WORKSPACE_STORAGE_PROVIDER };
};

export async function saveFileToUploads(file: File): Promise<SavedFile> {
  switch (WORKSPACE_STORAGE_PROVIDER) {
    case "vercel-blob":
      return saveFileToBlob(file);
    case "noop":
      return saveFileNoop(file);
    case "local":
    default:
      return saveFileLocally(file);
  }
}

export { WORKSPACE_STORAGE_PROVIDER };
