import type { SiteContextSummary } from "@/types/site";

export type LepClauseContext = { ref: string; title: string | null; text: string };
export type LepContext = {
  lga: string;
  instrumentName: string;
  instrumentCode: string;
  clauses: LepClauseContext[];
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

const deriveLgaCode = (siteContext?: SiteContextSummary | null, fallbackLga?: string | null) => {
  if (siteContext?.lgaCode) return siteContext.lgaCode;
  if (siteContext?.lgaName) return siteContext.lgaName;
  if (fallbackLga) return fallbackLga;

  const normalizedName = siteContext?.lgaName?.toLowerCase() ?? fallbackLga?.toLowerCase() ?? "";
  if (normalizedName.includes("byron")) {
    // Temporary mapping until full LGA code coverage is available
    return "BYRON";
  }

  return null;
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
}): Promise<LepContext | null> => {
  const lgaCode = deriveLgaCode(params.siteContext, params.fallbackLga);
  if (!lgaCode) {
    return null;
  }

  const initialResult = await fetchLepSearch({
    requestOrigin: params.requestOrigin,
    lga: lgaCode,
    instrument: params.instrumentSlug,
  });

  let instrumentWithClauses = selectInstrumentWithClauses(initialResult);
  let summaryResult = initialResult;

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

  if (!instrumentWithClauses || !instrumentWithClauses.clauses?.length) {
    return null;
  }

  return {
    lga: params.siteContext?.lgaName ?? params.fallbackLga ?? lgaCode,
    instrumentName: instrumentWithClauses.name,
    instrumentCode: instrumentWithClauses.code,
    clauses: instrumentWithClauses.clauses.slice(0, MAX_LEP_CLAUSES).map((clause) => ({
      ref: clause.ref,
      title: clause.title,
      text: truncateText(clause.text),
    })),
  } satisfies LepContext;
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
