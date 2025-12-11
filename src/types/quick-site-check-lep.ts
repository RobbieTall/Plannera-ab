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
};

export type QuickSiteCheckLepError = {
  ok: false;
  projectId?: string;
  message: string;
};

export type QuickSiteCheckLepResponse = QuickSiteCheckLepSuccess | QuickSiteCheckLepError;
