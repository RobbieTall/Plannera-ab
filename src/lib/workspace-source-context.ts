import OpenAI from "openai";

import { Prisma, WorkspaceSourceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { cosineSimilarity, chunkText } from "@/lib/source-indexing";
import { resolveCouncilLgaCode } from "./dcp/council-lga-codes";

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
  content: string;
  sourceType: WorkspaceSourceType;
  lgaCode: string | null;
  heading: string | null;
  metadata: unknown;
  score: number;
};

type WorkspaceSourceChunkWhere = Prisma.WorkspaceSourceChunkWhereInput;

const INCLUDED_SOURCE_TYPES: WorkspaceSourceType[] = [
  WorkspaceSourceType.upload,
  WorkspaceSourceType.council_dcp,
  WorkspaceSourceType.dcp,
];

export const getWorkspaceSourceContext = async ({
  projectId,
  lgaCode,
  query,
  sourceTypes,
  limit = 8,
}: {
  projectId?: string | null;
  lgaCode?: string | null;
  query: string;
  sourceTypes?: WorkspaceSourceType[];
  limit?: number;
}): Promise<{
  canonicalLgaCode: string | null;
  chunks: RetrievedWorkspaceChunk[];
  hasCouncilDcp: boolean;
  totalChunks: number;
  perSourceTotals: Record<WorkspaceSourceType, number>;
}> => {
  const canonicalLgaCode = resolveCouncilLgaCode(lgaCode);

  const desiredSourceTypes = sourceTypes?.length ? sourceTypes : INCLUDED_SOURCE_TYPES;
  const sourceTypeFilter: WorkspaceSourceChunkWhere = {
    sourceType: { in: desiredSourceTypes },
  };

  const clauses: WorkspaceSourceChunkWhere[] = [];

  if (projectId) {
    clauses.push({ AND: [{ projectId }, sourceTypeFilter] });
  }

  if (canonicalLgaCode) {
    clauses.push({ AND: [{ lgaCode: canonicalLgaCode }, sourceTypeFilter] });
  }

  const where: WorkspaceSourceChunkWhere =
    clauses.length === 0 ? sourceTypeFilter : { OR: clauses };

  const chunks = await prisma.workspaceSourceChunk.findMany({
    where,
    take: 100,
  });

  const perSourceTotals = chunks.reduce(
    (acc, chunk) => {
      acc[chunk.sourceType] = (acc[chunk.sourceType] ?? 0) + 1;
      return acc;
    },
    {
      [WorkspaceSourceType.upload]: 0,
      [WorkspaceSourceType.council_dcp]: 0,
      [WorkspaceSourceType.dcp]: 0,
    } as Record<WorkspaceSourceType, number>,
  );

  const hasCouncilDcp = perSourceTotals[WorkspaceSourceType.council_dcp] > 0;

  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";

  if (!isProd) {
    console.log("[workspace-source-context]", {
      projectId,
      canonicalLgaCode,
      totals: perSourceTotals,
      hasCouncilDcp,
    });
  }

  if (!chunks.length) {
    return {
      canonicalLgaCode,
      chunks: [],
      hasCouncilDcp,
      totalChunks: 0,
      perSourceTotals,
    };
  }

  const queryEmbedding = await embedQuery(query);

  const scored = chunks
    .map((chunk) => ({
      id: chunk.id,
      heading: chunk.heading,
      lgaCode: chunk.lgaCode,
      metadata: chunk.metadata,
      content: formatChunkPreview(chunk.content),
      sourceType: chunk.sourceType,
      score: cosineSimilarity((chunk.embedding as number[]) ?? [], queryEmbedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((chunk) => chunk.score > 0);

  return {
    canonicalLgaCode,
    chunks: scored,
    hasCouncilDcp,
    totalChunks: chunks.length,
    perSourceTotals,
  };
};

export const summarizeBySourceType = (chunks: RetrievedWorkspaceChunk[]) =>
  chunks.reduce<Record<string, number>>((acc, chunk) => {
    const key = chunk.sourceType;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

export const buildWorkspaceSourcePrompt = (chunks: RetrievedWorkspaceChunk[]) => {
  if (!chunks.length) return null;
  const lines = chunks.map((chunk) => {
    const heading = chunk.heading ? `${chunk.heading}: ` : "";
    return `• [${chunk.sourceType}] ${heading}${chunk.content}`;
  });
  return `Relevant workspace and council sources:\n${lines.join("\n")}`;
};
