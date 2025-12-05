import OpenAI from "openai";

import { prisma } from "@/lib/prisma";
import { cosineSimilarity, chunkText } from "@/lib/source-indexing";

const EMBEDDING_MODEL = "text-embedding-3-small";

const ensureClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  return new OpenAI({ apiKey });
};

const embedQuery = async (query: string) => {
  const client = ensureClient();
  const result = await client.embeddings.create({ model: EMBEDDING_MODEL, input: query });
  return result.data?.[0]?.embedding ?? [];
};

const formatChunkPreview = (content: string) => {
  const words = chunkText(content, 80, 0)[0] ?? content.slice(0, 320);
  return words.length > 320 ? `${words.slice(0, 320)}…` : words;
};

export type RetrievedWorkspaceChunk = {
  id: string;
  heading?: string | null;
  content: string;
  sourceType: string;
  score: number;
};

export const findRelevantWorkspaceChunks = async ({
  projectId,
  lgaCode,
  query,
  limit = 8,
}: {
  projectId?: string | null;
  lgaCode?: string | null;
  query: string;
  limit?: number;
}): Promise<RetrievedWorkspaceChunk[]> => {
  const filters = [] as Parameters<typeof prisma.workspaceSourceChunk.findMany>[0]["where"][];
  if (projectId) {
    filters.push({ projectId });
  }
  if (lgaCode) {
    filters.push({ lgaCode });
  }

  if (!filters.length) return [];

  const chunks = await prisma.workspaceSourceChunk.findMany({
    where: { OR: filters },
    take: 100,
  });

  if (!chunks.length) return [];

  const queryEmbedding = await embedQuery(query);

  const scored = chunks
    .map((chunk) => ({
      id: chunk.id,
      heading: chunk.heading,
      content: formatChunkPreview(chunk.content),
      sourceType: chunk.sourceType,
      score: cosineSimilarity((chunk.embedding as number[]) ?? [], queryEmbedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((chunk) => chunk.score > 0);

  return scored;
};

export const buildWorkspaceSourcePrompt = (chunks: RetrievedWorkspaceChunk[]) => {
  if (!chunks.length) return null;
  const lines = chunks.map((chunk) => {
    const heading = chunk.heading ? `${chunk.heading}: ` : "";
    return `• [${chunk.sourceType}] ${heading}${chunk.content}`;
  });
  return `Relevant workspace and council sources:\n${lines.join("\n")}`;
};
