import type { Instrument } from "@prisma/client";

import type { ApplicableClausesResult, ClauseDetail, ClauseSummary } from "./types";

export type SerializedInstrument = Pick<Instrument, "id" | "slug" | "name" | "shortName" | "instrumentType" | "jurisdiction"> & {
  lastSyncedAt: string | null;
};

export type SerializedClauseSummary = Omit<ClauseSummary, "currentAsAt"> & {
  currentAsAt: string | null;
};

export type SerializedClauseDetail = Omit<ClauseDetail, "currentAsAt" | "effectiveFrom" | "effectiveTo" | "retrievedAt"> & {
  currentAsAt: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  retrievedAt: string | null;
};

export type SerializedApplicableClausesResult = {
  siteInstruments: SerializedInstrument[];
  clauses: SerializedClauseSummary[];
};

export const serializeInstrument = (instrument: Instrument): SerializedInstrument => ({
  id: instrument.id,
  slug: instrument.slug,
  name: instrument.name,
  shortName: instrument.shortName,
  instrumentType: instrument.instrumentType,
  jurisdiction: instrument.jurisdiction,
  lastSyncedAt: instrument.lastSyncedAt ? instrument.lastSyncedAt.toISOString() : null,
});

export const serializeClauseSummary = (clause: ClauseSummary): SerializedClauseSummary => ({
  ...clause,
  currentAsAt: clause.currentAsAt ? clause.currentAsAt.toISOString() : null,
});

export const serializeClauseDetail = (clause: ClauseDetail): SerializedClauseDetail => ({
  ...serializeClauseSummary(clause),
  hierarchyPath: clause.hierarchyPath,
  bodyHtml: clause.bodyHtml,
  bodyText: clause.bodyText,
  version: clause.version,
  effectiveFrom: clause.effectiveFrom ? clause.effectiveFrom.toISOString() : null,
  effectiveTo: clause.effectiveTo ? clause.effectiveTo.toISOString() : null,
  retrievedAt: clause.retrievedAt ? clause.retrievedAt.toISOString() : null,
});

export const serializeApplicableClausesResult = (
  result: ApplicableClausesResult,
): SerializedApplicableClausesResult => ({
  siteInstruments: result.siteInstruments.map(serializeInstrument),
  clauses: result.clauses.map(serializeClauseSummary),
});
