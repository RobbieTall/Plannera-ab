import { lookupLepInstruments, type LepSearchResponse } from "@/lib/lep/lep-search";
import type { SiteContextSummary } from "@/types/site";

import { findLocalNswLepBySlug, findLocalNswLepsByLga } from "./nsw-lep-registry";
import { resolveCanonicalNswLga } from "./nsw-lga-normaliser";

export type LepClauseContext = { ref: string; title: string | null; text: string };
export type LepContext = {
  lga: string;
  instrumentName: string;
  instrumentCode: string;
  clauses: LepClauseContext[];
};

export type LepContextResolution = {
  lepContext: LepContext | null;
  rawLga: string | null;
  normalisedLga: string | null;
  instruments: { id: string; lga: string; code: string; clauseCount?: number }[];
  chosenInstrumentId: string | null;
  lepClauseCount: number;
  usedFallback: boolean;
};

const MAX_LEP_CLAUSES = 20;
const MAX_CLAUSE_TEXT = 400;
const PRIORITY_KEYWORDS = ["acid sulfate soils", "acid sulphate soils"];

const truncateText = (value: string) =>
  value.length > MAX_CLAUSE_TEXT ? `${value.slice(0, MAX_CLAUSE_TEXT)}…` : value;

const normalise = (value: string | null | undefined) => value?.toLowerCase() ?? "";

const prioritiseClauses = <T extends { ref: string; title: string | null; text: string }>(
  clauses: T[],
) => {
  const sorted = [...clauses].sort((first, second) =>
    first.ref.localeCompare(second.ref, undefined, { numeric: true, sensitivity: "base" }),
  );

  const keywordMatches = sorted.filter((clause) =>
    PRIORITY_KEYWORDS.some((keyword) =>
      normalise(clause.title).includes(keyword) || normalise(clause.text).includes(keyword),
    ),
  );

  const ordered = [...keywordMatches, ...sorted];
  const deduped: T[] = [];
  const seen = new Set<string>();

  for (const clause of ordered) {
    if (seen.has(clause.ref)) continue;
    deduped.push(clause);
    seen.add(clause.ref);
  }

  const limit = Math.min(deduped.length, MAX_LEP_CLAUSES + keywordMatches.length);
  return deduped.slice(0, limit);
};

const deriveLgaCode = (
  siteContext?: SiteContextSummary | null,
  fallbackLga?: string | null,
  instrumentSlug?: string | null,
) => {
  const candidates = [siteContext?.lgaName, fallbackLga, siteContext?.lgaCode];

  for (const candidate of candidates) {
    const matches = findLocalNswLepsByLga(candidate);
    if (matches.length) {
      return (
        matches[0]?.details.canonicalLga ?? matches[0]?.details.lgaCode ?? resolveCanonicalNswLga(candidate)
      );
    }
  }

  if (instrumentSlug) {
    const registryMatch = findLocalNswLepBySlug(instrumentSlug);
    if (registryMatch?.details.canonicalLga) {
      return registryMatch.details.canonicalLga;
    }
    const slugDerived = resolveCanonicalNswLga(instrumentSlug.replace(/[-_]+/g, " "));
    if (slugDerived) {
      return slugDerived;
    }
  }

  return null;
};

const selectInstrumentWithClauses = (payload: LepSearchResponse | null) =>
  payload?.instruments?.find((instrument) => instrument.clauses?.length) ?? null;

