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
  createdAt: string;
  updatedAt: string;
};
