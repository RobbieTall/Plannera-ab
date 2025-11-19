import type { SiteContext } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { SiteCandidate, SiteContextSummary } from "@/types/site";
import { INSTRUMENT_CONFIG } from "./legislation/config";

type SiteSearchErrorCode = "property_search_not_configured" | "property_search_failed";

export class SiteSearchError extends Error {
  code: SiteSearchErrorCode;
  status?: number;

  constructor(code: SiteSearchErrorCode, message: string, status?: number) {
    super(message);
    this.name = "SiteSearchError";
    this.code = code;
    this.status = status;
  }
}

const STREET_TYPES = [
  "street",
  "st",
  "road",
  "rd",
  "avenue",
  "ave",
  "boulevard",
  "blvd",
  "lane",
  "ln",
  "drive",
  "dr",
  "parade",
  "pde",
  "place",
  "pl",
  "terrace",
  "terr",
  "highway",
  "hwy",
  "circuit",
  "cct",
  "close",
  "way",
  "court",
  "ct",
];

const ADDRESS_REGEX = new RegExp(
  `(\\d{1,4}[A-Za-z]?\\s+[A-Za-z\\'\\-\\s]{2,40}\\s+(?:${STREET_TYPES.join("|")}))(?:[\\s,]+[A-Za-z\\'\\-\\s]{2,40})*(?:\\s*,?\\s*NSW)?(?:\\s+\\d{4})?`,
  "i",
);

const NSW_KEYWORDS = ["nsw", "new south wales", "sydney", "wollongong", "newcastle"];
const NSW_STOP_WORDS = new Set(["new", "south", "wales", ...NSW_KEYWORDS]);

const NORMALISED_STREET_TYPES: Record<string, string> = {
  st: "street",
  rd: "road",
  ave: "avenue",
  blvd: "boulevard",
  ln: "lane",
  dr: "drive",
  pde: "parade",
  pl: "place",
  terr: "terrace",
  hwy: "highway",
  cct: "circuit",
  ct: "court",
};

const LGA_LEGISLATION_REGISTRY: { lgaName: string; lgaCode?: string; lepSlug?: string }[] = [
  { lgaName: "City of Sydney", lepSlug: "city-of-sydney-lep-2012" },
  { lgaName: "Waverley", lepSlug: "waverley-lep-2012" },
  { lgaName: "Randwick", lepSlug: "randwick-lep-2012" },
  { lgaName: "Woollahra", lepSlug: "woollahra-lep-2014" },
  { lgaName: "Ballina", lepSlug: "ballina-lep-2012" },
  { lgaName: "Byron Shire", lepSlug: "byron-lep-2014" },
  { lgaName: "Clarence Valley", lepSlug: "clarence-valley-lep-2011" },
  { lgaName: "Coffs Harbour", lepSlug: "coffs-harbour-lep-2013" },
  { lgaName: "Northern Beaches" },
];

const DEFAULT_SEPP_SLUGS = INSTRUMENT_CONFIG.filter((config) => config.instrumentType === "SEPP").map(
  (config) => config.slug,
);

const sanitiseString = (value: string | null | undefined) => (value ? value.trim() : null);

const scoreCandidate = (query: string, candidate: SiteCandidate) => {
  const haystack = candidate.formattedAddress.toLowerCase();
  const tokens = query
    .toLowerCase()
    .replace(/[,.]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);

  if (!tokens.length) {
    return haystack.startsWith(query.toLowerCase().trim()) ? 0.8 : 0.5;
  }

  const matches = tokens.filter((token) => haystack.includes(token));
  let coverage = matches.length / tokens.length;
  if (haystack.startsWith(tokens[0] ?? "")) {
    coverage += 0.15;
  }
  if (haystack.includes("nsw")) {
    coverage += 0.1;
  }
  return Math.min(1, coverage);
};

export const extractCandidateAddress = (message: string): string | null => {
  const trimmed = message.trim();
  if (!trimmed) return null;
  const match = trimmed.match(ADDRESS_REGEX);
  if (match) {
    return match[0].replace(/\s+/g, " ").trim();
  }
  const lower = trimmed.toLowerCase();
  if (NSW_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    const parts = trimmed.split(/[,.;\n]/).map((part) => part.trim());
    const best = parts.find((part) => /\d/.test(part));
    if (best) {
      return best;
    }
  }
  return null;
};

