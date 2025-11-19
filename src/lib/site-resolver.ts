import type { SiteCandidate as BaseSiteCandidate } from "@/types/site";

export type SiteCandidate = BaseSiteCandidate;

export type ResolveSiteResult =
  | { status: "ok"; candidates: SiteCandidate[] }
  | { status: "property_search_failed"; error: string }
  | { status: "property_search_not_configured"; error: string };

type SiteResolverSource = "chat" | "site-search";

type RawSiteCandidate = Omit<SiteCandidate, "score">;

type PropertySearchConfig = {
  url: string;
  apiKey: string;
};

type PropertySearchResult = {
  status: number;
  normalizedQuery: string;
  candidates: RawSiteCandidate[];
};

type AddressParts = {
  normalizedText: string;
  normalizedStreet: string | null;
  houseNumber: string | null;
  streetPart: string | null;
  suburbPart: string | null;
  searchQuery: string;
};

const STREET_NORMALISATIONS: Record<string, string> = {
  rd: "road",
  road: "road",
  street: "street",
  st: "street",
  avenue: "avenue",
  ave: "avenue",
  boulevard: "boulevard",
  blvd: "boulevard",
  lane: "lane",
  ln: "lane",
  drive: "drive",
  dr: "drive",
  parade: "parade",
  pde: "parade",
  place: "place",
  pl: "place",
  terrace: "terrace",
  terr: "terrace",
  highway: "highway",
  hwy: "highway",
  circuit: "circuit",
  cct: "circuit",
  close: "close",
  court: "court",
  ct: "court",
  way: "way",
};

const NSW_STOP_WORDS = new Set([
  "nsw",
  "new",
  "south",
  "wales",
  "australia",
  "state",
]);

const MIN_PRIMARY_SCORE = 0.55;
const MIN_SECONDARY_SCORE = 0.5;
const MAX_RETURNED_CANDIDATES = 10;

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const normaliseWhitespace = (value: string) => value.replace(/[\n,]+/g, " ").replace(/\s+/g, " ").trim();

const normaliseToken = (token: string) => STREET_NORMALISATIONS[token] ?? token;

const buildAddressParts = (rawText: string): AddressParts => {
  const lowered = normaliseWhitespace(rawText.toLowerCase());
  if (!lowered) {
    return {
      normalizedText: "",
      normalizedStreet: null,
      houseNumber: null,
      streetPart: null,
      suburbPart: null,
      searchQuery: "",
    };
  }

  const tokens = lowered.split(" ").filter(Boolean);
  const normalizedTokens = tokens.map(normaliseToken);
  const normalizedText = normalizedTokens.join(" ");
  const hasNsw = normalizedTokens.some((token) => token === "nsw");
  const searchQuery = hasNsw ? normalizedText : `${normalizedText} nsw`;

  const firstToken = normalizedTokens[0];
  const houseNumber = firstToken && /^\d+[a-z]?$/.test(firstToken) ? firstToken : null;
  const remainder = normalizedTokens.slice(houseNumber ? 1 : 0);

  let suburbTokenCount = 0;
  for (let index = remainder.length - 1; index >= 0 && suburbTokenCount < 2; index -= 1) {
    const token = remainder[index];
    if (/^\d{4}$/.test(token)) {
      continue;
    }
    if (NSW_STOP_WORDS.has(token)) {
      continue;
    }
    suburbTokenCount += 1;
  }

  const suburbTokens = remainder.slice(remainder.length - suburbTokenCount);
  const streetTokens = remainder.slice(0, remainder.length - suburbTokens.length);
  const streetPart = streetTokens.join(" ").trim() || null;
  const suburbPart = suburbTokens.join(" ").trim() || null;
  const normalizedStreet = [houseNumber, streetPart].filter(Boolean).join(" ").trim() || null;

  return { normalizedText, normalizedStreet, houseNumber, streetPart, suburbPart, searchQuery };
};

const getPropertySearchConfig = (): PropertySearchConfig => {
  const url = process.env.NSW_PROPERTY_API_URL;
  const apiKey = process.env.NSW_PROPERTY_API_KEY;
  if (!url || !apiKey) {
    throw new Error("NSW property search API is not configured.");
  }
  return { url, apiKey };
};

const buildSearchUrl = (baseUrl: string, query: string, limit?: number) => {
  const url = new URL(baseUrl);
  const params = url.searchParams;
  const setParam = (key: string) => params.set(key, query);
  setParam("address");
  setParam("q");
  setParam("query");
  setParam("search");
  setParam("searchTerm");
  if (limit && limit > 0) {
    params.set("limit", String(limit));
    params.set("maxResults", String(limit));
  }
  return url;
};

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
};

