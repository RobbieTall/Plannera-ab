import type { SiteContextSummary } from "@/types/site";

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

type LepSearchInstrument = {
  id: string;
  lga: string;
  name: string;
  code: string;
  clauseCount?: number;
  clauses?: { id: string; ref: string; title: string | null; text: string }[];
};

type LepSearchResponse = { instruments: LepSearchInstrument[] };

const MAX_LEP_CLAUSES = 20;
const MAX_CLAUSE_TEXT = 400;

const truncateText = (value: string) =>
  value.length > MAX_CLAUSE_TEXT ? `${value.slice(0, MAX_CLAUSE_TEXT)}…` : value;

const LGA_SEARCH_MAP: Record<string, string> = {
  "byron": "byron",
  "byron shire": "byron",
  "byron shire council": "byron",
};

const normaliseLgaValue = (value: string | null | undefined) => value?.trim().toLowerCase() ?? null;

const deriveLgaCode = (
  siteContext?: SiteContextSummary | null,
  fallbackLga?: string | null,
  instrumentSlug?: string | null,
) => {
  const candidates = [siteContext?.lgaName, fallbackLga, siteContext?.lgaCode];
  let fallbackCandidate: string | null = null;

  for (const candidate of candidates) {
    const normalized = normaliseLgaValue(candidate);
    if (!normalized) continue;
    if (LGA_SEARCH_MAP[normalized]) {
      return LGA_SEARCH_MAP[normalized];
    }
    // If the LGA string already contains a known keyword, use the keyword so it matches instrument slugs/names.
    if (normalized.includes("byron")) {
      return "byron";
    }
    // Keep the first non-empty candidate as a fallback if we cannot normalise it.
    fallbackCandidate = fallbackCandidate ?? (candidate ?? null);
  }

  if (instrumentSlug) {
    // Fall back to the LEP slug to keep the search aligned with how instruments are stored.
    return instrumentSlug;
  }

  return fallbackCandidate;
};

const fetchLepSearch = async (params: {
  requestOrigin: string;
  lga: string;
  instrument?: string | null;
}): Promise<LepSearchResponse | null> => {
  const searchUrl = new URL("/api/lep/search", params.requestOrigin);
  searchUrl.searchParams.set("lga", params.lga);
  if (params.instrument) {
    searchUrl.searchParams.set("instrument", params.instrument);
  }

  try {
    const response = await fetch(searchUrl, { method: "GET" });
    if (response.status === 404) return null;
    if (!response.ok) {
      console.warn("[lep-context] LEP search failed", await response.text());
      return null;
    }
    return (await response.json()) as LepSearchResponse;
  } catch (error) {
    console.warn("[lep-context] LEP search threw", error);
    return null;
  }
};

const selectInstrumentWithClauses = (payload: LepSearchResponse | null) =>
  payload?.instruments?.find((instrument) => instrument.clauses?.length) ?? null;

export const getLepContextForProject = async (params: {
  requestOrigin: string;
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

  const initialResult = await fetchLepSearch({
    requestOrigin: params.requestOrigin,
    lga: lgaCode,
    instrument: params.instrumentSlug,
  });

  let instrumentWithClauses = selectInstrumentWithClauses(initialResult);
  let summaryResult = initialResult;

  console.log("[lep-context] LEP search result", {
    summaryCount: summaryResult?.instruments?.length ?? 0,
    codes: summaryResult?.instruments?.map((instrument) => ({
      code: instrument.code,
      clauseCount: instrument.clauseCount,
      clausesLoaded: instrument.clauses?.length,
    })),
  });

  if (!instrumentWithClauses) {
    summaryResult = summaryResult ??
      (await fetchLepSearch({ requestOrigin: params.requestOrigin, lga: lgaCode }));
    const firstInstrumentCode = summaryResult?.instruments?.[0]?.code;

    if (firstInstrumentCode) {
      const detailedResult = await fetchLepSearch({
        requestOrigin: params.requestOrigin,
        lga: lgaCode,
        instrument: firstInstrumentCode,
      });
      instrumentWithClauses = selectInstrumentWithClauses(detailedResult);
    }
  }

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
        clauses: instrumentWithClauses.clauses.slice(0, MAX_LEP_CLAUSES).map((clause) => ({
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
