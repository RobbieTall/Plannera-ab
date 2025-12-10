import { prisma } from "@/lib/prisma";
import { extractQueryNumbers, type NumericMeta } from "./extract-numeric";
import { detectTopicTags } from "./topic-tags";
import type { DCPClause } from "@prisma/client";

const DEFAULT_LGA = "BYRON";

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const keywordScore = (queryTokens: string[], content: string) => {
  const contentTokens = tokenize(content);
  const tokenCounts = contentTokens.reduce<Record<string, number>>((acc, token) => {
    acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {});

  return queryTokens.reduce((score, token) => score + (tokenCounts[token] ? Math.min(tokenCounts[token], 3) * 2 : 0), 0);
};

const numericOverlapScore = (queryNumbers: number[], clauseNumbers: number[]) => {
  if (!queryNumbers.length || !clauseNumbers.length) return 0;
  const hasMatch = queryNumbers.some((q) => clauseNumbers.some((c) => Math.abs(c - q) < 0.01));
  return hasMatch ? 15 : 0;
};

const headingDepthScore = (depth?: number | null) => {
  if (!depth) return 8;
  return Math.max(0, 14 - depth * 2);
};

const toNumericMeta = (value: unknown): NumericMeta | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { numbers?: unknown; units?: unknown; labels?: unknown };
  if (!Array.isArray(candidate.numbers)) return null;
  return {
    numbers: candidate.numbers.filter((num): num is number => typeof num === "number"),
    units: Array.isArray(candidate.units)
      ? candidate.units.filter((unit): unit is string => typeof unit === "string")
      : [],
    labels: Array.isArray(candidate.labels)
      ? candidate.labels.filter((label): label is string => typeof label === "string")
      : [],
  };
};

export const searchDcpClauses = async (params: {
  query: string;
  lgaCode?: string;
  limit?: number;
}): Promise<DCPClause & { score: number }[]> => {
  const queryText = params.query.trim();
  if (!queryText) return [];

  const lgaCode = (params.lgaCode ?? DEFAULT_LGA).toUpperCase();
  const clauses = await prisma.dCPClause.findMany({
    where: { lgaCode },
    orderBy: [{ ref: "asc" }],
  });

  if (!clauses.length) return [];

  const queryTokens = tokenize(queryText);
  const queryTopics = detectTopicTags(queryText);
  const queryNumeric = extractQueryNumbers(queryText);

  return clauses
    .map((clause) => {
      const textForSearch = `${clause.headingPath.join(" ")} ${clause.bodyText}`;
      const baseKeyword = keywordScore(queryTokens, textForSearch);
      const topicMatch = clause.topicTags.some((tag) => queryTopics.includes(tag)) ? 20 : 0;
      const numericScore = numericOverlapScore(queryNumeric.numbers, toNumericMeta(clause.numericMeta)?.numbers || []);
      const depthScore = headingDepthScore(clause.depth);
      const score = baseKeyword + topicMatch + numericScore + depthScore;

      return { ...clause, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.ref && b.ref && a.ref !== b.ref) return a.ref.localeCompare(b.ref);
      return (a.title || "").localeCompare(b.title || "");
    })
    .slice(0, params.limit ?? 10);
};
