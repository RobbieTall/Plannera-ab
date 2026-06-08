import { InstrumentType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { searchDcpClauses } from "@/lib/dcp/search";
import { buildLepInstrumentFilter } from "@/lib/lep/lep-search";

export type StatutorySourceType = "cited" | "inferred" | "unresolved";

export type StatutoryDcpClause = {
  clauseNumber: string;
  heading: string;
  body: string;
};

export type StatutoryLepClause = {
  clauseKey: string;
  heading: string;
  value: string;
  instrumentName?: string;
};

export type StatutoryContextBlock = {
  dcpClauses: StatutoryDcpClause[];
  lepClauses: StatutoryLepClause[];
  promptBlock: string;
  sourceTypes: StatutorySourceType[];
};

const DEFAULT_DCP_CLAUSE_LIMIT = 5;
const DEFAULT_LEP_CLAUSE_LIMIT = 3;
const DCP_PROMPT_EXCERPT_LENGTH = 300;
const LEP_PROMPT_EXCERPT_LENGTH = 600;

const truncateForPrompt = (value: string, maxLength: number) => {
  const compacted = value.replace(/\s+/g, " ").trim();
  if (compacted.length <= maxLength) return compacted;
  return `${compacted.slice(0, maxLength).trimEnd()}…`;
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);

const scoreText = (queryTokens: string[], text: string) => {
  const haystack = text.toLowerCase();
  return queryTokens.reduce(
    (score, token) => score + (haystack.includes(token) ? 1 : 0),
    0,
  );
};

const buildEmptyPromptBlock = (lgaCode: string) =>
  `--- RETRIEVED PLANNING CONTROLS FOR ${lgaCode.toUpperCase()} ---\nLEP PROVISIONS:\nNo LEP clauses were found for this query in the retrieved planning controls.\nDCP PROVISIONS:\nNo DCP clauses were found for this query in the retrieved planning controls.\n--- END RETRIEVED PLANNING CONTROLS ---`;

const formatPromptBlock = (params: {
  lgaCode: string;
  dcpClauses: StatutoryDcpClause[];
  lepClauses: StatutoryLepClause[];
}) => {
  const lepLines = params.lepClauses.length
    ? params.lepClauses.map((clause) => {
        const instrument = clause.instrumentName
          ? `${clause.instrumentName} `
          : "";
        return `- [${instrument}${clause.clauseKey}]: ${clause.heading} — ${truncateForPrompt(clause.value, LEP_PROMPT_EXCERPT_LENGTH)}`;
      })
    : [
        "No LEP clauses were found for this query in the retrieved planning controls.",
      ];

  const dcpLines = params.dcpClauses.length
    ? params.dcpClauses.map(
        (clause) =>
          `- [${clause.clauseNumber || "DCP clause"}] ${clause.heading}: ${truncateForPrompt(clause.body, DCP_PROMPT_EXCERPT_LENGTH)}`,
      )
    : [
        "No DCP clauses were found for this query in the retrieved planning controls.",
      ];

  return [
    `--- RETRIEVED PLANNING CONTROLS FOR ${params.lgaCode.toUpperCase()} ---`,
    "LEP PROVISIONS:",
    ...lepLines,
    "DCP PROVISIONS:",
    ...dcpLines,
    "--- END RETRIEVED PLANNING CONTROLS ---",
  ].join("\n");
};

const findLepClauses = async (params: {
  lgaCode: string;
  query: string;
  limit: number;
}): Promise<StatutoryLepClause[]> => {
  const instrumentWhere = buildLepInstrumentFilter(params.lgaCode);
  const instruments = await prisma.instrument.findMany({
    where: { AND: [instrumentWhere, { instrumentType: InstrumentType.LEP }] },
    select: {
      id: true,
      name: true,
      clauses: {
        where: { isCurrent: true },
        select: { clauseKey: true, title: true, bodyText: true },
        take: Math.max(params.limit * 8, params.limit),
      },
    },
    take: 5,
  });

  const queryTokens = tokenize(params.query);
  return instruments
    .flatMap((instrument) =>
      instrument.clauses.map((clause) => ({
        clauseKey: clause.clauseKey,
        heading: clause.title?.trim() || clause.clauseKey,
        value: clause.bodyText,
        instrumentName: instrument.name,
        score: scoreText(
          queryTokens,
          `${clause.clauseKey} ${clause.title ?? ""} ${clause.bodyText}`,
        ),
      })),
    )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.clauseKey.localeCompare(b.clauseKey, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    })
    .slice(0, params.limit)
    .map(({ score, ...clause }) => {
      void score;
      return clause;
    });
};

export async function buildStatutoryContextBlock(params: {
  lgaCode: string;
  query: string;
  maxDcpClauses?: number;
  maxLepClauses?: number;
}): Promise<StatutoryContextBlock> {
  const lgaCode = params.lgaCode.trim().toUpperCase();
  const query = params.query.trim();
  const maxDcpClauses = params.maxDcpClauses ?? DEFAULT_DCP_CLAUSE_LIMIT;
  const maxLepClauses = params.maxLepClauses ?? DEFAULT_LEP_CLAUSE_LIMIT;

  if (!lgaCode || !query) {
    return {
      dcpClauses: [],
      lepClauses: [],
      promptBlock: buildEmptyPromptBlock(lgaCode || "UNKNOWN LGA"),
      sourceTypes: ["unresolved"],
    };
  }

  const [dcpResults, lepClauses] = await Promise.all([
    searchDcpClauses({ query, lgaCode, limit: maxDcpClauses }),
    findLepClauses({ lgaCode, query, limit: maxLepClauses }),
  ]);

  console.log("[statutory-context] lepClauses found:", lepClauses.length);

  const dcpClauses = dcpResults.slice(0, maxDcpClauses).map((clause) => ({
    clauseNumber: clause.ref?.trim() || clause.id,
    heading:
      clause.title?.trim() ||
      clause.headingPath?.[clause.headingPath.length - 1]?.trim() ||
      clause.ref?.trim() ||
      "DCP clause",
    body: clause.bodyText,
  }));

  const sourceTypes: StatutorySourceType[] =
    dcpClauses.length || lepClauses.length ? ["cited"] : ["unresolved"];

  return {
    dcpClauses,
    lepClauses,
    promptBlock: formatPromptBlock({ lgaCode, dcpClauses, lepClauses }),
    sourceTypes,
  };
}
