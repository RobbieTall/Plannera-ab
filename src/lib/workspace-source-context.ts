import OpenAI from "openai";

import { type Prisma, WorkspaceSourceChunk, WorkspaceSourceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizeCouncilLgaCode } from "@/lib/council/lga-normaliser";
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
  sourceType: WorkspaceSourceChunk["sourceType"];
  score: number;
};

type WorkspaceSourceChunkWhere = Prisma.WorkspaceSourceChunkWhereInput;

const COUNCIL_DCP_TYPES: WorkspaceSourceType[] = [WorkspaceSourceType.council_dcp, WorkspaceSourceType.dcp];

export type WorkspaceSourceContext = {
  canonicalLgaCode: string | null;
  councilDcp: {
    available: boolean;
    totalChunks: number;
    sampleHeadings: string[];
  };
  chunks: RetrievedWorkspaceChunk[];
};

export const getWorkspaceSourceContext = async ({
  projectId,
  lgaCode,
  query,
  limit = 8,
}: {
  projectId?: string | null;
  lgaCode?: string | null;
  query: string;
  limit?: number;
}): Promise<WorkspaceSourceContext> => {
  const canonicalLgaCode = normalizeCouncilLgaCode(lgaCode);
  const filters: WorkspaceSourceChunkWhere[] = [];

  if (projectId) {
    filters.push({ projectId, sourceType: WorkspaceSourceType.upload });
  }
  if (canonicalLgaCode) {
    filters.push({ lgaCode: canonicalLgaCode, sourceType: { in: COUNCIL_DCP_TYPES } });
  }

  if (!filters.length) {
    return {
      canonicalLgaCode,
      councilDcp: { available: false, totalChunks: 0, sampleHeadings: [] },
      chunks: [],
    };
  }

  const chunks = await prisma.workspaceSourceChunk.findMany({
    where: { OR: filters },
    take: 200,
  });

  if (!chunks.length) {
    return {
      canonicalLgaCode,
      councilDcp: { available: false, totalChunks: 0, sampleHeadings: [] },
      chunks: [],
    };
  }

  const councilChunks = chunks.filter(
    (chunk) => canonicalLgaCode && chunk.lgaCode === canonicalLgaCode && COUNCIL_DCP_TYPES.includes(chunk.sourceType),
  );

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

  const sampleHeadings = councilChunks
    .map((chunk) => chunk.heading)
    .filter((heading): heading is string => Boolean(heading))
    .slice(0, 5);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[workspace-source-context]",
      `canonicalLga=${canonicalLgaCode ?? "none"} councilDcpChunks=${councilChunks.length} sampleHeadings=${JSON.stringify(sampleHeadings)}`,
    );
  }

  return {
    canonicalLgaCode,
    councilDcp: {
      available: councilChunks.length > 0,
      totalChunks: councilChunks.length,
      sampleHeadings,
    },
    chunks: scored,
  };
};

export const findRelevantWorkspaceChunks = async (params: {
  projectId?: string | null;
  lgaCode?: string | null;
  query: string;
  limit?: number;
}): Promise<RetrievedWorkspaceChunk[]> => {
  const context = await getWorkspaceSourceContext(params);
  return context.chunks;
};

export const buildWorkspaceSourcePrompt = (chunks: RetrievedWorkspaceChunk[]) => {
  if (!chunks.length) return null;
  const lines = chunks.map((chunk) => {
    const heading = chunk.heading ? `${chunk.heading}: ` : "";
    return `• [${chunk.sourceType}] ${heading}${chunk.content}`;
  });
  return `Relevant workspace and council sources:\n${lines.join("\n")}`;
};
