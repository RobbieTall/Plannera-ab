import type { SiteContext } from "@prisma/client";

import { ingestDataset } from "@/lib/nsw/service";
import type { PropertyInsight } from "@/lib/nsw/types";
import { prisma } from "@/lib/prisma";
import type { SiteCandidate, SiteContextSummary } from "@/types/site";
import { INSTRUMENT_CONFIG } from "./legislation/config";

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

let propertyDatasetPromise: Promise<PropertyInsight[]> | null = null;

const getPropertyDataset = async () => {
  if (!propertyDatasetPromise) {
    propertyDatasetPromise = ingestDataset("property") as Promise<PropertyInsight[]>;
  }
  return propertyDatasetPromise;
};

const sanitiseString = (value: string | null | undefined) => (value ? value.trim() : null);

const toSiteCandidate = (record: PropertyInsight): SiteCandidate => {
  const id = record.plan ? `${record.plan}:${record.lot ?? record.address}` : record.address;
  return {
    id,
    formattedAddress: record.address,
    lgaName: sanitiseString(record.localGovernmentArea) ?? null,
    latitude: null,
    longitude: null,
    parcelId: record.plan ?? null,
    lot: sanitiseString(record.lot) ?? null,
    planNumber: sanitiseString(record.plan) ?? null,
    zone: sanitiseString(record.zoning) ?? null,
  };
};

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

export const resolveAddressToSite = async (addressText: string): Promise<SiteCandidate[]> => {
  const records = await getPropertyDataset();
  const filtered = records.filter((record) => record.address && isNswAddress(record.address));
  const scored = filtered
    .map((record) => {
      const candidate = toSiteCandidate(record);
      candidate.confidence = scoreCandidate(addressText, candidate);
      return candidate;
    })
    .filter((candidate) => candidate.confidence && candidate.confidence >= 0.25)
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, 5);
  return scored;
};

export const getCandidateById = async (candidateId: string): Promise<SiteCandidate | null> => {
  const records = await getPropertyDataset();
  const record = records.find((entry) => {
    const id = entry.plan ? `${entry.plan}:${entry.lot ?? entry.address}` : entry.address;
    return id === candidateId;
  });
  return record ? toSiteCandidate(record) : null;
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
