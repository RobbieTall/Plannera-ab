import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { del, put } from "@vercel/blob";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

export type SavedFile = {
  url: string;
  path: string;
  mimeType: string;
  size: number;
};

type StorageProvider = "local" | "vercel-blob" | "noop";

type StorageModeLabel = "blob" | "local" | "noop";

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

const getStorageModeLabel = (provider: StorageProvider): StorageModeLabel => {
  if (provider === "vercel-blob") {
    return "blob";
  }
  return provider;
};

let storageModeLogged = false;

const logStorageMode = () => {
  if (storageModeLogged) {
    return;
  }
  storageModeLogged = true;
  const storageMode = getStorageModeLabel(WORKSPACE_STORAGE_PROVIDER);
  console.log("[storage-mode]", {
    mode: storageMode,
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
};

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
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "")
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

type ErrorWithStatus = {
  status?: number;
  response?: { status?: number };
};

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    const status = (error as ErrorWithStatus).status ?? (error as ErrorWithStatus).response?.status;
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      status,
    };
  }

  if (typeof error === "object" && error !== null) {
    const status = (error as ErrorWithStatus).status ?? (error as ErrorWithStatus).response?.status;
    return {
      message: String(error),
      status,
    };
  }

  return { message: String(error) };
};

export class StorageUploadError extends Error {
  cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "StorageUploadError";
    this.cause = options?.cause;
  }
}

export const isStorageUploadError = (error: unknown): error is StorageUploadError => error instanceof StorageUploadError;

const saveFileToBlob = async (file: File): Promise<SavedFile> => {
  const fileName = sanitizeFileName(file.name) || "upload";
  const timestamp = Date.now();
  const objectPath = `workspace-uploads/${timestamp}-${fileName}`;

  try {
    const blob = await put(objectPath, file, {
      // Vercel Blob requires explicit public access for uploads.
      access: "public",
      contentType: file.type || undefined,
    });

    return {
      url: blob.url,
      path: blob.pathname ?? objectPath,
      mimeType: blob.contentType ?? file.type ?? "application/octet-stream",
      size: file.size,
    };
  } catch (error) {
    console.error("[blob-upload-error]", getErrorDetails(error));
    throw new StorageUploadError("storage_upload_failed", { cause: error });
  }
};

const saveFileNoop = async (file: File): Promise<SavedFile> => ({
  url: `workspace-upload://${randomUUID()}`,
  path: "noop",
  mimeType: file.type,
  size: file.size,
});

export const getWorkspaceStorageStatus = (): StorageStatus => {
  logStorageMode();

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
  logStorageMode();

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

export type StorageHealth = { ok: boolean; mode: StorageModeLabel; error?: string };

const formatNotReadyReason = (status: StorageStatus): string | undefined => {
  if (status.ready) {
    return undefined;
  }
  if (status.reason) {
    return status.reason;
  }
  if (status.missingEnv?.length) {
    return `Missing env vars: ${status.missingEnv.join(", ")}`;
  }
  return undefined;
};

export const getStorageHealth = async (): Promise<StorageHealth> => {
  const status = getWorkspaceStorageStatus();
  const mode = getStorageModeLabel(status.provider);

  if (!status.ready) {
    return { ok: false, mode, error: formatNotReadyReason(status) };
  }

  if (status.provider === "vercel-blob") {
    const key = `storage-health/${randomUUID()}`;
    try {
      const blob = await put(key, "health-check", {
        // Health checks also need explicit public access to satisfy Blob requirements.
        access: "public",
        contentType: "text/plain",
      });

      if (blob?.url) {
        try {
          await del(blob.url);
        } catch (deleteError) {
          console.warn("[blob-health-warning]", getErrorDetails(deleteError));
        }
      }

      return { ok: true, mode };
    } catch (error) {
      console.error("[blob-health-error]", getErrorDetails(error));
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, mode, error: message };
    }
  }

  return { ok: true, mode };
};

export { WORKSPACE_STORAGE_PROVIDER };
export type { StorageProvider };
