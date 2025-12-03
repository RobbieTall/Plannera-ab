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

const normaliseLgaCode = (value: string | null | undefined) =>
  value
    ?.toUpperCase()
    .replace(/\s+COUNCIL$/, "")
    .replace(/\s+SHIRE$/, "")
    .trim()
    .replace(/\s+/g, " ") ?? null;

const deriveLgaCode = (
  siteContext?: SiteContextSummary | null,
  fallbackLga?: string | null,
  instrumentSlug?: string | null,
) => {
  const candidates = [siteContext?.lgaCode, siteContext?.lgaName, fallbackLga];
  for (const candidate of candidates) {
    const normalized = normaliseLgaCode(candidate);
    if (!normalized) continue;
    return normalized;
  }

  if (instrumentSlug) {
    // Fall back to the LEP slug to keep the search aligned with how instruments are stored.
    return instrumentSlug;
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
      console.warn("[CHAT-LEP] LEP search failed", await response.text());
      return null;
    }
    return (await response.json()) as LepSearchResponse;
  } catch (error) {
    console.warn("[CHAT-LEP] LEP search threw", error);
    return null;
  }
};

const selectInstrumentWithClauses = (payload: LepSearchResponse | null) =>
  payload?.instruments?.find((instrument) => instrument.clauses?.length) ?? null;

const instrumentHasClauseCount = (instrument: LepSearchInstrument | undefined) =>
  Boolean(instrument && (instrument.clauses?.length || instrument.clauseCount));

export const getLepContextForProject = async (params: {
  requestOrigin: string;
  siteContext?: SiteContextSummary | null;
  fallbackLga?: string | null;
  instrumentSlug?: string | null;
}): Promise<LepContext | null> => {
  const rawLga = params.siteContext?.lgaName ?? params.fallbackLga ?? params.siteContext?.lgaCode ?? null;
  const lgaCode = deriveLgaCode(params.siteContext, params.fallbackLga, params.instrumentSlug);
  if (!lgaCode) {
    return null;
  }

  console.log("[CHAT-LEP] Site LGA raw", rawLga);
  console.log("[CHAT-LEP] Site LGA normalised", lgaCode);

  const initialResult = await fetchLepSearch({
    requestOrigin: params.requestOrigin,
    lga: lgaCode,
    instrument: params.instrumentSlug,
  });

  console.log(
    "[CHAT-LEP] Search response instruments",
    initialResult?.instruments?.map((instrument) => ({
      lga: instrument.lga,
      name: instrument.name,
      clauseCount: instrument.clauseCount ?? instrument.clauses?.length ?? 0,
    })) ?? [],
  );

  let instrumentWithClauses = selectInstrumentWithClauses(initialResult);
  let summaryResult = initialResult ??
    (await fetchLepSearch({ requestOrigin: params.requestOrigin, lga: lgaCode }));

  if (summaryResult && summaryResult !== initialResult) {
    console.log(
      "[CHAT-LEP] Summary search response instruments",
      summaryResult?.instruments?.map((instrument) => ({
        lga: instrument.lga,
        name: instrument.name,
        clauseCount: instrument.clauseCount ?? instrument.clauses?.length ?? 0,
      })) ?? [],
    );
  }

  if (!instrumentWithClauses && summaryResult?.instruments?.length) {
    const instrumentWithCount = summaryResult.instruments.find((instrument) => instrumentHasClauseCount(instrument));
    if (instrumentWithCount?.code || params.instrumentSlug) {
      const detailedResult = await fetchLepSearch({
        requestOrigin: params.requestOrigin,
        lga: lgaCode,
        instrument: instrumentWithCount?.code ?? params.instrumentSlug,
      });
      console.log(
        "[CHAT-LEP] Detailed search response instruments",
        detailedResult?.instruments?.map((instrument) => ({
          lga: instrument.lga,
          name: instrument.name,
          clauseCount: instrument.clauseCount ?? instrument.clauses?.length ?? 0,
        })) ?? [],
      );
      instrumentWithClauses = selectInstrumentWithClauses(detailedResult);
      summaryResult = detailedResult ?? summaryResult;
    }
  }

  if (!instrumentWithClauses) {
    console.warn(
      "[CHAT-LEP] No LEP clauses found for LGA",
      lgaCode,
      "falling back to generic guidance",
      {
        instrumentSlug: params.instrumentSlug,
        summaryCount: summaryResult?.instruments?.length ?? 0,
        hasClauseCount: Boolean(summaryResult?.instruments?.some((instrument) => instrumentHasClauseCount(instrument))),
      },
    );
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