const parseNumeric = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toSiteCandidateFromRecord = (record: Record<string, unknown>): RawSiteCandidate | null => {
  const formattedAddress =
    typeof record.formattedAddress === "string"
      ? record.formattedAddress
      : typeof record.address === "string"
        ? record.address
        : typeof record.fullAddress === "string"
          ? record.fullAddress
          : typeof record.displayAddress === "string"
            ? record.displayAddress
            : typeof record.propertyAddress === "string"
              ? record.propertyAddress
              : null;

  if (!formattedAddress) {
    return null;
  }

  const resolveId = (): string => {
    const candidates = [
      record.id,
      record.propertyId,
      record.parcelId,
      record.parcelIdentifier,
      record.titleReference,
      record.planNumber,
      record.plan,
      record.lotNumber,
    ];
    for (const value of candidates) {
      if (typeof value === "string" || typeof value === "number") {
        const label = String(value).trim();
        if (label) {
          return label;
        }
      }
    }
    return formattedAddress;
  };

  return {
    id: resolveId(),
    formattedAddress,
    lgaName:
      typeof record.lgaName === "string"
        ? record.lgaName
        : typeof record.localGovernmentArea === "string"
          ? record.localGovernmentArea
          : typeof record.localGovernmentAreaName === "string"
            ? record.localGovernmentAreaName
            : null,
    lgaCode:
      typeof record.lgaCode === "string"
        ? record.lgaCode
        : typeof record.localGovernmentAreaCode === "string"
          ? record.localGovernmentAreaCode
          : typeof record.lgaCodeNumber === "string"
            ? record.lgaCodeNumber
            : undefined,
    parcelId:
      typeof record.parcelId === "string"
        ? record.parcelId
        : typeof record.parcelIdentifier === "string"
          ? record.parcelIdentifier
          : typeof record.parcelNumber === "string"
            ? record.parcelNumber
            : undefined,
    lot:
      typeof record.lot === "string"
        ? record.lot
        : typeof record.lotNumber === "string"
          ? record.lotNumber
          : undefined,
    planNumber:
      typeof record.planNumber === "string"
        ? record.planNumber
        : typeof record.plan === "string"
          ? record.plan
          : typeof record.titleReference === "string"
            ? record.titleReference
            : undefined,
    zone: typeof record.zone === "string" ? record.zone : typeof record.zoning === "string" ? record.zoning : undefined,
    latitude: parseNumeric(record.latitude ?? record.lat ?? record.latititude),
    longitude: parseNumeric(record.longitude ?? record.lon ?? record.lng),
  };
};

const mapResultsToCandidates = (records: Record<string, unknown>[]) =>
  records
    .map((record) => toSiteCandidateFromRecord(record))
    .filter((candidate): candidate is RawSiteCandidate => Boolean(candidate));

const performPropertySearch = async (
  config: PropertySearchConfig,
  query: string,
  strategy: "primary" | "secondary",
  options?: { limit?: number },
): Promise<PropertySearchResult> => {
  const normalizedQuery = query.trim();
  const url = buildSearchUrl(config.url, normalizedQuery, options?.limit);
  const requestLabel = { strategy, query: normalizedQuery };
  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Ocp-Apim-Subscription-Key": config.apiKey,
      },
      cache: "no-store",
    });
    const bodyText = await response.text();
    if (!response.ok) {
      console.error("[site-resolver-error]", {
        ...requestLabel,
        status: response.status,
        body: bodyText.slice(0, 500),
      });
      throw new Error(`NSW property search failed (${response.status}).`);
    }
    const parsed = bodyText ? JSON.parse(bodyText) : null;
    const records: Record<string, unknown>[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { results?: Record<string, unknown>[] })?.results)
        ? ((parsed as { results: Record<string, unknown>[] }).results)
        : Array.isArray((parsed as { records?: Record<string, unknown>[] })?.records)
          ? ((parsed as { records: Record<string, unknown>[] }).records)
          : Array.isArray((parsed as { items?: Record<string, unknown>[] })?.items)
            ? ((parsed as { items: Record<string, unknown>[] }).items)
            : [];
    const candidates = mapResultsToCandidates(records);
    console.log("[site-resolver-response]", {
      ...requestLabel,
      status: response.status,
      matches: candidates.length,
    });
    return { status: response.status, normalizedQuery, candidates };
  } catch (error) {
    if ((error as Error)?.message?.includes("NSW property search failed")) {
      throw error;
    }
    console.error("[site-resolver-error]", { ...requestLabel, details: getErrorDetails(error) });
    throw new Error("NSW property search failed.");
  }
};

const normaliseStreetLabel = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }
  return normaliseWhitespace(value.toLowerCase())
    .replace(/\bnsw\b/g, " ")
    .replace(/\bnew\b|\bsouth\b|\bwales\b/g, " ")
    .replace(/\b\d{4}\b/g, " ")
    .split(" ")
    .map(normaliseToken)
    .filter(Boolean)
    .join(" ")
    .trim();
};

const levenshtein = (a: string, b: string) => {
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
};

