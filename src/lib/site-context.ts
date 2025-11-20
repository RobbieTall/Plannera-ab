import type { SiteContext } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { SiteCandidate, SiteContextSummary } from "@/types/site";
import { INSTRUMENT_CONFIG } from "./legislation/config";
import {
  decideSiteFromCandidates,
  extractCandidateAddress,
  resolveSiteFromText,
  SiteSearchError,
  type SiteDecision,
  type SiteResolverResult,
  type SiteResolverSource,
} from "./site-resolver";

export {
  decideSiteFromCandidates,
  extractCandidateAddress,
  resolveSiteFromText,
  SiteSearchError,
  type SiteDecision,
  type SiteResolverResult,
  type SiteResolverSource,
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

export const persistManualSiteContext = async (params: {
  projectId: string;
  rawAddress: string;
  lgaName?: string | null;
  lgaCode?: string | null;
  resolverStatus?: string | null;
}): Promise<SiteContext> => {
  const { projectId, rawAddress, lgaCode, lgaName } = params;
  const normalizedAddress = rawAddress.trim() || rawAddress;
  const data = {
    projectId,
    addressInput: normalizedAddress,
    formattedAddress: normalizedAddress,
    lgaName: lgaName ?? null,
    lgaCode: lgaCode ?? null,
    parcelId: null,
    lot: null,
    planNumber: null,
    latitude: null,
    longitude: null,
    zone: null,
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