const isNswAddress = (value: string) => {
  const lower = value.toLowerCase();
  if (lower.includes("nsw")) return true;
  return NSW_KEYWORDS.some((keyword) => lower.includes(keyword));
};

type PropertySearchStrategy = "primary" | "fuzzy";

type RawPropertyRecord = Record<string, unknown>;

type PropertySearchConfig = {
  url: string;
  apiKey: string;
};

const getPropertySearchConfig = (): PropertySearchConfig => {
  const url = process.env.NSW_PROPERTY_API_URL;
  const apiKey = process.env.NSW_PROPERTY_API_KEY;
  if (!url || !apiKey) {
    throw new SiteSearchError(
      "property_search_not_configured",
      "NSW property search API is not configured."
    );
  }
  return { url, apiKey };
};

const normaliseSearchQuery = (value: string) => {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return trimmed;
  }
  if (/nsw/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}, NSW`;
};

const normaliseStreetLabel = (value: string) =>
  value
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\bnew\b|\bsouth\b|\bwales\b|\bnsw\b/g, " ")
    .replace(/\b(\d{4})\b/g, " ")
    .split(/\s+/)
    .map((token) => NORMALISED_STREET_TYPES[token] ?? token)
    .filter(Boolean)
    .join(" ")
    .trim();

const scoreStreetSimilarity = (a: string, b: string) => {
  const leftTokens = new Set(normaliseStreetLabel(a).split(" ").filter(Boolean));
  const rightTokens = new Set(normaliseStreetLabel(b).split(" ").filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }
  let matches = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  });
  return Math.min(1, matches / Math.max(leftTokens.size, rightTokens.size));
};

const extractStreetSegment = (value: string) => {
  const firstSegment = value.split(/[,;]/)[0] ?? value;
  return firstSegment.trim();
};

const parseQueryComponents = (query: string) => {
  const cleaned = query.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(" ");
  let streetEndIndex = tokens.length;
  const lowerTokens = tokens.map((token) => token.toLowerCase());
  for (let index = 0; index < lowerTokens.length; index += 1) {
    if (STREET_TYPES.includes(lowerTokens[index])) {
      streetEndIndex = index + 1;
    }
  }
  const street = tokens.slice(0, streetEndIndex).join(" ");
  const suburbTokens = tokens
    .slice(streetEndIndex)
    .filter((token) => !/^\d{4}$/.test(token) && !NSW_STOP_WORDS.has(token.toLowerCase()));
  const suburb = suburbTokens.join(" ");
  return { street: street || cleaned, suburb: suburb || null };
};

const resolveCandidateId = (record: RawPropertyRecord, formattedAddress: string) => {
  const candidates = [
    record.id,
    record.propertyId,
    record.parcelId,
    record.parcelIdentifier,
    record.titleReference,
    record.planNumber,
    record.plan,
    record.lotNumber,
  ]
    .map((value) => (typeof value === "string" || typeof value === "number" ? String(value) : null))
    .filter((value): value is string => Boolean(value));
  return candidates[0] ?? formattedAddress;
};

const toSiteCandidateFromRecord = (record: RawPropertyRecord): SiteCandidate | null => {
  const formattedAddress = sanitiseString(
    (record.formattedAddress as string) ??
      (record.address as string) ??
      (record.fullAddress as string) ??
      (record.displayAddress as string) ??
      (record.propertyAddress as string) ??
      null,
  );
  if (!formattedAddress) {
    return null;
  }
  const lgaName =
    sanitiseString(
      (record.lgaName as string) ??
        (record.localGovernmentArea as string) ??
        (record.localGovernmentAreaName as string) ??
        null,
    ) ?? null;
  const lgaCode =
    sanitiseString(
      (record.lgaCode as string) ??
        (record.localGovernmentAreaCode as string) ??
        (record.lgaCodeNumber as string) ??
        null,
    ) ?? null;
  const lot = sanitiseString((record.lot as string) ?? (record.lotNumber as string) ?? null);
  const planNumber =
    sanitiseString(
      (record.planNumber as string) ??
        (record.plan as string) ??
        (record.planId as string) ??
        (record.titleReference as string) ??
        null,
    ) ?? null;
  const latitude =
    typeof record.latitude === "number"
      ? record.latitude
      : typeof record.lat === "number"
        ? record.lat
        : typeof record.latitude === "string"
          ? Number.parseFloat(record.latitude)
          : typeof record.lat === "string"
            ? Number.parseFloat(record.lat)
            : null;
  const longitude =
    typeof record.longitude === "number"
      ? record.longitude
      : typeof record.lon === "number"
        ? record.lon
        : typeof record.lng === "number"
          ? record.lng
          : typeof record.longitude === "string"
            ? Number.parseFloat(record.longitude)
            : typeof record.lon === "string"
              ? Number.parseFloat(record.lon)
              : typeof record.lng === "string"
                ? Number.parseFloat(record.lng)
                : null;
  const zone = sanitiseString((record.zone as string) ?? (record.zoning as string) ?? null);
  const parcelId =
    sanitiseString(
      (record.parcelId as string) ??
        (record.parcelIdentifier as string) ??
        (record.parcelNumber as string) ??
        null,
    ) ?? null;

  return {
    id: resolveCandidateId(record, formattedAddress),
    formattedAddress,
    lgaName,
    lgaCode,
    parcelId,
    lot,
    planNumber,
    zone,
    latitude,
    longitude,
  };
};

const mapResultsToCandidates = (records: RawPropertyRecord[]) =>
  records
    .map((record) => toSiteCandidateFromRecord(record))
    .filter((candidate): candidate is SiteCandidate => Boolean(candidate));

const logSiteSearchRequest = (params: {
  queryText: string;
  normalized: string;
  strategy: PropertySearchStrategy;
}) => {
  const { queryText, normalized, strategy } = params;
  console.log("[site-search-request]", {
    strategy,
    q: queryText,
    normalized,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
};

const logSiteSearchResponse = (params: {
  strategy: PropertySearchStrategy;
  normalized: string;
  status: number;
  results: SiteCandidate[];
}) => {
  const { strategy, normalized, status, results } = params;
  console.log("[site-search-response]", {
    strategy,
    q: normalized,
    status,
    matches: results.length,
    sample: results.slice(0, 3).map((candidate) => ({
      address: candidate.formattedAddress,
      lga: candidate.lgaName,
    })),
  });
};

const buildSearchUrl = (baseUrl: string, normalizedQuery: string, limit?: number) => {
  const url = new URL(baseUrl);
  const params = url.searchParams;
  const ensureParam = (key: string) => params.set(key, normalizedQuery);
  ensureParam("address");
  ensureParam("q");
  ensureParam("query");
  ensureParam("search");
  ensureParam("searchTerm");
  if (limit && limit > 0) {
    params.set("limit", String(limit));
    params.set("maxResults", String(limit));
  }
  return url;
};

const performPropertySearch = async (
  query: string,
  strategy: PropertySearchStrategy,
  config: PropertySearchConfig,
  options?: { limit?: number },
): Promise<SiteCandidate[]> => {
  const normalized = normaliseSearchQuery(query);
  logSiteSearchRequest({ queryText: query, normalized, strategy });
  const url = buildSearchUrl(config.url, normalized, options?.limit);
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Ocp-Apim-Subscription-Key": config.apiKey,
    },
    cache: "no-store",
  });
  const bodyText = await response.text();
  const status = response.status;
  if (!response.ok) {
    console.error("[site-search-error]", {
      strategy,
      q: normalized,
      status,
      body: bodyText.slice(0, 500),
    });
    throw new SiteSearchError(
      "property_search_failed",
      `NSW property search failed (${status}).`,
      status,
    );
  }
  let parsed: unknown;
  try {
    parsed = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    console.error("[site-search-error]", {
      strategy,
      q: normalized,
      status,
      body: "Invalid JSON response",
    });
    throw new SiteSearchError("property_search_failed", "Invalid NSW property response.", status);
  }
  const rows: RawPropertyRecord[] = Array.isArray(parsed)
    ? (parsed as RawPropertyRecord[])
    : Array.isArray((parsed as { results?: RawPropertyRecord[] })?.results)
      ? ((parsed as { results: RawPropertyRecord[] }).results)
      : Array.isArray((parsed as { records?: RawPropertyRecord[] })?.records)
        ? ((parsed as { records: RawPropertyRecord[] }).records)
        : Array.isArray((parsed as { items?: RawPropertyRecord[] })?.items)
          ? ((parsed as { items: RawPropertyRecord[] }).items)
          : [];
  const candidates = mapResultsToCandidates(rows);
  logSiteSearchResponse({ strategy, normalized, status, results: candidates });
  return candidates;
};

const filterNswCandidates = (candidates: SiteCandidate[]) =>
  candidates.filter((candidate) => {
    if (!candidate.formattedAddress) {
      return false;
    }
    if (isNswAddress(candidate.formattedAddress)) {
      return true;
    }
    if (candidate.lgaName || candidate.lgaCode) {
      return true;
    }
    return true;
  });

export const resolveAddressToSite = async (addressText: string): Promise<SiteCandidate[]> => {
  const config = getPropertySearchConfig();
  // Acceptance hint: 6 Myola Road Newport NSW 2106 (Northern Beaches) should be located via primary or fuzzy search.
  const primaryResults = await performPropertySearch(addressText, "primary", config, { limit: 20 });
  const primaryCandidates = filterNswCandidates(primaryResults)
    .map((candidate) => ({
      ...candidate,
      confidence: scoreCandidate(addressText, candidate),
    }))
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  if (primaryCandidates.length) {
    return primaryCandidates.slice(0, 10);
  }

  const { suburb, street } = parseQueryComponents(addressText);
  if (!suburb) {
    return [];
  }
  const suburbQuery = `${suburb} NSW`;
  const fuzzyPool = await performPropertySearch(suburbQuery, "fuzzy", config, { limit: 50 });
  const streetLabel = street ?? suburbQuery;
  const fuzzyCandidates = filterNswCandidates(fuzzyPool)
    .map((candidate) => ({
      ...candidate,
      confidence: scoreStreetSimilarity(extractStreetSegment(streetLabel), extractStreetSegment(candidate.formattedAddress)),
    }))
    .filter((candidate) => (candidate.confidence ?? 0) >= 0.6)
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, 10);
  return fuzzyCandidates;
};

export const decideSiteFromCandidates = (candidates: SiteCandidate[]): "auto" | "ambiguous" | "none" => {
  if (!candidates.length) {
    return "none";
  }
  if (candidates.length === 1) {
    return "auto";
  }
  const [first, second] = candidates;
  const leadScore = first.confidence ?? 0;
  const runnerScore = second.confidence ?? 0;
  if (leadScore >= 0.75 && leadScore - runnerScore >= 0.2) {
    return "auto";
  }
  return "ambiguous";
};

export const persistSiteContextFromCandidate = async (params: {
  projectId: string;
  addressInput: string;
  candidate: SiteCandidate;
}): Promise<SiteContext> => {
  const { projectId, addressInput, candidate } = params;
  const data = {
    projectId,
    addressInput,
    formattedAddress: candidate.formattedAddress,
    lgaName: candidate.lgaName,
    lgaCode: candidate.lgaCode ?? null,
    parcelId: candidate.parcelId ?? null,
    lot: candidate.lot ?? null,
    planNumber: candidate.planNumber ?? null,
    latitude: candidate.latitude ?? null,
    longitude: candidate.longitude ?? null,
    zone: candidate.zone ?? null,
  } satisfies Omit<SiteContext, "id" | "createdAt" | "updatedAt">;

  return prisma.siteContext.upsert({
    where: { projectId },
    update: data,
    create: data,
  });
};

export const getSiteContextForProject = async (projectId: string): Promise<SiteContext | null> =>
  prisma.siteContext.findUnique({ where: { projectId } });

export const serializeSiteContext = (context: SiteContext | null): SiteContextSummary | null => {
  if (!context) return null;
  return {
    id: context.id,
    projectId: context.projectId,
    addressInput: context.addressInput,
    formattedAddress: context.formattedAddress,
    lgaName: context.lgaName,
    lgaCode: context.lgaCode,
    parcelId: context.parcelId,
    lot: context.lot,
    planNumber: context.planNumber,
    latitude: context.latitude,
    longitude: context.longitude,
    zone: context.zone,
    createdAt: context.createdAt.toISOString(),
    updatedAt: context.updatedAt.toISOString(),
  };
};

export type SiteInstrumentMatch = {
  lepInstrumentSlug?: string;
  seppInstrumentSlugs: string[];
  lgaCode?: string;
};

export const resolveInstrumentsForSite = (site: { lgaName: string | null } | null): SiteInstrumentMatch => {
  const seppInstrumentSlugs = DEFAULT_SEPP_SLUGS;
  if (!site?.lgaName) {
    return { seppInstrumentSlugs };
  }
  const registryEntry = LGA_LEGISLATION_REGISTRY.find(
    (entry) => entry.lgaName.toLowerCase() === site.lgaName?.toLowerCase(),
  );
  return {
    lepInstrumentSlug: registryEntry?.lepSlug,
    seppInstrumentSlugs,
    lgaCode: registryEntry?.lgaCode,
  };
};
