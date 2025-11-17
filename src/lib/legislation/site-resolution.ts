import { INSTRUMENT_CONFIG } from "./config";
import type { SiteResolutionResult } from "./types";

interface SiteInput {
  address: string;
  parcelId?: string;
  topic?: string;
  lga?: string | null;
  state?: string | null;
}

const LGA_KEYWORDS: Record<string, string[]> = {
  "City of Sydney": ["sydney", "haymarket", "ultimo", "glebe"],
  "Northern Beaches": ["manly", "dee why", "brookvale"],
  Ballina: ["ballina", "lennox", "skennars", "alstonville"],
};

const DEFAULT_SEPP_SLUGS = INSTRUMENT_CONFIG.filter((config) => config.instrumentType === "SEPP").map(
  (config) => config.slug,
);

const LEP_BY_LGA: Record<string, string> = {
  "City of Sydney": "city-of-sydney-lep-2012",
  Ballina: "ballina-lep-2012",
};

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
  const lepSlug = inferredLga ? LEP_BY_LGA[inferredLga] : undefined;

  const instrumentSlugs = [...DEFAULT_SEPP_SLUGS];
  const rationale = ["Default NSW SEPPs apply state-wide."];

  if (lepSlug) {
    instrumentSlugs.push(lepSlug);
    rationale.push(`Matched LGA ${inferredLga} and added ${lepSlug}.`);
  }

  return {
    address: input.address,
    parcelId: input.parcelId,
    localGovernmentArea: inferredLga,
    instrumentSlugs,
    rationale,
  };
};
