export type LepControlValue = {
  value: string;
  clauseRef: string;
  sourceRef?: string;
  confidence: "Cited" | "Inferred" | "Unavailable";
};

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
  controls: {
    heightOfBuilding: LepControlValue | null;
    fsr: LepControlValue | null;
    minLotSize: LepControlValue | null;
    zoneObjectives: string[] | null;
    setback?: LepControlValue | null;
    parking?: LepControlValue | null;
    activeFrontageBuiltForm?: LepControlValue | null;
  };
  permissibility: {
    permittedWithoutConsent: string[];
    permittedWithConsent: string[];
    prohibited: string[];
  } | null;
  dataSource: "db_clauses" | "fallback";
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
    landUseSource:
      | "ingested"
      | "table"
      | "text-block"
      | "clause-fallback"
      | "land-use-table"
      | "land-use-table-section"
      | null;
    zoneTableClauseKey?: string | null;
    zoneTableClauseTitle?: string | null;
    zoneObjectiveSource?: "table" | "text-block" | "fallback" | "ingested";
    zoneAnchorClauseKey?: string | null;
    zoneAnchorTitle?: string | null;
    zoneCandidateCount?: number;
    excludedGlobalZoneClauses?: string[];
    usedGlobalZoneFallback?: boolean;
    zoneClauseKey?: string | null;
    zoneClauseTitle?: string | null;
    zoneBlockFound?: boolean;
    zoneBlockHeading?: string | null;
    landUseTableSectionFound?: boolean;
    landUseTableSectionHeading?: string | null;
    landUseZoneBlockFound?: boolean;
    landUseZoneBlockHeading?: string | null;
    objectivesCount?: number;
    landUseCounts?: { withoutConsent: number; withConsent: number; prohibited: number };
    landUseExtractionMode?: "string-search" | "xml-traverse" | "link-resolve" | "xml-clausegroup" | null;
    landUseResolvedViaLink?: boolean;
    landUseResolvedTargetIds?: string[];
    landUseZoneClausegroupId?: string | null;
    lepSource?: "db" | "local-xml";
    lepSourceError?: string | null;
    usedFallback?: boolean;
    fallbackReason?: string | null;
    partCandidateCounts: { "4": number; "5": number; "6": number };
    notes?: string[];
  };
};

export type QuickSiteCheckLepError = {
  ok: false;
  projectId?: string;
  lepName?: string;
  lga?: string;
  zone?: string | null;
  error?: string;
  message: string;
};

export type QuickSiteCheckLepResponse = QuickSiteCheckLepSuccess | QuickSiteCheckLepError;
