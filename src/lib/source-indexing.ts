import OpenAI from "openai";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { saveFileToUploads } from "@/lib/storage";

const EMBEDDING_MODEL = "text-embedding-3-small";

const openAiClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  return new OpenAI({ apiKey });
};

const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();

export const chunkText = (text: string, chunkSize = 800, overlap = 120) => {
  const normalized = normalizeText(text);
  if (!normalized) return [] as string[];

  const words = normalized.split(/\s+/);
  const chunks: string[] = [];

  let start = 0;
  while (start < words.length) {
    const slice = words.slice(start, start + chunkSize);
    chunks.push(slice.join(" "));
    start += chunkSize - overlap;
  }

  return chunks;
};

const embedChunks = async (chunks: string[]) => {
  const client = openAiClient();
  const embeddings = await Promise.all(
    chunks.map((chunk) => client.embeddings.create({ model: EMBEDDING_MODEL, input: chunk })),
  );
  return embeddings.map((result) => result.data?.[0]?.embedding ?? []);
};

export const cosineSimilarity = (a: number[], b: number[]) => {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  const dot = a.reduce((sum, value, idx) => sum + value * (b[idx] ?? 0), 0);
  const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  if (!normA || !normB) return 0;
  return dot / (normA * normB);
};

export const indexWorkspaceSource = async ({
  text,
  metadata,
  projectId,
  uploadId,
  councilDocumentId,
  lgaCode,
  sourceType,
}: {
  text: string;
  metadata?: Record<string, unknown>;
  projectId?: string | null;
  uploadId?: string | null;
  councilDocumentId?: string | null;
  lgaCode?: string | null;
  sourceType: Prisma.WorkspaceSourceType;
}) => {
  const chunks = chunkText(text);
  if (!chunks.length) return { created: 0 } as const;

  const embeddings = await embedChunks(chunks);

  await prisma.$transaction(
    chunks.map((chunk, index) =>
      prisma.workspaceSourceChunk.create({
        data: {
          projectId: projectId ?? undefined,
          uploadId: uploadId ?? undefined,
          councilDocumentId: councilDocumentId ?? undefined,
          lgaCode: lgaCode ?? undefined,
          heading: metadata?.heading ?? undefined,
          content: chunk,
          embedding: embeddings[index],
          sourceType,
          metadata: metadata ? metadata : undefined,
        },
      }),
    ),
  );

  return { created: chunks.length } as const;
};

export const storeExternalFileAsUpload = async ({
  file,
  fileName,
}: {
  file: Blob;
  fileName: string;
}) => {
  const saved = await saveFileToUploads(new File([file], fileName, { type: file.type || "application/octet-stream" }));
  return saved;
};
