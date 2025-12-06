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
  lgaCode: string | null;
  sourceType: WorkspaceSourceChunk["sourceType"];
  score: number;
};

type WorkspaceSourceChunkWhere = Prisma.WorkspaceSourceChunkWhereInput;

const COUNCIL_DCP_TYPES: WorkspaceSourceType[] = [WorkspaceSourceType.council_dcp, WorkspaceSourceType.dcp];

export type WorkspaceSourceContext = {
  canonicalLgaCode: string | null;
  hasCouncilDcp: boolean;
  councilDcpSampleHeadings: string[];
  perSourceTotals: Record<string, number>;
  chunks: RetrievedWorkspaceChunk[];
};

export const getWorkspaceSourceContext = async ({
  projectId,
  lgaCode,
  lgaName,
  query,
  limit = 8,
}: {
  projectId?: string | null;
  lgaCode?: string | null;
  lgaName?: string | null;
  query: string;
  limit?: number;
}): Promise<WorkspaceSourceContext> => {
  const canonicalLgaCode = normalizeCouncilLgaCode(lgaCode ?? lgaName);
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
      hasCouncilDcp: false,
      councilDcpSampleHeadings: [],
      perSourceTotals: {},
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
      hasCouncilDcp: false,
      councilDcpSampleHeadings: [],
      perSourceTotals: {},
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
      lgaCode: chunk.lgaCode,
      sourceType: chunk.sourceType,
      score: cosineSimilarity((chunk.embedding as number[]) ?? [], queryEmbedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const perSourceTotals = chunks.reduce<Record<string, number>>((acc, chunk) => {
    acc[chunk.sourceType] = (acc[chunk.sourceType] ?? 0) + 1;
    return acc;
  }, {});

  const sampleHeadings = councilChunks
    .map((chunk) => chunk.heading)
    .filter((heading): heading is string => Boolean(heading))
    .slice(0, 5);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[workspace-source-context]",
      "DCP debug",
      {
        canonicalLgaCode,
        hasCouncilDcp: councilChunks.length > 0,
        perSourceTotals,
        councilDcpSampleHeadings: sampleHeadings.slice(0, 5),
      },
    );
  }

  return {
    canonicalLgaCode,
    hasCouncilDcp: councilChunks.length > 0,
    councilDcpSampleHeadings: sampleHeadings,
    perSourceTotals,
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
