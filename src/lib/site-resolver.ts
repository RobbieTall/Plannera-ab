import type { SiteCandidate } from "@/types/site";

export type SiteResolverSource = "chat" | "site-search" | "site-suggest";
export type SiteDecision = "auto" | "ambiguous" | "none";

export type SiteResolverResult =
  | {
      status: "ok";
      source: SiteResolverSource;
      normalizedQuery: string;
      candidates: SiteCandidate[];
      decision: SiteDecision;
    }
  | {
      status: "property_search_failed" | "property_search_not_configured";
      message: string;
      provider?: SiteResolverProvider;
      details?: Record<string, unknown>;
    };

export type SiteResolverProvider = "google" | "nsw-point";

export type SiteResolverConfigStatus =
  | {
      status: "ok";
      ok: boolean;
      provider: SiteResolverProvider;
      env_ok?: boolean;
      google_status?: string;
      predictions_count?: number;
      error_message?: string | null;
    }
  | { status: "missing_env"; missing: string[] };

type SiteSearchErrorCode = "property_search_not_configured" | "property_search_failed";

const getErrorDetails = (error: unknown) => {
  if (error instanceof SiteSearchError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      provider: error.provider,
      details: error.details,
    };
  }
  if (error instanceof Error) {
    return { message: error.message, name: error.name, stack: error.stack };
  }
  return { message: String(error) };
};

export class SiteSearchError extends Error {
  code: SiteSearchErrorCode;
  status?: number;
  details?: Record<string, unknown>;
  provider?: SiteResolverProvider;