export const getLepContextForProject = async (params: {
  siteContext?: SiteContextSummary | null;
  fallbackLga?: string | null;
  instrumentSlug?: string | null;
}): Promise<LepContextResolution> => {
  const rawLga = params.siteContext?.lgaName ?? params.fallbackLga ?? params.siteContext?.lgaCode ?? null;
  const lgaCode = deriveLgaCode(params.siteContext, params.fallbackLga, params.instrumentSlug);
  if (!lgaCode) {
    return {
      lepContext: null,
      rawLga,
      normalisedLga: null,
      instruments: [],
      chosenInstrumentId: null,
      lepClauseCount: 0,
      usedFallback: true,
    } satisfies LepContextResolution;
  }

  console.log("[lep-context] derived LGA for LEP search", {
    lgaCode,
    lgaName: params.siteContext?.lgaName ?? params.fallbackLga,
    instrumentSlug: params.instrumentSlug,
  });

  const registryMatches = lgaCode ? findLocalNswLepsByLga(lgaCode) : [];
  const preferredInstrumentSlugs = [
    ...(params.instrumentSlug ? [params.instrumentSlug] : []),
    ...registryMatches.map((entry) => entry.config.slug),
  ];

  const summaryResult = await lookupLepInstruments({ lga: lgaCode });

  const summaryCandidates = (summaryResult?.instruments ?? [])
    .slice()
    .sort((first, second) => (second.clauseCount ?? 0) - (first.clauseCount ?? 0))
    .map((instrument) => instrument.code);

  const clauseCountLookup = new Map(
    (summaryResult?.instruments ?? []).map((instrument) => [
      instrument.code,
      instrument.clauseCount ?? instrument.clauses?.length ?? 0,
    ] as const),
  );

  const candidateCodes = Array.from(new Set([...preferredInstrumentSlugs, ...summaryCandidates].filter(Boolean))).sort(
    (first, second) => (clauseCountLookup.get(second) ?? 0) - (clauseCountLookup.get(first) ?? 0),
  );

  let instrumentWithClauses: LepSearchResponse["instruments"][number] | null = null;

  for (const code of candidateCodes) {
    const detailedResult = await lookupLepInstruments({ lga: lgaCode, instrument: code });
    instrumentWithClauses = selectInstrumentWithClauses(detailedResult);
    if (instrumentWithClauses) break;
  }

  console.log("[lep-context] LEP search result", {
    summaryCount: summaryResult?.instruments?.length ?? 0,
    codes: summaryResult?.instruments?.map((instrument) => ({
      code: instrument.code,
      clauseCount: instrument.clauseCount,
      clausesLoaded: instrument.clauses?.length,
    })),
  });

  if (!instrumentWithClauses) {
    console.log("[lep-context] no LEP instrument with clauses returned", {
      lgaCode,
      instrumentSlug: params.instrumentSlug,
      summaryCount: summaryResult?.instruments?.length ?? 0,
    });
  }

  const lepContext = instrumentWithClauses?.clauses?.length
    ? ({
        lga: params.siteContext?.lgaName ?? params.fallbackLga ?? lgaCode,
        instrumentName: instrumentWithClauses.name,
        instrumentCode: instrumentWithClauses.code,
        clauses: prioritiseClauses(instrumentWithClauses.clauses).map((clause) => ({
          ref: clause.ref,
          title: clause.title,
          text: truncateText(clause.text),
        })),
      } satisfies LepContext)
    : null;

  const instrumentSummaries = (summaryResult?.instruments ?? []).map((instrument) => ({
    id: instrument.id,
    lga: instrument.lga,
    code: instrument.code,
    clauseCount: instrument.clauseCount ?? instrument.clauses?.length,
  } satisfies LepContextResolution["instruments"][number]));

  return {
    lepContext,
    rawLga,
    normalisedLga: lgaCode,
    instruments: instrumentSummaries,
    chosenInstrumentId: instrumentWithClauses?.id ?? null,
    lepClauseCount: instrumentWithClauses?.clauses?.length ?? 0,
    usedFallback: !lepContext,
  } satisfies LepContextResolution;
};

export const buildLepPromptMessage = (lepContext: LepContext | null) => {
  if (!lepContext?.clauses?.length) return null;

  const clauseLines = lepContext.clauses.map((clause) => {
    const title = clause.title ? `: ${clause.title}` : "";
    return `- Clause ${clause.ref}${title} – ${clause.text}`;
  });

  return [
    `You have access to the following Local Environmental Plan (LEP) clauses for this site’s LGA (${lepContext.lga}):`,
    ...clauseLines,
    "Use these clauses when answering zoning and permissibility questions.",
  ].join("\n");
};
