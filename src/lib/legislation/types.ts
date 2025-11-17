import type { Clause, Instrument, InstrumentType } from "@prisma/client";

export type ClauseHierarchyPath = string[];

export interface InstrumentConfig {
  slug: string;
  name: string;
  shortName: string;
  instrumentType: InstrumentType;
  sourceUrl: string;
  jurisdiction?: string;
  xmlSourceUrl?: string;
  exportDate?: string;
  exportPath?: string;
  clausePrefix?: string;
  alwaysApplicable?: boolean;
  topics?: string[];
  status?: "in_force" | "repealed";
  notes?: string;
  fixtureFile?: string;
}

export interface ParsedClause {
  clauseKey: string;
  title: string;
  bodyHtml: string;
  bodyText: string;
  hierarchyPath: ClauseHierarchyPath;
  contentHash: string;
}

export interface InstrumentFetchResult {
  document: string;
  fetchedAt: Date;
  status: number;
  sourceUrl: string;
  usedFixture: boolean;
  format: "xml" | "html";
}

export interface SearchClausesParams {
  query?: string;
  instrumentSlugs?: string[];
  instrumentTypes?: InstrumentType[];
  isCurrent?: boolean;
  limit?: number;
}

export interface ClauseSummary {
  instrumentId: string;
  instrumentName: string;
  instrumentType: InstrumentType;
  clauseId: string;
  clauseKey: string;
  title: string | null;
  snippet: string;
  isCurrent: boolean;
  currentAsAt: Date | null;
}

export interface ClauseDetail extends ClauseSummary {
  hierarchyPath: ClauseHierarchyPath;
  bodyHtml: string;
  bodyText: string;
  version: number;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  retrievedAt: Date | null;
}

export interface ApplicableClausesResult {
  siteInstruments: Instrument[];
  clauses: ClauseSummary[];
}

export interface SiteResolutionResult {
  address: string;
  parcelId?: string;
  localGovernmentArea?: string | null;
  instrumentSlugs: string[];
  rationale: string[];
}

export type ClauseWithInstrument = Clause & { instrument: Instrument };
