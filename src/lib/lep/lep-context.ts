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

const getInstrumentClauseCount = (instrument: LepSearchInstrument | null | undefined) =>
  instrument?.clauseCount ?? instrument?.clauses?.length ?? 0;

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

const fetchInstrumentClauses = async (params: {
  requestOrigin: string;
  lga: string;
  instrumentId: string;
  instrumentCode: string;
}): Promise<LepClauseContext[] | null> => {
  const clauseUrl = new URL("/api/lep/search", params.requestOrigin);
  clauseUrl.searchParams.set("lga", params.lga);
  clauseUrl.searchParams.set("instrument", params.instrumentCode);

  console.log("[CHAT-LEP] Fetching clauses from", `${clauseUrl.pathname}${clauseUrl.search}`);

  try {
    const response = await fetch(clauseUrl, { method: "GET" });
    if (!response.ok) {
      console.warn("[CHAT-LEP] Clause fetch failed", await response.text());
      return null;
    }

    const payload = (await response.json()) as LepSearchResponse;
    const instrument = payload.instruments.find(
      (record) => record.id === params.instrumentId || record.code === params.instrumentCode,
    );
    const clauses = instrument?.clauses ?? [];

    console.log("[CHAT-LEP] Received", clauses.length, "clauses");

    if (!clauses.length) {
      console.warn("[CHAT-LEP] Clause fetch returned empty for instrument", params.instrumentId);
    }

    return clauses;
  } catch (error) {
    console.warn("[CHAT-LEP] Clause fetch threw", error);
    return null;
  }
};

const selectInstrumentWithMostClauses = (payload: LepSearchResponse | null) => {
  if (!payload?.instruments?.length) return null;

  return payload.instruments.reduce<{
    instrument: LepSearchInstrument | null;
    count: number;
  }>(
    (acc, instrument) => {
      const clauseCount = getInstrumentClauseCount(instrument);
      if (clauseCount > acc.count) {
        return { instrument, count: clauseCount };
      }
      return acc;
    },
    { instrument: null, count: 0 },
  ).instrument;
};

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
      clauseCount: getInstrumentClauseCount(instrument),
    })) ?? [],
  );

  const summaryResult = initialResult ??
    (await fetchLepSearch({ requestOrigin: params.requestOrigin, lga: lgaCode }));

  if (summaryResult && summaryResult !== initialResult) {
    console.log(
      "[CHAT-LEP] Summary search response instruments",
      summaryResult?.instruments?.map((instrument) => ({
        lga: instrument.lga,
        name: instrument.name,
        clauseCount: getInstrumentClauseCount(instrument),
      })) ?? [],
    );
  }

  const instrumentCandidate = selectInstrumentWithMostClauses(summaryResult);

  if (!instrumentCandidate) {
    console.warn("[CHAT-LEP] No LEP clauses found for LGA", lgaCode, "falling back to generic guidance");
    return null;
  }

  const clauseCount = getInstrumentClauseCount(instrumentCandidate);
  console.log(
    "[CHAT-LEP] Using instrument",
    instrumentCandidate.id,
    "with clauseCount",
    clauseCount,
  );

  if (!clauseCount) {
    console.warn("[CHAT-LEP] No clause count available for instrument", instrumentCandidate.id);
    return null;
  }

  const clauses = instrumentCandidate.clauses?.length
    ? instrumentCandidate.clauses
    : await fetchInstrumentClauses({
        requestOrigin: params.requestOrigin,
        lga: lgaCode,
        instrumentId: instrumentCandidate.id,
        instrumentCode: instrumentCandidate.code,
      });

  if (!clauses?.length) {
    console.warn(
      "[CHAT-LEP] No LEP clauses found for LGA",
      lgaCode,
      "falling back to generic guidance",
    );
    return null;
  }

  return {
    lga: params.siteContext?.lgaName ?? params.fallbackLga ?? lgaCode,
    instrumentName: instrumentCandidate.name,
    instrumentCode: instrumentCandidate.code,
    clauses: clauses.slice(0, MAX_LEP_CLAUSES).map((clause) => ({
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