const streetSimilarity = (inputStreet: string | null, candidateStreet: string) => {
  if (!inputStreet) {
    return candidateStreet ? 0.4 : 0;
  }
  const left = normaliseStreetLabel(inputStreet);
  const right = normaliseStreetLabel(candidateStreet);
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return 1;
  }
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  });
  const tokenScore = overlap / Math.max(leftTokens.size, rightTokens.size);
  const prefixBoost = right.startsWith(left) || left.startsWith(right) ? 0.2 : 0;
  const distance = levenshtein(left, right);
  const distanceScore = 1 - distance / Math.max(left.length, right.length);
  return clamp(tokenScore * 0.6 + distanceScore * 0.3 + prefixBoost);
};

const scoreCandidate = (candidate: RawSiteCandidate, parts: AddressParts) => {
  const candidateStreet = candidate.formattedAddress.split(",")[0] ?? candidate.formattedAddress;
  let score = streetSimilarity(parts.normalizedStreet ?? parts.normalizedText, candidateStreet);
  const addressLower = candidate.formattedAddress.toLowerCase();
  if (parts.houseNumber && addressLower.startsWith(parts.houseNumber)) {
    score += 0.15;
  }
  if (parts.suburbPart && addressLower.includes(parts.suburbPart)) {
    score += 0.1;
  }
  return clamp(score);
};

const scoreCandidates = (candidates: RawSiteCandidate[], parts: AddressParts) =>
  candidates
    .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, parts) }))
    .sort((a, b) => b.score - a.score);

const dedupeCandidates = (candidates: SiteCandidate[]) => {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) {
      return false;
    }
    seen.add(candidate.id);
    return true;
  });
};

const filterNswCandidates = (candidates: SiteCandidate[]) =>
  candidates.filter((candidate) => /nsw/i.test(candidate.formattedAddress) || Boolean(candidate.lgaName || candidate.lgaCode));

const buildSecondaryQueries = (parts: AddressParts) => {
  const queries = new Set<string>();
  if (parts.streetPart && parts.suburbPart) {
    queries.add(`${parts.streetPart} ${parts.suburbPart} nsw`);
  }
  if (parts.suburbPart) {
    queries.add(`${parts.suburbPart} nsw`);
  }
  if (parts.streetPart) {
    queries.add(`${parts.streetPart} nsw`);
  }
  return Array.from(queries);
};

const resolveWithSecondarySearch = async (
  config: PropertySearchConfig,
  parts: AddressParts,
  baseline: SiteCandidate[],
): Promise<SiteCandidate[]> => {
  const queries = buildSecondaryQueries(parts);
  if (!queries.length) {
    return baseline;
  }

  for (const query of queries) {
    const pool = await performPropertySearch(config, query, "secondary", { limit: 50 });
    const scoredPool = filterNswCandidates(scoreCandidates(pool.candidates, parts)).filter(
      (candidate) => candidate.score >= MIN_SECONDARY_SCORE,
    );
    if (scoredPool.length) {
      return dedupeCandidates([...scoredPool, ...baseline]).slice(0, MAX_RETURNED_CANDIDATES);
    }
  }
  return baseline;
};

export const resolveSiteFromText = async (
  rawText: string,
  options?: { source?: SiteResolverSource },
): Promise<ResolveSiteResult> => {
  const parts = buildAddressParts(rawText);
  const source = options?.source ?? "unknown";
  console.log("[site-resolver-request]", { source, rawText, normalizedText: parts.normalizedText });

  if (!parts.normalizedText) {
    return { status: "ok", candidates: [] };
  }

  let config: PropertySearchConfig;
  try {
    config = getPropertySearchConfig();
  } catch (error) {
    console.error("[site-resolver-error]", { source, rawText, details: getErrorDetails(error) });
    return { status: "property_search_not_configured", error: "NSW property search isn’t configured." };
  }

  try {
    const primary = await performPropertySearch(config, parts.searchQuery, "primary", { limit: 20 });
    let candidates = filterNswCandidates(scoreCandidates(primary.candidates, parts)).filter(
      (candidate) => candidate.score >= MIN_PRIMARY_SCORE,
    );

    const topScore = candidates[0]?.score ?? 0;
    const needsSecondary = !candidates.length || topScore < 0.65;

    if (needsSecondary) {
      candidates = await resolveWithSecondarySearch(config, parts, candidates);
    }

    const finalCandidates = dedupeCandidates(candidates).slice(0, MAX_RETURNED_CANDIDATES);

    console.log("[site-resolver-result]", {
      source,
      rawText,
      candidates: finalCandidates.length,
      topCandidate: finalCandidates[0]?.formattedAddress,
      topScore: finalCandidates[0]?.score,
    });

    return { status: "ok", candidates: finalCandidates };
  } catch (error) {
    console.error("[site-resolver-error]", { source, rawText, details: getErrorDetails(error) });
    return { status: "property_search_failed", error: "NSW property search failed. Please try again." };
  }
};
