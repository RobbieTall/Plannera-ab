import OpenAI from "openai";
import { Prisma, WorkspaceSourceType } from "@prisma/client";

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
};

export async function indexWorkspaceSourceChunks({
  projectId,
  lgaCode,
  councilDocumentId,
  text,
  sourceType,
  metadata,
}: {
  projectId?: string;
  lgaCode?: string;
  councilDocumentId?: string | null;
  text: string;
  sourceType: WorkspaceSourceType;
  metadata?: WorkspaceSourceMetadata;
}) {
  const chunks = chunkText(text);
  if (!chunks.length) return { created: 0 } as const;

  const embeddings = await embedChunks(chunks);

  const created = await prisma.workspaceSourceChunk.createMany({
    data: chunks.map((chunk, index) => ({
      projectId: projectId ?? null,
      lgaCode: lgaCode ?? null,
      councilDocumentId: councilDocumentId ?? null,
      content: chunk,
      embedding: embeddings[index],
      sourceType,
      heading: metadata?.heading ?? null,
      metadata: metadata
        ? (metadata as unknown as Prisma.InputJsonValue)
        : undefined,
    })),
  });

  return { created: created.count } as const;
}

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
