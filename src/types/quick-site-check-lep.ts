export type QuickSiteCheckLepClause = {
  part: "4" | "5" | "6";
  clauseNumber: string;
  heading: string;
  textSnippet: string;
};

export type QuickSiteCheckLepSuccess = {
  ok: true;
  projectId: string;
  lga: string;
  lepName: string;
  zone: string | null;
  objectives: string[];
  landUse: {
    withoutConsent: string[];
    withConsent: string[];
    prohibited: string[];
  };
  part4: QuickSiteCheckLepClause[];
  part5: QuickSiteCheckLepClause[];
  part6: QuickSiteCheckLepClause[];
  part4Reason?: string;
  part5Reason?: string;
  part6Reason?: string;
  debug?: {
    zoneHeadingMatch: string | null;
    landUseSource: string | null;
    zoneAnchorClauseKey?: string | null;
    zoneAnchorTitle?: string | null;
    zoneCandidateCount?: number;
    excludedGlobalZoneClauses?: string[];
    usedGlobalZoneFallback?: boolean;
    partCandidateCounts: { "4": number; "5": number; "6": number };
  };
};

export type QuickSiteCheckLepError = {
  ok: false;
  projectId?: string;
  message: string;
};

export type QuickSiteCheckLepResponse = QuickSiteCheckLepSuccess | QuickSiteCheckLepError;
