export type QuickSiteCheckControl = {
  label: string;
  value: string | null;
  present: boolean;
  source?: string | null;
  lepSource?: boolean;
  clauseRef?: string | null;
  detail?: string | null;
  interpretation: string;
  confidence?: "Cited" | "Inferred" | "Unavailable";
};

export type QuickSiteCheckEvidenceSummary = {
  label: "Cited" | "Unavailable";
  detail: string;
  citedControlCount: number;
  totalControlCount: number;
  landUseEntryCount: number;
  objectiveCount: number;
  sourceRef: string;
};

export type QuickSiteCheckPermissibility = {
  zoneLabel: string | null;
  permittedWithoutConsent: string[];
  permittedWithConsent: string[];
  prohibited: string[];
  interpretation: string;
};

export type QuickSiteCheckReport = {
  projectId: string;
  generatedAt: string;
  site: {
    address?: string | null;
    lga?: string | null;
    zoneCode?: string | null;
    zoneName?: string | null;
    zoneLabel?: string | null;
    zoningSource?: string | null;
  };
  lepInstrument?: {
    name?: string | null;
    code?: string | null;
    lga?: string | null;
    source?: "project" | "ingestion";
  } | null;
  permissibility?: QuickSiteCheckPermissibility | null;
  controls: {
    heightOfBuilding: QuickSiteCheckControl;
    floorSpaceRatio: QuickSiteCheckControl;
    minimumLotSize: QuickSiteCheckControl;
    setback?: QuickSiteCheckControl;
    parking?: QuickSiteCheckControl;
    activeFrontageBuiltForm?: QuickSiteCheckControl;
  };
  notes: string[];
  nextSteps: string[];
  lepEvidenceSummary?: QuickSiteCheckEvidenceSummary | null;
};

export type QuickSiteCheckResponse = {
  ok: boolean;
  report?: QuickSiteCheckReport;
  message?: string;
};

export type QuickSiteCheckArtefactRequest = {
  projectId: string;
  title: string;
  type: "quick_site_check";
  report: QuickSiteCheckReport;
};
