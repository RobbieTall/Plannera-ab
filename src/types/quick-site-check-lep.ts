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
  zoneObjectives: string[];
  permittedWithoutConsent: string[];
  permittedWithConsent: string[];
  prohibited: string[];
  part4Clauses: QuickSiteCheckLepClause[];
  part5Clauses: QuickSiteCheckLepClause[];
  part6Clauses: QuickSiteCheckLepClause[];
};

export type QuickSiteCheckLepError = {
  ok: false;
  projectId?: string;
  message: string;
};

export type QuickSiteCheckLepResponse = QuickSiteCheckLepSuccess | QuickSiteCheckLepError;
