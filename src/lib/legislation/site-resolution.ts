import { ALL_INSTRUMENT_CONFIG } from "./config";
import type { SiteResolutionResult } from "./types";
import { findLocalNswLepsByLga } from "../lep/nsw-lep-registry";
import { resolveCanonicalNswLga } from "../lep/nsw-lga-normaliser";

interface SiteInput {
  address: string;
  parcelId?: string;
  topic?: string;
  lga?: string | null;
  state?: string | null;
}

const LGA_KEYWORDS: Record<string, string[]> = {
  "City of Sydney": ["sydney", "haymarket", "ultimo", "glebe", "darlinghurst", "surry hills", "redfern"],
  "Northern Beaches": ["manly", "dee why", "brookvale"],
  Ballina: ["ballina", "lennox", "lennox head", "skennars", "skennars head", "alstonville"],
  "Byron Shire": ["byron", "byron bay", "mullumbimby", "bangalow", "ocean shores"],
  Randwick: ["randwick", "coogee", "maroubra", "kensington", "kingsford"],
};

const DEFAULT_SEPP_SLUGS = ALL_INSTRUMENT_CONFIG.filter((config) => config.instrumentType === "SEPP").map(
  (config) => config.slug,
);

const inferLgaFromAddress = (address: string) => {
  const lower = address.toLowerCase();
  for (const [lga, keywords] of Object.entries(LGA_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return lga;
    }
  }
  return null;
};

export const resolveSiteInstruments = async (input: SiteInput): Promise<SiteResolutionResult> => {
  const inferredLga = input.lga ?? inferLgaFromAddress(input.address);
  const lepMatch = findLocalNswLepsByLga(inferredLga)[0];
  const canonicalLga = lepMatch?.details.canonicalLga ?? resolveCanonicalNswLga(inferredLga);
  const lepSlug = lepMatch?.config.slug;

  const instrumentSlugs = [...DEFAULT_SEPP_SLUGS];
  const rationale = ["Default NSW SEPPs apply state-wide."];

  if (lepSlug) {
    instrumentSlugs.push(lepSlug);
    rationale.push(`Matched LGA ${inferredLga ?? canonicalLga} and added ${lepSlug}.`);
  }

  return {
    address: input.address,
    parcelId: input.parcelId,
    localGovernmentArea: inferredLga,
    instrumentSlugs,
    rationale,
  };
};
