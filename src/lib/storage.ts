import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

export type SavedFile = {
  url: string;
  path: string;
  mimeType: string;
  size: number;
};

const ensureUploadsDir = async () => {
  await mkdir(UPLOADS_DIR, { recursive: true });
};

export async function saveFileToUploads(file: File): Promise<SavedFile> {
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
}
