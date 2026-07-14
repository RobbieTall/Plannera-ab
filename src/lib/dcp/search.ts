import { prisma } from "@/lib/prisma";
import { extractQueryNumbers, type NumericMeta } from "./extract-numeric";
import { detectTopicTags } from "./topic-tags";
import type { DCPClause } from "@prisma/client";

export type ScoredDcpClause = DCPClause & { score: number };

const DEFAULT_LGA = "BYRON";
const NSW_ZONE_CODE_PATTERN = /\b(?:RU|R|E|MU|B|IN|SP|RE|C|W|DM)\d[A-Z]?\b/gi;

const COMMERCIAL_ZONE_TERMS = ["commercial centre", "local centre", "business", "retail", "shop", "office", "centre", "tourist", "visitor", "hotel", "motel", "serviced apartment"];
const RURAL_RESIDENTIAL_ONLY_TERMS = [
  "rural zone",
  "rural zones",
  "rural land",
  "rural boundary",
  "residential zone",
  "residential zones",
  "residential d1",
  "dual occupancy",
  "secondary dwelling",
  "bed and breakfast",
  "top-up housing",
  "top up housing",
];

const zoneParts = (zone?: string | null) => {
  const value = zone?.trim() ?? "";
  const code = value.match(NSW_ZONE_CODE_PATTERN)?.[0]?.toUpperCase() ?? null;
  const name = value
    .replace(NSW_ZONE_CODE_PATTERN, " ")
    .replace(/[–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return { code, name };
};

const explicitZoneCodes = (text: string) =>
  Array.from(new Set((text.match(NSW_ZONE_CODE_PATTERN) ?? []).map((zone) => zone.toUpperCase())));

const queryTargetsUnrelatedZone = (queryText: string, unrelatedZones: string[]) => {
  const lowerQuery = queryText.toLowerCase();
  return unrelatedZones.some((zone) => lowerQuery.includes(zone.toLowerCase()));
};

const zoneRelevanceScore = (params: { queryText: string; content: string; siteZone?: string | null }) => {
  const site = zoneParts(params.siteZone);
  if (!site.code && !site.name) return { score: 0, exclude: false };

  const content = params.content.toLowerCase();
  const [scopeText] = params.content.split("\n", 1);
  const scope = scopeText.toLowerCase();
  const scopeZones = explicitZoneCodes(scopeText);
  const zones = explicitZoneCodes(params.content);
  const unrelatedExplicitZones = site.code ? zones.filter((zone) => zone !== site.code) : zones;
  const matchesSiteCode = Boolean(site.code && zones.includes(site.code));
  const matchesSiteName = Boolean(site.name && content.includes(site.name));
  const scopeNamesAnotherZone = Boolean(site.code && scopeZones.length && !scopeZones.includes(site.code));
  const conflictingScopedUse = RURAL_RESIDENTIAL_ONLY_TERMS.some((term) => scope.includes(term));
  if ((scopeNamesAnotherZone || conflictingScopedUse) && (site.code === "E2" || site.code === "SP3" || site.name.includes("commercial") || site.name.includes("tourist"))) {
    return { score: -60, exclude: true };
  }
  const queryAsksAboutUnrelated = queryTargetsUnrelatedZone(params.queryText, unrelatedExplicitZones);

  if (unrelatedExplicitZones.length && !matchesSiteCode && !matchesSiteName && !queryAsksAboutUnrelated) {
    return { score: -60, exclude: true };
  }

  let score = 0;
  if (matchesSiteCode) score += 35;
  if (matchesSiteName) score += 25;
  const isCommercialOrTourist = site.code === "E2" || site.code === "SP3" || site.name.includes("commercial") || site.name.includes("tourist");
  if (isCommercialOrTourist && COMMERCIAL_ZONE_TERMS.some((term) => content.includes(term))) {
    score += 18;
  }
  if (isCommercialOrTourist && !matchesSiteCode && !matchesSiteName && RURAL_RESIDENTIAL_ONLY_TERMS.some((term) => content.includes(term))) {
    return { score: -60, exclude: true };
  }
  return { score, exclude: false };
};

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const keywordScore = (queryTokens: string[], content: string, weight = 2) => {
  const contentTokens = tokenize(content);
  const tokenCounts = contentTokens.reduce<Record<string, number>>((acc, token) => {
    acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {});

  return queryTokens.reduce((score, token) => score + (tokenCounts[token] ? Math.min(tokenCounts[token], 3) * weight : 0), 0);
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
  siteZone?: string | null;
}): Promise<ScoredDcpClause[]> => {
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
      const headingText = clause.headingPath.join(" ");
      const baseKeyword =
        keywordScore(queryTokens, headingText, 3) + keywordScore(queryTokens, clause.bodyText, 2);
      const matchingTopics = clause.topicTags.filter((tag) => queryTopics.includes(tag));
      const topicMatch = matchingTopics.length ? 12 + matchingTopics.length * 4 : 0;
      const numericScore = numericOverlapScore(queryNumeric.numbers, toNumericMeta(clause.numericMeta)?.numbers || []);
      const depthScore = headingDepthScore(clause.depth);
      const zoneScore = zoneRelevanceScore({
        queryText,
        siteZone: params.siteZone,
        content: `${headingText} ${clause.title ?? ""}
${clause.bodyText}`,
      });
      const score = baseKeyword + topicMatch + numericScore + depthScore + zoneScore.score;

      return { ...clause, score, excludedByZone: zoneScore.exclude };
    })
    .filter((clause) => !(clause as ScoredDcpClause & { excludedByZone?: boolean }).excludedByZone)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.ref && b.ref && a.ref !== b.ref) return a.ref.localeCompare(b.ref);
      return (a.title || "").localeCompare(b.title || "");
    })
    .slice(0, params.limit ?? 10);
};