  constructor(
    code: SiteSearchErrorCode,
    message: string,
    options?: { status?: number; details?: Record<string, unknown>; provider?: SiteResolverProvider },
  ) {
    super(message);
    this.name = "SiteSearchError";
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;
    this.provider = options?.provider;
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

const sanitiseString = (value: string | null | undefined) => (value ? value.trim() : null);

const scoreCandidate = (query: string, candidate: SiteCandidate) => {
  const haystack = candidate.formattedAddress.toLowerCase();
  const tokens = query
    .toLowerCase()
    .replace(/[,.]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .map((token) => NORMALISED_STREET_TYPES[token] ?? token);

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

  const streetSimilarity = scoreStreetSimilarity(query, candidate.formattedAddress);
  return Math.min(1, Math.max(coverage, streetSimilarity));
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

type PropertySearchResult = {
  normalized: string;
  status: number;
  candidates: SiteCandidate[];
};

type GoogleConfig = { enabled: true; key: string } | { enabled: false; missing: string[] };

export const getGoogleConfig = (): GoogleConfig => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (key) {
    return { enabled: true, key };
  }
  return { enabled: false, missing: ["GOOGLE_MAPS_API_KEY"] };
};

export async function getSiteResolverConfigStatus(): Promise<SiteResolverConfigStatus> {
  const googleConfig = getGoogleConfig();
  const requiredEnv = ["NSW_PROPERTY_API_URL", "NSW_PROPERTY_API_KEY"] as const;
  const missingPropertyEnv = requiredEnv.filter((key) => !process.env[key]);

  if (googleConfig.enabled) {
    try {
      const probe = await requestGoogleAutocomplete("health-check", { key: googleConfig.key });
      const suggestionsCount = Array.isArray((probe.payload as GooglePlacesResponse | null)?.suggestions)
        ? (probe.payload as GooglePlacesResponse).suggestions!.length
        : 0;
      const envOk = probe.googleStatus === "OK" || probe.googleStatus === "ZERO_RESULTS";

      return {
        status: "ok",
        ok: true,
        provider: "google",
        env_ok: envOk,
        google_status: probe.googleStatus,
        error_message: probe.googleErrorMessage,
        predictions_count: suggestionsCount,
      };
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : String(error);
      return {
        status: "ok",
        ok: true,
        provider: "google",
        env_ok: false,
        google_status: "REQUEST_FAILED",
        error_message: fallbackMessage,
        predictions_count: 0,
      };
    }
  }

  if (missingPropertyEnv.length === 0) {
    return { status: "ok", ok: true, provider: "nsw-point" };
  }

  return { status: "missing_env", missing: [...googleConfig.missing, ...missingPropertyEnv] };
}

const getPropertySearchConfig = (): PropertySearchConfig => {
  const url = process.env.NSW_PROPERTY_API_URL;
  const apiKey = process.env.NSW_PROPERTY_API_KEY;
  if (!url || !apiKey) {
    throw new SiteSearchError(
      "property_search_not_configured",
      "NSW property search API is not configured.",
    );
  }
  return { url, apiKey };
};

const normaliseAddressInput = (value: string) => value.trim().replace(/\s+/g, " ");

const normaliseSearchQuery = (value: string) => {
  const trimmed = normaliseAddressInput(value);
  if (!trimmed) {
    return trimmed;
  }
  if (/nsw/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}, NSW`;
};

const normaliseForGoogleSearch = (value: string) => {
  const trimmed = normaliseAddressInput(value);
  if (!trimmed) {
    return trimmed;
  }

  const tokens = trimmed
    .split(/\s+/)
    .map((token) => NORMALISED_STREET_TYPES[token.toLowerCase()] ?? token)
    .filter(Boolean);
  const normalized = tokens.join(" ");
  if (/nsw/i.test(normalized)) {
    return normalized;
  }
  return `${normalized} NSW`;
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
  if (typeof limit === "number") {
    params.set("limit", String(limit));
    params.set("top", String(limit));
    params.set("pageSize", String(limit));
  }
  return url;
};

const fetchPropertySearch = async (
  queryText: string,
  strategy: PropertySearchStrategy,
  config: PropertySearchConfig,
  options?: { limit?: number },
): Promise<PropertySearchResult> => {
  const normalized = normaliseSearchQuery(queryText);
  const url = buildSearchUrl(config.url, normalized, options?.limit);
  logSiteSearchRequest({ queryText, normalized, strategy });
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Ocp-Apim-Subscription-Key": config.apiKey,
      },
      cache: "no-store",
    });
  } catch (networkError) {
    console.error("[site-search-error]", {
      strategy,
      q: normalized,
      message: "Failed to reach NSW property search API",
      details: getErrorDetails(networkError),
    });
    throw new SiteSearchError("property_search_failed", "NSW property search failed.");
  }
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
      { status },
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
    throw new SiteSearchError("property_search_failed", "Invalid NSW property response.", { status });
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
  return { normalized, status, candidates };
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

type GoogleAutocompleteSuggestion = {
  placePrediction?: {
    place?: string;
    placeId?: string;
    text?: { text?: string };
  };
};

type GoogleAutocompleteResult = {
  predictions: { description: string; place_id: string }[];
  googleStatus: string;
  googleErrorMessage: string | null;
  suggestionsCount: number;
};

type GoogleAddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};
export type GooglePlacesResponse = {
  suggestions?: GoogleAutocompleteSuggestion[];
};

type GooglePlacesErrorResponse = { error?: { status?: string; message?: string; code?: number } };

const GOOGLE_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";

const GOOGLE_AUTOCOMPLETE_FIELD_MASK =
  "suggestions.placePrediction.place,suggestions.placePrediction.placeId,suggestions.placePrediction.text";

export const requestGoogleAutocomplete = async (
  queryText: string,
  config: { key: string },
): Promise<{
  payload: GooglePlacesResponse | GooglePlacesErrorResponse | null;
  status: number;
  ok: boolean;
  googleStatus: string;
  googleErrorMessage: string | null;
}> => {
  const body = {
    input: queryText,
    includedRegionCodes: ["AU"],
  };
  console.log("[site-resolver-google-request]", {
    provider: "google",
    source: "autocomplete",
    body,
  });
  let response: Response;
  try {
    response = await fetch(GOOGLE_AUTOCOMPLETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": config.key,
        "X-Goog-FieldMask": GOOGLE_AUTOCOMPLETE_FIELD_MASK,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[site-resolver-error]", {
      provider: "google",
      q: queryText,
      source: "autocomplete",
      message: "Failed to reach Google Places Autocomplete",
      details: getErrorDetails(error),
    });
    throw new SiteSearchError("property_search_failed", "Google Places request failed.", {
      provider: "google",
      details: { stage: "network" },
    });
  }

  const status = response.status;
  const bodyText = await response.text();
  let payload: GooglePlacesResponse | GooglePlacesErrorResponse | null = null;
  try {
    payload = bodyText ? (JSON.parse(bodyText) as GooglePlacesResponse | GooglePlacesErrorResponse) : null;
  } catch (error) {
    console.error("[site-resolver-error]", {
      provider: "google",
      q: queryText,
      source: "autocomplete",
      status,
      message: "Invalid Google Places response",
      details: getErrorDetails(error),
    });
    throw new SiteSearchError("property_search_failed", "Invalid Google Places response.", {
      status,
      provider: "google",
      details: { body: bodyText.slice(0, 500) },
    });
  }

  const errorPayload = (payload as GooglePlacesErrorResponse | null)?.error;
  const googleStatus = response.ok
    ? Array.isArray((payload as GooglePlacesResponse | null)?.suggestions) &&
        (payload as GooglePlacesResponse).suggestions!.length > 0
      ? "OK"
      : "ZERO_RESULTS"
    : errorPayload?.status === "PERMISSION_DENIED"
      ? "REQUEST_DENIED"
      : errorPayload?.status ?? (status === 403 ? "REQUEST_DENIED" : `HTTP_${status}`);

  const googleErrorMessage = errorPayload?.message ?? null;

  return { payload, status, ok: response.ok, googleStatus, googleErrorMessage };
};

const extractPredictionPlaceId = (prediction: GoogleAutocompleteSuggestion["placePrediction"]): string | null => {
  if (!prediction) return null;
  if (prediction.placeId) return prediction.placeId;
  if (prediction.place) {
    const parts = prediction.place.split("/");
    const last = parts[parts.length - 1];
    return last || prediction.place;
  }
  return null;
};

const fetchGoogleAutocomplete = async (
  queryText: string,
  config: { key: string },
): Promise<GoogleAutocompleteResult> => {
  const { payload, status: httpStatus, ok, googleStatus, googleErrorMessage } =
    await requestGoogleAutocomplete(queryText, config);

  const suggestions = Array.isArray((payload as GooglePlacesResponse | null)?.suggestions)
    ? (payload as GooglePlacesResponse).suggestions ?? []
    : [];

  if (!ok) {
    console.error("[site-resolver-error]", {
      provider: "google",
      q: queryText,
      source: "autocomplete",
      status: httpStatus,
      message: "Failed to reach Google Places Autocomplete",
    });
    throw new SiteSearchError("property_search_failed", "Google Places request failed.", {
      status: httpStatus,
      provider: "google",
      details: { googleStatus, googleErrorMessage },
    });
  }

  if (googleStatus === "OK") {
    const predictions = suggestions
      .map((suggestion) => {
        const prediction = suggestion.placePrediction;
        const description = prediction?.text?.text ?? null;
        const placeId = extractPredictionPlaceId(prediction);
        if (!description || !placeId) return null;
        return { description, place_id: placeId } as const;
      })
      .filter(
        (
          prediction,
        ): prediction is {
          description: string;
          place_id: string;
        } => Boolean(prediction),
      );

    console.info("[site-resolver-google-response]", {
      provider: "google",
      status: googleStatus,
      suggestions: suggestions.length,
      predictions: predictions.length,
    });

    return { predictions, googleStatus, googleErrorMessage, suggestionsCount: suggestions.length };
  }

  if (googleStatus === "ZERO_RESULTS") {
    console.info("[site-resolver-google-response]", {
      provider: "google",
      status: googleStatus,
      suggestions: suggestions.length,
      predictions: 0,
    });
    return {
      predictions: [] as { description: string; place_id: string }[],
      googleStatus,
      googleErrorMessage,
      suggestionsCount: suggestions.length,
    };
  }

  console.warn("[site-resolver-google-error]", {
    status: googleStatus,
    error_message: googleErrorMessage,
    provider: "google",
  });

  throw new SiteSearchError(
    "property_search_failed",
    `Google Places returned an error (${googleStatus}).`,
    {
      status: httpStatus,
      provider: "google",
      details: { googleStatus, googleErrorMessage },
    },
  );
};

const extractGoogleLgaName = (components: GoogleAddressComponent[]) => {
  const preferredTypes = ["administrative_area_level_2", "locality", "administrative_area_level_3"] as const;
  for (const type of preferredTypes) {
    const match = components.find((component) => component.types?.includes(type));
    if (match?.long_name) return match.long_name;
    if (match?.short_name) return match.short_name;
  }
  return null;
};

const geocodePlaceId = async (placeId: string, config: { key: string }) => {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", config.key);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const status = response.status;
  const bodyText = await response.text();
  if (!response.ok) {
    console.error("[site-resolver-error]", {
      provider: "google",
      placeId,
      source: "geocode",
      status,
      message: "Failed to reach Google Geocoding API",
    });
    throw new SiteSearchError("property_search_failed", "Google Geocoding request failed.", {
      status,
      provider: "google",
    });
  }

  let payload: {
    status?: string;
    results?: {
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      address_components?: GoogleAddressComponent[];
    }[];
    error_message?: string;
  } | null = null;
  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch (error) {
    console.error("[site-resolver-error]", {
      provider: "google",
      placeId,
      source: "geocode",
      status,
      message: "Invalid Google Geocoding response",
      details: getErrorDetails(error),
    });
    throw new SiteSearchError("property_search_failed", "Invalid Google Geocoding response.", {
      status,
      provider: "google",
      details: { body: bodyText.slice(0, 500) },
    });
  }

  const googleStatus = payload?.status ?? "UNKNOWN_ERROR";
  if (googleStatus === "ZERO_RESULTS") {
    return null;
  }
  if (googleStatus !== "OK") {
    console.warn("[site-resolver-google-error]", {
      status: googleStatus,
      error_message: payload?.error_message,
      provider: "google",
    });
    throw new SiteSearchError(
      "property_search_failed",
      `Google Geocoding returned an error (${googleStatus}).`,
      {
        status,
        provider: "google",
        details: { googleStatus, googleErrorMessage: payload?.error_message ?? null },
      },
    );
  }

  const firstResult = payload?.results?.[0];
  if (!firstResult) return null;
  const latitude = typeof firstResult.geometry?.location?.lat === "number" ? firstResult.geometry.location.lat : null;
  const longitude = typeof firstResult.geometry?.location?.lng === "number" ? firstResult.geometry.location.lng : null;
  const formattedAddress = firstResult.formatted_address ?? null;
  const lgaName = firstResult.address_components
    ? extractGoogleLgaName(firstResult.address_components)
    : null;
  return { formattedAddress, latitude, longitude, lgaName };
};

const resolveSiteWithGoogle = async (
  addressText: string,
  config: { key: string },
  options?: { source?: SiteResolverSource; limit?: number },
): Promise<{ candidates: SiteCandidate[]; normalizedQuery: string; suggestionsCount: number; googleStatus: string }> => {
  const source = options?.source ?? "chat";
  const normalizedQuery = normaliseForGoogleSearch(addressText);
  console.log("[site-resolver-request]", { provider: "google", q: normalizedQuery, source });
  if (!normalizedQuery) {
    return { candidates: [], normalizedQuery, suggestionsCount: 0, googleStatus: "ZERO_RESULTS" };
  }
  const { predictions, suggestionsCount, googleStatus } = await fetchGoogleAutocomplete(normalizedQuery, config);

  if (googleStatus === "ZERO_RESULTS" || suggestionsCount === 0) {
    console.info("[site-resolver-google-empty]", {
      provider: "google",
      q: normalizedQuery,
      source,
      suggestions: suggestionsCount,
    });
    return { candidates: [], normalizedQuery, suggestionsCount, googleStatus };
  }
  const filteredPredictions = predictions.filter((prediction) =>
    prediction.description ? isNswAddress(prediction.description) : false,
  );
  const rankedPredictions = (filteredPredictions.length ? filteredPredictions : predictions).slice(0, options?.limit ?? 10);

  const resolvedCandidates: SiteCandidate[] = [];
  for (const prediction of rankedPredictions) {
    if (!prediction.description || !prediction.place_id) continue;
    let geocoded: { formattedAddress: string | null; latitude: number | null; longitude: number | null; lgaName: string | null } | null = null;
    try {
      geocoded = await geocodePlaceId(prediction.place_id, config);
    } catch (error) {
      console.error("[site-resolver-error]", { provider: "google", stage: "geocode", ...getErrorDetails(error) });
    }

    const formattedAddress = geocoded?.formattedAddress ?? prediction.description;
    const candidate: SiteCandidate = {
      id: prediction.place_id,
      formattedAddress,
      lgaName: geocoded?.lgaName ?? null,
      latitude: geocoded?.latitude ?? null,
      longitude: geocoded?.longitude ?? null,
    };
    const confidenceScore = scoreCandidate(normalizedQuery, candidate) || 1;
    resolvedCandidates.push({ ...candidate, confidence: confidenceScore });
  }

  const sortedCandidates = resolvedCandidates.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  console.log("[site-resolver-result]", {
    provider: "google",
    q: normalizedQuery,
    source,
    candidates: sortedCandidates.length,
  });

  return { candidates: sortedCandidates, normalizedQuery, suggestionsCount, googleStatus };
};

const resolveAddressToSite = async (
  addressText: string,
  options?: { source?: SiteResolverSource; limit?: number },
): Promise<{ candidates: SiteCandidate[]; normalizedQuery: string; status: number | null }> => {
  const source = options?.source ?? "chat";
  console.log("[site-resolver-request]", { provider: "nsw-point", q: addressText, source });
  let normalizedQuery = normaliseSearchQuery(addressText);
  let status: number | null = null;
  try {
    const config = getPropertySearchConfig();
    const primaryResults = await performPropertySearch(addressText, "primary", config, { limit: options?.limit ?? 20 });
    normalizedQuery = primaryResults.normalized;
    status = primaryResults.status;
    const primaryCandidates = filterNswCandidates(primaryResults.candidates)
      .map((candidate) => ({
        ...candidate,
        confidence: scoreCandidate(addressText, candidate),
      }))
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

    let resolvedCandidates: SiteCandidate[] = [];
    if (primaryCandidates.length) {
      resolvedCandidates = primaryCandidates.slice(0, options?.limit ?? 10);
    } else {
      const { suburb, street } = parseQueryComponents(addressText);
      if (suburb) {
        const suburbQuery = `${suburb} NSW`;
        const fuzzyPool = await performPropertySearch(suburbQuery, "fuzzy", config, { limit: 50 });
        normalizedQuery = fuzzyPool.normalized;
        status = fuzzyPool.status;
        const streetLabel = street ?? suburbQuery;
        resolvedCandidates = filterNswCandidates(fuzzyPool.candidates)
          .map((candidate) => ({
            ...candidate,
            confidence: scoreStreetSimilarity(
              extractStreetSegment(streetLabel),
              extractStreetSegment(candidate.formattedAddress),
            ),
          }))
          .filter((candidate) => (candidate.confidence ?? 0) >= 0.6)
          .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
          .slice(0, options?.limit ?? 10);
      }
    }

    console.log("[site-resolver-result]", {
      provider: "nsw-point",
      q: normalizedQuery,
      source,
      status,
      candidates: resolvedCandidates.length,
    });
    return { candidates: resolvedCandidates, normalizedQuery, status };
  } catch (error) {
    console.error("[site-resolver-error]", { provider: "nsw-point", q: addressText, source, ...getErrorDetails(error) });
    throw error;
  }
};

export const decideSiteFromCandidates = (candidates: SiteCandidate[]): SiteDecision => {
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

export const resolveSiteFromText = async (
  addressText: string,
  options?: { source?: SiteResolverSource; limit?: number },
): Promise<SiteResolverResult> => {
  const source = options?.source ?? "chat";
  let googleError: SiteSearchError | null = null;
  let googleSuggestions = 0;
  let googleStatus: string | null = null;
  try {
    const googleConfig = getGoogleConfig();
    if (googleConfig.enabled) {
      try {
        const { candidates, normalizedQuery, suggestionsCount, googleStatus: resolvedStatus } = await resolveSiteWithGoogle(
          addressText,
          { key: googleConfig.key },
          options,
        );
        googleSuggestions = suggestionsCount;
        googleStatus = resolvedStatus;

        if (resolvedStatus === "OK" && candidates.length > 0) {
          const decision = decideSiteFromCandidates(candidates);
          return {
            status: "ok",
            source,
            normalizedQuery,
            candidates,
            decision,
          };
        }

        console.info("[site-resolver-google-fallback]", {
          provider: "google",
          status: resolvedStatus,
          suggestions: suggestionsCount,
          reason: candidates.length === 0 ? "no_candidates" : "status_not_ok",
        });
      } catch (error) {
        const errorDetails = getErrorDetails(error);
        const googleStatus =
          errorDetails.details && "googleStatus" in errorDetails.details
            ? (errorDetails.details.googleStatus as string)
            : errorDetails.status;
        const googleErrorMessage =
          errorDetails.details && "googleErrorMessage" in errorDetails.details
            ? (errorDetails.details.googleErrorMessage as string | null)
            : errorDetails.message;
        console.warn("[site-resolver-google-error]", {
          provider: "google",
          status: googleStatus,
          error_message: googleErrorMessage,
        });
        googleError =
          error instanceof SiteSearchError
            ? error
            : new SiteSearchError("property_search_failed", "Google Places request failed.", {
                provider: "google",
              });
      }
    }

    const { candidates, normalizedQuery } = await resolveAddressToSite(addressText, options);
    const decision = decideSiteFromCandidates(candidates);
    console.log("[site-resolver-fallback]", {
      from: "google",
      reason:
        googleError?.details?.googleStatus ?? (googleSuggestions === 0 ? "google_zero_results" : "google_candidates_empty"),
      googleStatus,
      googleSuggestions,
      provider: "nsw-point",
    });
    return {
      status: "ok",
      source,
      normalizedQuery,
      candidates,
      decision,
    };
  } catch (error) {
    if (error instanceof SiteSearchError) {
      return {
        status: (googleError ?? error).code,
        message: (googleError ?? error).message,
        provider: (googleError ?? error).provider,
        details: (googleError ?? error).details,
      };
    }
    throw error;
  }
};

const performPropertySearch = async (
  queryText: string,
  strategy: PropertySearchStrategy,
  config: PropertySearchConfig,
  options?: { limit?: number },
): Promise<PropertySearchResult> => {
  return fetchPropertySearch(queryText, strategy, config, options);
};
