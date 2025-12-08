import OpenAI from "openai";

import { type Prisma, WorkspaceSourceChunk, WorkspaceSourceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizeCouncilLgaCode } from "@/lib/council/lga-normaliser";
import { cosineSimilarity, chunkText } from "@/lib/source-indexing";

const EMBEDDING_MODEL = "text-embedding-3-small";

const buildDummyEmbedding = (text: string) => {
  const slots = 12;
  const vector = Array<number>(slots).fill(0);
  text
    .toLowerCase()
    .split(/\W+/)
    .filter(Boolean)
    .forEach((token, index) => {
      const slot = index % slots;
      vector[slot] += Math.min(token.length, 12);
    });
  return vector;
};

const ensureClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (process.env.SKIP_EMBEDDINGS === "1") return null;
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  return new OpenAI({ apiKey });
};

const embedQuery = async (query: string) => {
  if (process.env.SKIP_EMBEDDINGS === "1") {
    return buildDummyEmbedding(query);
  }

  const client = ensureClient();
  if (!client) return buildDummyEmbedding(query);

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
  metadata?: WorkspaceSourceChunk["metadata"];
};

type WorkspaceSourceChunkWhere = Prisma.WorkspaceSourceChunkWhereInput;

export const COUNCIL_DCP_TYPES: WorkspaceSourceType[] = [WorkspaceSourceType.council_dcp, WorkspaceSourceType.dcp];

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
  allowedSourceTypes,
}: {
  projectId?: string | null;
  lgaCode?: string | null;
  lgaName?: string | null;
  query: string;
  limit?: number;
  allowedSourceTypes?: WorkspaceSourceType[];
}): Promise<WorkspaceSourceContext> => {
  const canonicalLgaCode = normalizeCouncilLgaCode(lgaCode ?? lgaName);
  const filters: WorkspaceSourceChunkWhere[] = [];

  const allowedTypes = allowedSourceTypes?.length ? new Set(allowedSourceTypes) : null;
  const includeUploads = !allowedTypes || allowedTypes.has(WorkspaceSourceType.upload);
  const allowedCouncilTypes = COUNCIL_DCP_TYPES.filter((type) => !allowedTypes || allowedTypes.has(type));
  const includeCouncilDcp = allowedCouncilTypes.length > 0;

  if (projectId && includeUploads) {
    filters.push({ projectId, sourceType: WorkspaceSourceType.upload });
  }
  if (canonicalLgaCode && includeCouncilDcp) {
    filters.push({ lgaCode: canonicalLgaCode, sourceType: { in: allowedCouncilTypes } });
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
      metadata: chunk.metadata,
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
  const parseMetadata = (metadata: RetrievedWorkspaceChunk["metadata"]) =>
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : null;

  const lines = chunks.map((chunk) => {
    const metadata = parseMetadata(chunk.metadata);
    const clauseKey = typeof metadata?.clauseKey === "string" ? metadata.clauseKey : null;
    const instrumentSlug = typeof metadata?.instrumentSlug === "string" ? metadata.instrumentSlug : null;
    const headingParts = [clauseKey, chunk.heading].filter(Boolean);
    const headingLabel = headingParts.length ? `${headingParts.join(" – ")}: ` : "";
    const sourceLabel = instrumentSlug ? `${instrumentSlug} · ` : "";
    return `• [${chunk.sourceType}] ${sourceLabel}${headingLabel}${chunk.content}`;
  });
  return `Relevant workspace and council sources:\n${lines.join("\n")}`;
};
