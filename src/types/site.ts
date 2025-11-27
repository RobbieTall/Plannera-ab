export type SiteCandidate = {
  id: string;
  formattedAddress: string;
  lgaName: string | null;
  lgaCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  parcelId?: string | null;
  lot?: string | null;
  planNumber?: string | null;
  zone?: string | null;
  confidence?: number;
  provider?: "google" | "nsw-point";
};

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

export type CouncilMapContext = {
  platform: "arcgis" | "intramaps" | "pozi" | "none";
  url: string | null;
};

export type SiteContextSummary = {
  id: string;
  projectId: string;
  addressInput: string;
  formattedAddress: string;
  lgaName: string | null;
  lgaCode: string | null;
  parcelId: string | null;
  lot: string | null;
  planNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  zone: string | null;
  zoningCode: string | null;
  zoningName: string | null;
  zoningSource: string | null;
  councilMap?: CouncilMapContext;
  createdAt: string;
  updatedAt: string;
};
