import type { SiteCandidate, SiteContextSummary } from "@/types/site";

export type PersistableSiteCandidate = SiteCandidate & {
  provider?: "google" | "nsw-point";
  lgaName: string | null;
  lgaCode?: string | null;
  parcelId?: string | null;
  lot?: string | null;
  planNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  zone?: string | null;
};

const parseNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

export const toPersistableSiteCandidate = (candidate: SiteCandidate): PersistableSiteCandidate => ({
  ...candidate,
  provider: candidate.provider ?? (candidate.id?.startsWith("place") ? "google" : candidate.provider),
  lgaName: candidate.lgaName ?? null,
  lgaCode: candidate.lgaCode ?? null,
  parcelId: candidate.parcelId ?? null,
  lot: candidate.lot ?? null,
  planNumber: candidate.planNumber ?? null,
  latitude: parseNumber(candidate.latitude ?? null),
  longitude: parseNumber(candidate.longitude ?? null),
  zone: candidate.zone ?? null,
});

export const setSiteFromCandidate = async (params: {
  projectId: string;
  addressInput: string;
  candidate: PersistableSiteCandidate;
}): Promise<SiteContextSummary | null> => {
  const { projectId, addressInput, candidate } = params;
  const response = await fetch("/api/site-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, addressInput, candidate }),
  });
  const data: { siteContext?: SiteContextSummary | null; message?: string } = await response.json();
  if (!response.ok) {
    throw new Error(data?.message ?? "Unable to save the selected site.");
  }
  return data.siteContext ?? null;
};
