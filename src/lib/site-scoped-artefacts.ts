import type { DetailedPlanningPackContent, ReviewRequestContent, WorkspacePreSeePlanningMemoContent } from "@/types/workspace";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";

export type CurrentSiteScope = {
  address?: string | null;
  lgaName?: string | null;
  lgaCode?: string | null;
  zoneLabel?: string | null;
  zoneCode?: string | null;
};

export type ArtefactSiteScope = {
  address?: string | null;
  lga?: string | null;
  zoneLabel?: string | null;
  zoneCode?: string | null;
};

const clean = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .replace(/\baustralia\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokenSet = (value?: string | null) => new Set(clean(value).split(" ").filter(Boolean));

const addressMatches = (current?: string | null, artefact?: string | null) => {
  const currentClean = clean(current);
  const artefactClean = clean(artefact);
  if (!currentClean || !artefactClean) return true;
  if (currentClean === artefactClean || currentClean.includes(artefactClean) || artefactClean.includes(currentClean)) return true;
  const currentTokens = tokenSet(currentClean);
  const artefactTokens = [...tokenSet(artefactClean)];
  if (!currentTokens.size || !artefactTokens.length) return true;
  const overlap = artefactTokens.filter((token) => currentTokens.has(token)).length;
  return overlap >= Math.min(4, artefactTokens.length, currentTokens.size);
};

const lgaMatches = (current: CurrentSiteScope, artefact?: string | null) => {
  const currentLga = clean(`${current.lgaName ?? ""} ${current.lgaCode ?? ""}`);
  const artefactLga = clean(artefact);
  if (!currentLga || !artefactLga) return true;
  return currentLga.includes(artefactLga) || artefactLga.includes(currentLga);
};

const zoneMatches = (current: CurrentSiteScope, artefact: ArtefactSiteScope) => {
  const currentZone = clean(`${current.zoneCode ?? ""} ${current.zoneLabel ?? ""}`);
  const artefactZone = clean(`${artefact.zoneCode ?? ""} ${artefact.zoneLabel ?? ""}`);
  if (!currentZone || !artefactZone) return true;
  const currentTokens = tokenSet(currentZone);
  return [...tokenSet(artefactZone)].some((token) => token.length >= 2 && currentTokens.has(token));
};

export const isArtefactCurrentForSite = (current: CurrentSiteScope | null | undefined, artefact: ArtefactSiteScope | null | undefined) => {
  if (!current || !artefact) return false;
  return addressMatches(current.address, artefact.address) && lgaMatches(current, artefact.lga) && zoneMatches(current, artefact);
};

export const quickSiteCheckScope = (report?: QuickSiteCheckReport | null): ArtefactSiteScope | null => report?.site ? {
  address: report.site.address,
  lga: report.site.lga,
  zoneCode: report.site.zoneCode,
  zoneLabel: report.site.zoneLabel,
} : null;

export const preSeeScope = (memo?: WorkspacePreSeePlanningMemoContent | null): ArtefactSiteScope | null => memo?.siteDescription ? {
  address: memo.siteDescription.address,
  lga: memo.siteDescription.lga,
  zoneCode: memo.siteDescription.zoneCode,
  zoneLabel: memo.siteDescription.zoneLabel,
} : null;

export const detailedPlanningPackScope = (pack?: DetailedPlanningPackContent | null): ArtefactSiteScope | null => pack?.site ? {
  address: pack.site.address,
  lga: pack.site.lga,
  zoneCode: pack.site.zoneCode,
  zoneLabel: pack.site.zoneLabel,
} : null;

export const reviewRequestScope = (review?: ReviewRequestContent | null): ArtefactSiteScope | null => review?.site ? {
  address: review.site.address,
  lga: review.site.lga,
  zoneLabel: review.site.zoneLabel,
} : null;
