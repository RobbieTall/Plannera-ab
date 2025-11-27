import { resolveSiteFromText, type SiteResolverResult, type SiteResolverSource } from "@/lib/site-resolver";

export const searchNswSite = async (
  addressText: string,
  options?: { source?: SiteResolverSource; limit?: number },
): Promise<SiteResolverResult> => {
  return resolveSiteFromText(addressText, { source: options?.source ?? "site-search", limit: options?.limit });
};

export const pickBestNswCandidate = (result: SiteResolverResult) => {
  if (result.status !== "ok") return null;
  if (result.decision === "auto" && result.candidates[0]) {
    return result.candidates[0];
  }
  return null;
};
