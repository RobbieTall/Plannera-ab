import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { extractQueryNumbers, type NumericMeta } from "@/lib/dcp/extract-numeric";
import { detectTopicTags } from "@/lib/dcp/topic-tags";

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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = (url.searchParams.get("query") || url.searchParams.get("q") || "").trim();
    const lgaCode = (url.searchParams.get("lga") || DEFAULT_LGA).toUpperCase();

    if (!query) {
      return NextResponse.json({ ok: false, error: "query_required" }, { status: 400 });
    }

    const clauses = await prisma.dCPClause.findMany({
      where: { lgaCode },
      orderBy: [{ ref: "asc" }],
    });

    const queryTokens = tokenize(query);
    const queryTopics = detectTopicTags(query);
    const queryNumeric = extractQueryNumbers(query);

    const scored = clauses
      .map((clause) => {
        const textForSearch = `${clause.headingPath.join(" ")} ${clause.bodyText}`;
        const baseKeyword = keywordScore(queryTokens, textForSearch);
        const topicMatch = clause.topicTags.some((tag) => queryTopics.includes(tag)) ? 20 : 0;
        const numericScore = numericOverlapScore(queryNumeric.numbers, toNumericMeta(clause.numericMeta)?.numbers || []);
        const headingScore = headingDepthScore(clause.depth);
        const score = baseKeyword + topicMatch + numericScore + headingScore;

        return {
          ref: clause.ref,
          title: clause.title,
          headingPath: clause.headingPath,
          bodyHtml: clause.bodyHtml,
          bodyText: clause.bodyText,
          topicTags: clause.topicTags,
          numericMeta: clause.numericMeta,
          depth: clause.depth,
          parentRef: clause.parentRef,
          score,
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.ref && b.ref && a.ref !== b.ref) return a.ref.localeCompare(b.ref);
        return (a.title || "").localeCompare(b.title || "");
      })
      .slice(0, 10);

    return NextResponse.json({ ok: true, count: scored.length, results: scored });
  } catch (error) {
    console.error("[dcp-search]", error);
    return NextResponse.json({ ok: false, error: "search_failed" }, { status: 500 });
  }
}
