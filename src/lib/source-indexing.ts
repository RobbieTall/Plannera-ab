import OpenAI from "openai";
import type { Prisma, PrismaClient, WorkspaceSourceChunk } from "@prisma/client";

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

type WorkspaceSourceMetadata = {
  heading?: string | null;
  sourceUrl?: string | null;
  [key: string]: unknown;
};

type PrismaClientOrTransaction = PrismaClient | Prisma.TransactionClient;

const saveChunks = async ({
  prismaClient,
  chunks,
  embeddings,
  metadata,
  projectId,
  uploadId,
  councilDocumentId,
  lgaCode,
  sourceType,
}: {
  prismaClient: PrismaClientOrTransaction;
  chunks: string[];
  embeddings: number[][];
  metadata?: WorkspaceSourceMetadata;
  projectId?: string | null;
  uploadId?: string | null;
  councilDocumentId?: string | null;
  lgaCode?: string | null;
  sourceType: WorkspaceSourceChunk["sourceType"];
}) => {
  for (const [index, chunk] of chunks.entries()) {
    await prismaClient.workspaceSourceChunk.create({
      data: {
        projectId: projectId ?? undefined,
        uploadId: uploadId ?? undefined,
        councilDocumentId: councilDocumentId ?? undefined,
        lgaCode: lgaCode ?? undefined,
        heading: metadata?.heading ?? null,
        content: chunk,
        embedding: embeddings[index],
        sourceType,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }
};

export const indexWorkspaceSource = async ({
  text,
  metadata,
  projectId,
  uploadId,
  councilDocumentId,
  lgaCode,
  sourceType,
  prismaClient = prisma,
}: {
  text: string;
  metadata?: WorkspaceSourceMetadata;
  projectId?: string | null;
  uploadId?: string | null;
  councilDocumentId?: string | null;
  lgaCode?: string | null;
  sourceType: WorkspaceSourceChunk["sourceType"];
  prismaClient?: PrismaClientOrTransaction;
}) => {
  const chunks = chunkText(text);
  if (!chunks.length) return { created: 0 } as const;

  const embeddings = await embedChunks(chunks);

  await saveChunks({
    prismaClient,
    chunks,
    embeddings,
    metadata,
    projectId,
    uploadId,
    councilDocumentId,
    lgaCode,
    sourceType,
  });

  return { created: chunks.length } as const;
};

type PreparedWorkspaceChunk = {
  heading?: string | null;
  content: string;
  metadata?: WorkspaceSourceMetadata;
};

export const indexWorkspaceChunks = async ({
  chunks,
  metadata,
  projectId,
  uploadId,
  councilDocumentId,
  lgaCode,
  sourceType,
  prismaClient = prisma,
}: {
  chunks: PreparedWorkspaceChunk[];
  metadata?: WorkspaceSourceMetadata;
  projectId?: string | null;
  uploadId?: string | null;
  councilDocumentId?: string | null;
  lgaCode?: string | null;
  sourceType: WorkspaceSourceChunk["sourceType"];
  prismaClient?: PrismaClientOrTransaction;
}) => {
  const normalizedChunks = chunks
    .map((chunk) => ({ ...chunk, content: normalizeText(chunk.content) }))
    .filter((chunk) => chunk.content.length > 0);

  if (!normalizedChunks.length) return { created: 0 } as const;

  const embeddings = await embedChunks(normalizedChunks.map((chunk) => chunk.content));

  const combinedMetadata = normalizedChunks.map((chunk) => {
    if (!metadata && !chunk.metadata) return undefined;
    return {
      ...(metadata ?? {}),
      ...(chunk.metadata ?? {}),
    } as WorkspaceSourceMetadata;
  });

  for (const [index, chunk] of normalizedChunks.entries()) {
    await prismaClient.workspaceSourceChunk.create({
      data: {
        projectId: projectId ?? undefined,
        uploadId: uploadId ?? undefined,
        councilDocumentId: councilDocumentId ?? undefined,
        lgaCode: lgaCode ?? undefined,
        heading: chunk.heading ?? metadata?.heading ?? null,
        content: chunk.content,
        embedding: embeddings[index],
        sourceType,
        metadata: combinedMetadata[index]
          ? (combinedMetadata[index] as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  return { created: normalizedChunks.length } as const;
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
