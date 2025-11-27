import type { SiteContext } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { SiteCandidate, SiteContextSummary } from "@/types/site";
import type { LepParseResult, LepZoneUses } from "./lep/types";
import { INSTRUMENT_CONFIG } from "./legislation/config";
import { getLgaMapInfo } from "./lga-map-registry";
import { formatZoningLabel, getZoningForSite, type ZoningResult } from "./nsw-zoning";
import { findProjectByExternalId, normalizeProjectId } from "./project-identifiers";
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

type LepZoneSummary = Pick<LepZoneUses, "zoneCode" | "zoneName">;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toLepSummary = (lepData: unknown) => {
  if (!lepData || !isObject(lepData)) {
    return undefined;
  }

  const typed = lepData as Partial<LepParseResult>;
  const metadata = isObject(typed.metadata) ? typed.metadata : undefined;
  const zones = Array.isArray(typed.zones) ? typed.zones : [];

  const zoneSummaries = zones
    .map((zone) =>
      isObject(zone) && typeof zone.zoneCode === "string" && typeof zone.zoneName === "string"
        ? { zoneCode: zone.zoneCode, zoneName: zone.zoneName }
        : null,
    )
    .filter(Boolean) as LepZoneSummary[];

  const lgaName = metadata && typeof metadata.lgaName === "string" ? metadata.lgaName : "";
  const instrumentName = metadata && typeof metadata.instrumentName === "string" ? metadata.instrumentName : "";
  const instrumentType = metadata && typeof metadata.instrumentType === "string" ? metadata.instrumentType : undefined;

  if (!lgaName && !instrumentName && !instrumentType && !zoneSummaries.length) {
    return undefined;
  }

  return {
    lgaName,
    instrumentName,
    instrumentType,
    zones: zoneSummaries,
  } satisfies SiteContextSummary["lepSummary"];
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
  const normalizedProjectId = normalizeProjectId(projectId);
  const project = await findProjectByExternalId(prisma, normalizedProjectId);
  if (!project) {
    throw new Error("Project not found for site context");
  }
  const normalizedAddressInput = addressInput.trim() || addressInput;

  let zoningResult: ZoningResult | null = null;
  try {
    zoningResult = await getZoningForSite({
      coords:
        typeof candidate.latitude === "number" && typeof candidate.longitude === "number"
          ? { lat: candidate.latitude, lng: candidate.longitude }
          : null,
      parcel:
        candidate.lot && candidate.planNumber
          ? { lot: candidate.lot, dp: candidate.planNumber }
          : null,
    });
  } catch (error) {
    console.warn("[site-context] zoning lookup failed", {
      error,
      provider: candidate.provider,
      coords: { lat: candidate.latitude, lng: candidate.longitude },
      lot: candidate.lot,
      planNumber: candidate.planNumber,
    });
  }

  const zoningLabel = formatZoningLabel(zoningResult) ?? candidate.zone ?? null;
  const data = {
    projectId: project.id,
    addressInput: normalizedAddressInput,
    formattedAddress: candidate.formattedAddress,
    lgaName: candidate.lgaName ?? null,
    lgaCode: candidate.lgaCode ?? null,
    parcelId: candidate.parcelId ?? null,
    lot: candidate.lot ?? null,
    planNumber: candidate.planNumber ?? null,
    latitude: candidate.latitude ?? null,
    longitude: candidate.longitude ?? null,
    zone: zoningLabel,
  } satisfies Omit<SiteContext, "id" | "createdAt" | "updatedAt">;

  const persisted = await prisma.siteContext.upsert({
    where: { projectId: project.id },
    update: data,
    create: data,
  });
  await prisma.project.update({
    where: { id: project.id },
    data: {
      zoningCode: zoningResult?.zoneCode ?? null,
      zoningName: zoningResult?.zoneName ?? null,
      zoningSource: zoningResult?.source ?? null,
    },
  });

  return persisted;
};

export const persistManualSiteContext = async (params: {
  projectId: string;
  rawAddress: string;
  lgaName?: string | null;
  lgaCode?: string | null;
  resolverStatus?: string | null;
}): Promise<SiteContext> => {
  const { projectId, rawAddress, lgaCode, lgaName } = params;
  const normalizedProjectId = normalizeProjectId(projectId);
  const project = await findProjectByExternalId(prisma, normalizedProjectId);
  if (!project) {
    throw new Error("Project not found for site context");
  }
  const normalizedAddress = rawAddress.trim() || rawAddress;
  const data = {
    projectId: project.id,
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

  const persisted = await prisma.siteContext.upsert({
    where: { projectId: project.id },
    update: data,
    create: data,
  });

  await prisma.project.update({
    where: { id: project.id },
    data: { zoningCode: null, zoningName: null, zoningSource: null },
  });

  return persisted;
};

export const getSiteContextForProject = async (projectId: string): Promise<SiteContext | null> => {
  const project = await findProjectByExternalId(prisma, normalizeProjectId(projectId));
  if (!project) {
    return null;
  }
  return prisma.siteContext.findUnique({ where: { projectId: project.id } });
};

export const serializeSiteContext = (
  context: SiteContext | null,
  project?: {
    zoningCode: string | null;
    zoningName: string | null;
    zoningSource: string | null;
    lepData?: unknown | null;
  } | null,
): SiteContextSummary | null => {
  if (!context) return null;
  const lgaMapInfo = context.lgaName ? getLgaMapInfo(context.lgaName) : null;
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
    zoningCode: project?.zoningCode ?? null,
    zoningName: project?.zoningName ?? null,
    zoningSource: project?.zoningSource ?? null,
    lepSummary: project?.lepData ? toLepSummary(project.lepData) : undefined,
    councilMap: lgaMapInfo
      ? {
          platform: lgaMapInfo.platform,
          url: lgaMapInfo.primaryMapUrl,
        }
      : undefined,
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
