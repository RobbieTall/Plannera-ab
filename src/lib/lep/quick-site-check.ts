import fs from "fs";
import type { Clause, LepZoneLandUse, LepZoneObjective } from "@prisma/client";

import type {
  LepControlValue,
  QuickSiteCheckLepClause,
  QuickSiteCheckLepResponse,
  QuickSiteCheckLepSuccess,
} from "@/types/quick-site-check-lep";

import { prisma } from "../prisma";
import { findProjectByExternalId, normalizeProjectId } from "../project-identifiers";
import { serializeSiteContext } from "../site-context";
import { getInstrumentConfig } from "../legislation/config";
import { buildLepInstrumentFilter } from "./lep-search";
import { resolveCanonicalNswLga } from "./nsw-lga-normaliser";
import {
  cleanXmlLikeString,
  findLandUseTableClause,
  GLOBAL_ZONE_PATTERNS,
  extractZoneBlockFromLandUseXml,
  extractZoneFromXmlClausegroup,
  parseZoneContent,
  toZoneCode,
} from "./zone-utils";

type ClauseSummary = Pick<Clause, "clauseKey" | "title" | "bodyText" | "hierarchyPath">;

const KEYWORDS: Record<"4" | "5" | "6", string[]> = {
  "4": [
    "height",
    "floor space",
    "fsr",
    "lot size",
    "subdivision",
    "envelope",
    "setback",
    "building",
    "storey",
    "car parking",
    "earthworks",
  ],
  "5": ["heritage", "archaeolog", "environmental heritage", "biodiversity", "conservation", "vegetation"],
  "6": [
    "acid sulfate",
    "acid sulphate",
    "flood",
    "drinking water",
    "water",
    "coastal",
    "erosion",
    "bush fire",
    "bushfire",
    "biodiversity",
    "riparian",
    "scenic",
    "land slip",
    "landslip",
    "airport",
    "contamination",
    "foreshore",
  ],
};

const parseClauseNumber = (clause: ClauseSummary) => {
  if (clause.clauseKey?.trim()) return clause.clauseKey;
  const titleMatch = clause.title?.match(/(\d+(?:\.\d+)?)/);
  if (titleMatch) return titleMatch[1];
  const hierarchyMatch = clause.hierarchyPath?.find((entry) => /\bclause\s+\d+/i.test(entry));
  if (hierarchyMatch) {
    const match = hierarchyMatch.match(/(\d+(?:\.\d+)?)/);
    if (match) return match[1];
  }
  return "";
};

const derivePart = (clause: ClauseSummary): "4" | "5" | "6" | null => {
  if (clause.clauseKey?.startsWith("4")) return "4";
  if (clause.clauseKey?.startsWith("5")) return "5";
  if (clause.clauseKey?.startsWith("6")) return "6";
  if (clause.hierarchyPath?.some((entry) => /part\s*4/i.test(entry))) return "4";
  if (clause.hierarchyPath?.some((entry) => /part\s*5/i.test(entry))) return "5";
  if (clause.hierarchyPath?.some((entry) => /part\s*6/i.test(entry))) return "6";
  if (clause.title) {
    const match = clause.title.match(/\bpart\s*(4|5|6)\b/i);
    if (match) return match[1] as "4" | "5" | "6";
  }
  if (clause.hierarchyPath) {
    for (const entry of clause.hierarchyPath) {
      const match = entry.match(/^(4|5|6)(?:\.|\s)/);
      if (match) return match[1] as "4" | "5" | "6";
    }
  }
  return null;
};

const normalizeLepTextForDisplay = (text: string | null | undefined) => {
  if (!text) return "";
  const cleaned = cleanXmlLikeString(text);
  return cleaned.replace(/\s+/g, " ").trim();
};

const buildSnippet = (text: string | null | undefined) => {
  const normalized = normalizeLepTextForDisplay(text);
  if (!normalized) return "";
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  const snippet = sentences || normalized.slice(0, 250);
  return snippet.length > 260 ? `${snippet.slice(0, 260)}…` : snippet;
};


const findPart4ClauseByHeading = (clauses: ClauseSummary[], headingRegex: RegExp, fallbackClauseRef: string) => {
  return (
    clauses.find((clause) => headingRegex.test(clause.title ?? "")) ??
    clauses.find((clause) => parseClauseNumber(clause).startsWith(fallbackClauseRef)) ??
    clauses.find((clause) => headingRegex.test(`${clause.title ?? ""}\n${clause.bodyText ?? ""}`)) ??
    null
  );
};

const extractTextNearZone = (text: string, zoneCode: string | null) => {
  const cleaned = cleanXmlLikeString(text).replace(/\r\n/g, "\n");
  if (!zoneCode) return cleaned;
  const zoneRegex = new RegExp(`\\b${zoneCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const lines = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
  const index = lines.findIndex((line) => zoneRegex.test(line));
  if (index === -1) return cleaned;
  return lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 4)).join("\n");
};

const buildControlValue = (
  clauses: ClauseSummary[],
  zoneCode: string | null,
  headingRegex: RegExp,
  valueRegex: RegExp,
  fallbackClauseRef: string,
): LepControlValue | null => {
  try {
    const clause = findPart4ClauseByHeading(clauses, headingRegex, fallbackClauseRef);
    if (!clause) return null;
    const zoneText = extractTextNearZone(clause.bodyText ?? "", zoneCode);
    const zoneMatch = zoneText.match(valueRegex);
    const fallbackMatch = cleanXmlLikeString(clause.bodyText).match(valueRegex);
    const match = zoneMatch ?? fallbackMatch;
    if (!match?.[1]) return null;
    return {
      value: match[1].replace(/\s+/g, "").replace(/m2\b/i, "m²"),
      clauseRef: parseClauseNumber(clause) || fallbackClauseRef,
      confidence: "Cited",
    };
  } catch (error) {
    console.error("[quick-site-check-lep] Control extraction failed", { fallbackClauseRef, error });
    return null;
  }
};


const splitLandUseItems = (value: string | null | undefined) => {
  if (!value) return [] as string[];
  return value
    .split(/\n|;|,(?=\s*[A-Z])/)
    .map((item) => item.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);
};

const extractNamedSectionItems = (text: string, heading: RegExp, nextHeadings: RegExp[]) => {
  const lines = cleanXmlLikeString(text).replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => heading.test(line.trim().replace(/:$/, "")));
  if (start === -1) return [] as string[];
  const collected: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (nextHeadings.some((regex) => regex.test(line.replace(/:$/, "")))) break;
    collected.push(line);
  }
  return splitLandUseItems(collected.join("\n"));
};

const extractLandUseFromClauses = (clauses: ClauseSummary[], zoneCode: string | null) => {
  try {
    const clause = findLandUseTableClause(clauses, zoneCode) ?? clauses.find(isClauseTwoThree) ?? null;
    if (!clause) return null;
    const cleaned = cleanXmlLikeString(clause.bodyText);
    const zoneBlock = extractZoneBlockFromClause(cleaned, zoneCode)?.block ?? cleaned;
    const objectiveItems = extractNamedSectionItems(zoneBlock, /^objectives? of zone/i, [
      /^permitted without consent/i,
      /^permitted with consent/i,
      /^prohibited/i,
      /^zone\s+[A-Z]/i,
    ]);
    const permittedWithoutConsent = extractNamedSectionItems(zoneBlock, /^permitted without consent/i, [
      /^permitted with consent/i,
      /^prohibited/i,
      /^zone\s+[A-Z]/i,
    ]);
    const permittedWithConsent = extractNamedSectionItems(zoneBlock, /^permitted with consent/i, [
      /^permitted without consent/i,
      /^prohibited/i,
      /^zone\s+[A-Z]/i,
    ]);
    const prohibited = extractNamedSectionItems(zoneBlock, /^prohibited/i, [
      /^permitted without consent/i,
      /^permitted with consent/i,
      /^zone\s+[A-Z]/i,
    ]);
    if (!objectiveItems.length && !permittedWithoutConsent.length && !permittedWithConsent.length && !prohibited.length) {
      return null;
    }
    return { objectiveItems, permittedWithoutConsent, permittedWithConsent, prohibited };
  } catch (error) {
    console.error("[quick-site-check-lep] Land use extraction failed", { zoneCode, error });
    return null;
  }
};

const hasRealLandUse = (landUse: ZoneSummary["landUse"]) =>
  [...landUse.withoutConsent, ...landUse.withConsent, ...landUse.prohibited].some(
    (item) => item && !/^No zone-specific/i.test(item),
  );

const scoreClause = (part: "4" | "5" | "6", clause: ClauseSummary, zoneCode: string | null) => {
  const haystack = `${clause.title ?? ""} ${clause.bodyText ?? ""}`.toLowerCase();
  const keywords = KEYWORDS[part];
  const scoreFromKeywords = keywords.reduce((score, keyword) => (haystack.includes(keyword) ? score + 1 : score), 0);
  const partBonus = clause.clauseKey.startsWith(part) ? 1 : 0;
  const zoneBonus = zoneCode && new RegExp(`\b${zoneCode}\b`, "i").test(haystack) ? 2 : 0;
  const zoneWordBonus = /\bzone\b/.test(haystack) ? 1 : 0;
  return scoreFromKeywords + partBonus + zoneBonus + zoneWordBonus;
};

const selectClauses = (part: "4" | "5" | "6", clauses: ClauseSummary[], zoneCode: string | null): QuickSiteCheckLepClause[] => {
  const scored = clauses.map((clause) => ({
    clause,
    score: scoreClause(part, clause, zoneCode),
    clauseNumber: parseClauseNumber(clause),
  }));

  const prioritized = scored.some(({ score }) => score > 0)
    ? scored.filter(({ score }) => score > 0)
    : scored;

  const sorted = prioritized.sort((first, second) => {
    if (first.score !== second.score) return second.score - first.score;
    return first.clauseNumber.localeCompare(second.clauseNumber, undefined, { numeric: true, sensitivity: "base" });
  });

  return sorted.slice(0, 8).map(({ clause }) => ({
    part,
    clauseNumber: parseClauseNumber(clause) || "",
    heading: clause.title?.trim() || "",
    textSnippet: buildSnippet(clause.bodyText),
  }));
};

type ZoneClauseSelection = {
  clause: ClauseSummary;
  matchedHeading: string | null;
  sectionText: string;
  source: "heading" | "regex-window" | "fallback";
};

type ZoneClauseSelectionResult = ZoneClauseSelection | null;

type ZoneClausePick = {
  selection: ZoneClauseSelectionResult;
  debug: {
    anchorClauseKey: string | null;
    anchorTitle: string | null;
    headingMatch: string | null;
    candidateCount: number;
    excludedGlobalClauses: string[];
    usedGlobalFallback: boolean;
  };
};

type ZoneSummary = {
  objectives: string[];
  landUse: { withoutConsent: string[]; withConsent: string[]; prohibited: string[] };
  debug: {
    headingMatch: string | null;
    zoneTableClauseKey: string | null;
    zoneTableClauseTitle: string | null;
    zoneObjectiveSource: "table" | "text-block" | "fallback" | "ingested";
    landUseSource:
      | "ingested"
      | "table"
      | "text-block"
      | "clause-fallback"
      | "land-use-table"
      | "land-use-table-section"
      | null;
    landUseExtractionMode: "string-search" | "xml-traverse" | "link-resolve" | "xml-clausegroup" | null;
    landUseResolvedViaLink: boolean;
    landUseResolvedTargetIds: string[];
    lepSource: "db" | "local-xml";
    lepSourceError: string | null;
    zoneAnchorClauseKey: string | null;
    zoneAnchorTitle: string | null;
    zoneCandidateCount: number;
    excludedGlobalZoneClauses: string[];
    usedGlobalZoneFallback: boolean;
    zoneClauseKey: string | null;
    zoneClauseTitle: string | null;
    zoneBlockFound: boolean;
    zoneBlockHeading: string | null;
    landUseTableSectionFound: boolean;
    landUseTableSectionHeading: string | null;
    landUseZoneBlockFound: boolean;
    landUseZoneBlockHeading: string | null;
    landUseZoneClausegroupId: string | null;
    objectivesCount: number;
    landUseCounts: { withoutConsent: number; withConsent: number; prohibited: number };
    usedFallback: boolean;
    fallbackReason: string | null;
    notes: string[];
  };
};

const isClauseTwoThree = (clause: ClauseSummary) => {
  const clauseKey = clause.clauseKey ?? "";
  const title = clause.title ?? "";
  return /_2_3\b/i.test(clauseKey) || /\b2\.3\b/.test(clauseKey) || /zone objectives and land use table/i.test(title);
};

const extractZoneBlockFromClause = (text: string, zoneCode: string | null) => {
  if (!zoneCode) return null;

  const normalized = text.replace(/\r\n/g, "\n");
  const headingRegex =
    /^\s*(?:\d+[.)]?\s*)?(?:clause\s*\d+(?:\.\d+)?[:.)-]?\s*)?zone\s+([A-Z]{1,3}\d?[A-Z]?)\b[^\n]*$/gim;
  const matches: { heading: string; code: string; index: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(normalized)) !== null) {
    matches.push({ heading: match[0].trim(), code: match[1].toUpperCase(), index: match.index });
  }

  const target = matches.find((entry) => entry.code === zoneCode.toUpperCase());
  if (!target) return null;

  const start = target.index + target.heading.length;
  const next = matches.find((entry) => entry.index > target.index);
  const end = next?.index ?? normalized.length;
  const block = normalized.slice(start, end).trim();

  return { heading: target.heading, block };
};

const findZoneHeading = (lines: string[], headingRegexes: RegExp[]): { heading: string; index: number } | null => {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (headingRegexes.some((regex) => regex.test(line))) {
      return { heading: line, index };
    }
  }
  return null;
};

const sliceZoneBlock = (
  text: string,
  zoneCode: string | null,
  headingHint: string | null = null,
): { heading: string | null; block: string; source: ZoneClauseSelection["source"] } | null => {
  if (!zoneCode) return null;

  const normalized = text.replace(/\r\n/g, "\n");
  const anyZoneHeadingRegex =
    /(^|\n)\s*(?:\d+[.)]?\s*)?(?:clause\s*\d+(?:\.\d+)?[:.)-]?\s*)?zone\s+[A-Z]{1,3}\d?[A-Z]?\b[^\n]*/gi;
  const headingMatches = Array.from(normalized.matchAll(anyZoneHeadingRegex));

  const hintedHeading = headingHint
    ? headingMatches.find((match) => match[0] && match[0].toLowerCase().includes(headingHint.toLowerCase()))
    : null;
  const targetHeading =
    headingMatches.find((match) => new RegExp(`\b${zoneCode}\b`, "i").test(match[0])) ?? hintedHeading ?? null;

  if (targetHeading) {
    const headingText = targetHeading[0].trim();
    const start = (targetHeading.index ?? 0) + targetHeading[0].length;
    const nextHeading = headingMatches.find((match) => (match.index ?? 0) > (targetHeading.index ?? 0));
    const end = nextHeading?.index ?? normalized.length;
    const block = normalized.slice(start, end).trim();
    return { heading: headingText, block, source: "heading" };
  }

  const regexWindow = normalized.match(
    new RegExp(`zone\s+${zoneCode}\b[\s\S]*?(?=zone\s+[A-Z]{1,3}\d?[A-Z]?\b|$)`, "i"),
  );
  if (regexWindow && typeof regexWindow.index === "number") {
    const headingLineMatch = regexWindow[0].match(/^(.*)$/m);
    const heading = headingLineMatch ? headingLineMatch[0].trim() : null;
    const block = regexWindow[0].replace(headingLineMatch?.[0] ?? "", "").trim();
    return { heading, block, source: "regex-window" };
  }

  const lineWithZone = normalized.match(new RegExp(`(^|\n)[^\n]*\b${zoneCode}\b[^\n]*`, "i"));
  if (lineWithZone && typeof lineWithZone.index === "number") {
    const start = normalized.lastIndexOf("\n\n", lineWithZone.index);
    const end = normalized.indexOf("\n\n", lineWithZone.index + lineWithZone[0].length);
    const block = normalized.slice(start >= 0 ? start : 0, end >= 0 ? end : normalized.length).trim();
    return { heading: headingHint, block, source: "fallback" };
  }

  return null;
};

const extractZoneSection = (
  clause: ClauseSummary,
  zoneCode: string | null,
  headingHint: string | null = null,
): ZoneClauseSelection => {
  const text = cleanXmlLikeString(clause.bodyText);
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const headingRegexes = [
    zoneCode
      ? new RegExp(`^\s*(?:\d+[.)]?\s*)?(?:clause\s*\d+(?:\.\d+)?[:.)-]?\s*)?zone\s+${zoneCode}\b.*`, "i")
      : null,
    zoneCode
      ? new RegExp(`^\s*(?:\d+[.)]?\s*)?(?:clause\s*\d+(?:\.\d+)?[:.)-]?\s*)?${zoneCode}\b.*`, "i")
      : null,
  ].filter(Boolean) as RegExp[];

  const hintedHeading = headingHint
    ? findZoneHeading(lines, [new RegExp(headingHint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")])
    : null;
  const detectedHeading = findZoneHeading(lines, headingRegexes);
  const headingCandidate = hintedHeading?.heading ?? detectedHeading?.heading ?? null;
  const blockFromRegex = sliceZoneBlock(text, zoneCode, headingCandidate);

  if (blockFromRegex) {
    return {
      clause,
      matchedHeading: blockFromRegex.heading,
      sectionText: blockFromRegex.block,
      source: blockFromRegex.source,
    } satisfies ZoneClauseSelection;
  }

  const fallbackSection = normalized.trim();
  return { clause, matchedHeading: headingCandidate, sectionText: fallbackSection, source: "fallback" };
};

  const pickZoneClause = (clauses: ClauseSummary[], zoneCode: string | null): ZoneClausePick => {
  if (!clauses.length)
    return {
      selection: null,
      debug: {
        anchorClauseKey: null,
        anchorTitle: null,
        headingMatch: null,
        candidateCount: 0,
        excludedGlobalClauses: [],
        usedGlobalFallback: false,
      },
    } satisfies ZoneClausePick;

  const zonePattern = zoneCode ? new RegExp(`\bzone\s+${zoneCode}\b`, "i") : null;
  const headingRegexes = [
    zoneCode
      ? new RegExp(`^\s*(?:\d+[.)]?\s*)?(?:clause\s*\d+(?:\.\d+)?[:.)-]?\s*)?zone\s+${zoneCode}\b.*`, "i")
      : null,
    zoneCode
      ? new RegExp(`^\s*(?:\d+[.)]?\s*)?(?:clause\s*\d+(?:\.\d+)?[:.)-]?\s*)?${zoneCode}\b.*`, "i")
      : null,
  ].filter(Boolean) as RegExp[];

  const scored = clauses.map((clause) => {
    const lines = (clause.bodyText ?? "").replace(/\r\n/g, "\n").split("\n");
    const headingMatch = findZoneHeading(lines, headingRegexes);
    const isGlobal = GLOBAL_ZONE_PATTERNS.some((pattern) => pattern.test(clause.bodyText ?? ""));
    const titleText = clause.title ?? "";

    let score = 0;
    if (clause.clauseKey.startsWith("2")) score += 1;
    if (clause.hierarchyPath?.some((entry) => /part\s*2/i.test(entry))) score += 1;
    if (clause.hierarchyPath?.some((entry) => /schedule\s*1/i.test(entry))) score += 2;
    if (clause.hierarchyPath?.some((entry) => /land use table/i.test(entry))) score += 5;
    if (/land use table/i.test(titleText)) score += 4;
    if (/zone objectives and land use table/i.test(titleText)) score += 6;
    if (/objectives of/i.test(titleText)) score += 2;
    if (/zone objectives/i.test(clause.bodyText ?? "")) score += 2;
    if (headingMatch) score += 12;
    if (zonePattern?.test(titleText)) score += 8;
    if (!score && zonePattern?.test(clause.bodyText ?? "")) score += 4;
    if (!score && zoneCode && new RegExp(`\b${zoneCode}\b`, "i").test(titleText)) score += 3;
    if (!score && zoneCode && new RegExp(`\b${zoneCode}\b`, "i").test(clause.bodyText ?? "")) score += 2;
    if (isGlobal) score -= 100;

    return { clause, score, headingMatch: headingMatch?.heading ?? null, isGlobal };
  });

  const excludedGlobalClauses = scored.filter(({ isGlobal }) => isGlobal).map(({ clause }) => clause.clauseKey);
  const preferredPool = scored.filter(({ isGlobal }) => !isGlobal);
  const pool = preferredPool.length ? preferredPool : scored;

  const winner = pool.sort((first, second) => second.score - first.score)[0] ?? null;

  const selection = winner ? extractZoneSection(winner.clause, zoneCode, winner.headingMatch) : null;

  return {
    selection,
    debug: {
      anchorClauseKey: winner?.clause.clauseKey ?? null,
      anchorTitle: winner?.clause.title ?? null,
      headingMatch: selection?.matchedHeading ?? winner?.headingMatch ?? null,
      candidateCount: clauses.length,
      excludedGlobalClauses,
      usedGlobalFallback: !preferredPool.length && Boolean(winner),
    },
  } satisfies ZoneClausePick;
};

const buildZoneSummary = (
  selection: ZoneClauseSelectionResult,
  zoneCode: string | null,
  pickDebug: ZoneClausePick["debug"],
  extras: Partial<ZoneSummary["debug"]> = {},
): ZoneSummary => {
  const notFoundReason = zoneCode
    ? `No zone-specific objectives found for zone ${zoneCode}.`
    : "No zone-specific objectives found.";

  const noLandUseReason = zoneCode
    ? `No zone-specific land use table entries found for zone ${zoneCode}.`
    : "No zone-specific land use entries found.";

  const landUseTableSectionFound = extras.landUseTableSectionFound ?? false;
  const landUseTableSectionHeading = extras.landUseTableSectionHeading ?? null;
  const landUseZoneBlockFound = extras.landUseZoneBlockFound ?? false;
  const landUseZoneBlockHeading = extras.landUseZoneBlockHeading ?? null;
  const landUseExtractionMode = extras.landUseExtractionMode ?? null;
  const landUseResolvedViaLink = extras.landUseResolvedViaLink ?? false;
  const landUseResolvedTargetIds = extras.landUseResolvedTargetIds ?? [];
  const landUseZoneClausegroupId = extras.landUseZoneClausegroupId ?? null;
  const lepSource = extras.lepSource ?? "db";
  const lepSourceError = extras.lepSourceError ?? null;

  if (!selection) {
    const debug = {
      headingMatch: null,
      zoneTableClauseKey: null,
      zoneTableClauseTitle: null,
      zoneObjectiveSource: "fallback" as const,
      landUseSource: null,
      zoneAnchorClauseKey: pickDebug.anchorClauseKey,
      zoneAnchorTitle: pickDebug.anchorTitle,
      zoneCandidateCount: pickDebug.candidateCount,
      excludedGlobalZoneClauses: pickDebug.excludedGlobalClauses,
      usedGlobalZoneFallback: pickDebug.usedGlobalFallback,
      zoneClauseKey: extras.zoneClauseKey ?? null,
      zoneClauseTitle: extras.zoneClauseTitle ?? null,
      zoneBlockFound: extras.zoneBlockFound ?? false,
      zoneBlockHeading: extras.zoneBlockHeading ?? null,
      landUseTableSectionFound,
      landUseTableSectionHeading,
      landUseZoneBlockFound,
      landUseZoneBlockHeading,
      landUseZoneClausegroupId,
      objectivesCount: 0,
      landUseCounts: { withoutConsent: 0, withConsent: 0, prohibited: 0 },
      landUseExtractionMode,
      landUseResolvedViaLink,
      landUseResolvedTargetIds,
      lepSource,
      lepSourceError,
      usedFallback: extras.usedFallback ?? false,
      fallbackReason: extras.fallbackReason ?? null,
      notes: ["No clause matched zone heading"],
    } satisfies ZoneSummary["debug"];

    return {
      objectives: [notFoundReason],
      landUse: {
        withoutConsent: [noLandUseReason],
        withConsent: [],
        prohibited: [],
      },
      debug,
    };
  }

  if (GLOBAL_ZONE_PATTERNS.some((pattern) => pattern.test(selection.sectionText))) {
    return {
      objectives: [notFoundReason],
      landUse: {
        withoutConsent: [noLandUseReason],
        withConsent: [],
        prohibited: [],
      },
      debug: {
        headingMatch: selection.matchedHeading,
        zoneTableClauseKey: selection.clause.clauseKey ?? null,
        zoneTableClauseTitle: selection.clause.title ?? null,
        zoneObjectiveSource: "fallback",
        landUseSource: extras.landUseSource ?? null,
        zoneAnchorClauseKey: pickDebug.anchorClauseKey,
        zoneAnchorTitle: pickDebug.anchorTitle,
        zoneCandidateCount: pickDebug.candidateCount,
        excludedGlobalZoneClauses: pickDebug.excludedGlobalClauses,
        usedGlobalZoneFallback: pickDebug.usedGlobalFallback,
        zoneClauseKey: extras.zoneClauseKey ?? selection.clause.clauseKey ?? null,
        zoneClauseTitle: extras.zoneClauseTitle ?? selection.clause.title ?? null,
        zoneBlockFound: extras.zoneBlockFound ?? true,
        zoneBlockHeading: extras.zoneBlockHeading ?? selection.matchedHeading ?? null,
        landUseTableSectionFound,
        landUseTableSectionHeading,
        landUseZoneBlockFound,
        landUseZoneBlockHeading,
        landUseZoneClausegroupId,
        objectivesCount: 0,
        landUseCounts: { withoutConsent: 0, withConsent: 0, prohibited: 0 },
        landUseExtractionMode,
        landUseResolvedViaLink,
        landUseResolvedTargetIds,
        lepSource,
        lepSourceError,
        usedFallback: extras.usedFallback ?? false,
        fallbackReason: extras.fallbackReason ?? null,
        notes: ["Matched clause contained global zone list"],
      },
    };
  }

    if (zoneCode && !new RegExp(`\b${zoneCode}\b`, "i").test(selection.sectionText)) {
      const debug = {
        headingMatch: selection.matchedHeading,
        zoneTableClauseKey: selection.clause.clauseKey ?? null,
        zoneTableClauseTitle: selection.clause.title ?? null,
        zoneObjectiveSource: "fallback" as const,
        landUseSource: extras.landUseSource ?? null,
        zoneAnchorClauseKey: pickDebug.anchorClauseKey,
        zoneAnchorTitle: pickDebug.anchorTitle,
        zoneCandidateCount: pickDebug.candidateCount,
        excludedGlobalZoneClauses: pickDebug.excludedGlobalClauses,
        usedGlobalZoneFallback: pickDebug.usedGlobalFallback,
        zoneClauseKey: extras.zoneClauseKey ?? selection.clause.clauseKey ?? null,
        zoneClauseTitle: extras.zoneClauseTitle ?? selection.clause.title ?? null,
        zoneBlockFound: extras.zoneBlockFound ?? true,
        zoneBlockHeading: extras.zoneBlockHeading ?? selection.matchedHeading ?? null,
        landUseTableSectionFound,
        landUseTableSectionHeading,
        landUseZoneBlockFound,
        landUseZoneBlockHeading,
        landUseZoneClausegroupId,
        objectivesCount: 0,
        landUseCounts: { withoutConsent: 0, withConsent: 0, prohibited: 0 },
        landUseExtractionMode,
        landUseResolvedViaLink,
        landUseResolvedTargetIds,
        lepSource,
        lepSourceError,
        usedFallback: extras.usedFallback ?? false,
        fallbackReason: extras.fallbackReason ?? null,
        notes: ["Zone code not found in selected clause body"],
      } satisfies ZoneSummary["debug"];

      return {
        objectives: [notFoundReason],
        landUse: {
          withoutConsent: [noLandUseReason],
          withConsent: [],
          prohibited: [],
        },
        debug,
      };
    }

  const parsed = parseZoneContent(selection.sectionText);

  const objectiveSource: ZoneSummary["debug"]["zoneObjectiveSource"] = parsed.objectives.length
    ? parsed.looksTabular
      ? "table"
      : "text-block"
    : "fallback";
  const fallbackObjectives = parsed.objectives.length ? parsed.objectives : [notFoundReason];
  const hasLandUse = parsed.withoutConsent.length || parsed.withConsent.length || parsed.prohibited.length;
  const landUseSource: ZoneSummary["debug"]["landUseSource"] = hasLandUse
    ? parsed.looksTabular
      ? "table"
      : "text-block"
    : "clause-fallback";
  const landUseFallback = hasLandUse
    ? { withoutConsent: parsed.withoutConsent, withConsent: parsed.withConsent, prohibited: parsed.prohibited }
    : { withoutConsent: [noLandUseReason], withConsent: [], prohibited: [] };

  const landUseCounts = {
    withoutConsent: parsed.withoutConsent.length,
    withConsent: parsed.withConsent.length,
    prohibited: parsed.prohibited.length,
  };

  return {
    objectives: fallbackObjectives,
    landUse: landUseFallback,
    debug: {
      headingMatch: selection.matchedHeading,
      zoneTableClauseKey: selection.clause.clauseKey ?? null,
      zoneTableClauseTitle: selection.clause.title ?? null,
      zoneObjectiveSource: objectiveSource,
      landUseSource: extras.landUseSource ?? landUseSource,
      zoneAnchorClauseKey: pickDebug.anchorClauseKey,
      zoneAnchorTitle: pickDebug.anchorTitle,
      zoneCandidateCount: pickDebug.candidateCount,
      excludedGlobalZoneClauses: pickDebug.excludedGlobalClauses,
      usedGlobalZoneFallback: pickDebug.usedGlobalFallback,
      zoneClauseKey: extras.zoneClauseKey ?? selection.clause.clauseKey ?? null,
      zoneClauseTitle: extras.zoneClauseTitle ?? selection.clause.title ?? null,
      zoneBlockFound: extras.zoneBlockFound ?? true,
      zoneBlockHeading: extras.zoneBlockHeading ?? selection.matchedHeading ?? null,
      landUseTableSectionFound,
      landUseTableSectionHeading,
      landUseZoneBlockFound,
      landUseZoneBlockHeading,
      landUseZoneClausegroupId,
      objectivesCount: parsed.objectives.length,
      landUseCounts,
      landUseExtractionMode,
      landUseResolvedViaLink,
      landUseResolvedTargetIds,
      lepSource,
      lepSourceError,
      usedFallback: extras.usedFallback ?? false,
      fallbackReason: extras.fallbackReason ?? null,
      notes: selection.source === "fallback" ? ["Zone heading not found; used nearest matching block"] : [],
    },
  };
};

const buildStoredZoneSummary = (
  zoneCode: string,
  objectives: LepZoneObjective[],
  landUses: LepZoneLandUse[],
): ZoneSummary => {
  const notFoundReason = `No zone-specific objectives found for zone ${zoneCode}.`;
  const noLandUseReason = `No zone-specific land use table entries found for zone ${zoneCode}.`;

  const objectiveTexts = objectives.map((entry) => entry.objective).filter(Boolean);
  const landUseBuckets = landUses.reduce(
    (acc, entry) => {
      if (entry.permission === "WITHOUT_CONSENT") acc.withoutConsent.push(entry.description);
      if (entry.permission === "WITH_CONSENT") acc.withConsent.push(entry.description);
      if (entry.permission === "PROHIBITED") acc.prohibited.push(entry.description);
      return acc;
    },
    { withoutConsent: [] as string[], withConsent: [] as string[], prohibited: [] as string[] },
  );

  const hasLandUse =
    landUseBuckets.withoutConsent.length || landUseBuckets.withConsent.length || landUseBuckets.prohibited.length;

  return {
    objectives: objectiveTexts.length ? objectiveTexts : [notFoundReason],
    landUse: hasLandUse
      ? landUseBuckets
      : { withoutConsent: [noLandUseReason], withConsent: [], prohibited: [] },
    debug: {
      headingMatch: null,
      zoneTableClauseKey: null,
      zoneTableClauseTitle: null,
      zoneObjectiveSource: "ingested",
      landUseSource: hasLandUse ? "ingested" : "clause-fallback",
      zoneAnchorClauseKey: null,
      zoneAnchorTitle: null,
      zoneCandidateCount: 0,
      excludedGlobalZoneClauses: [],
      usedGlobalZoneFallback: false,
      zoneClauseKey: null,
      zoneClauseTitle: null,
      zoneBlockFound: false,
      zoneBlockHeading: null,
      landUseTableSectionFound: false,
      landUseTableSectionHeading: null,
      landUseZoneBlockFound: false,
      landUseZoneBlockHeading: null,
      landUseZoneClausegroupId: null,
      objectivesCount: objectiveTexts.length,
      landUseCounts: {
        withoutConsent: landUseBuckets.withoutConsent.length,
        withConsent: landUseBuckets.withConsent.length,
        prohibited: landUseBuckets.prohibited.length,
      },
      landUseExtractionMode: null,
      landUseResolvedViaLink: false,
      landUseResolvedTargetIds: [],
      lepSource: "db",
      lepSourceError: null,
      usedFallback: false,
      fallbackReason: null,
      notes: [],
    },
  };
};

const findLepInstrumentForLga = async (lga: string) => {
  const filter = buildLepInstrumentFilter(lga);

  const instrument = await prisma.instrument.findFirst({
    where: {
      ...filter,
      clauses: { some: { isCurrent: true } },
    },
    orderBy: [
      { lastSyncedAt: "desc" },
      { createdAt: "desc" },
    ],
  });

  return instrument;
};

export const buildQuickSiteCheckLep = async (
  projectId: string,
  options: { debug?: boolean } = {},
): Promise<QuickSiteCheckLepResponse> => {
  const errorContext: { projectId?: string; lepName?: string; lga?: string | null; zone?: string | null } = {
    projectId,
    lga: null,
    zone: null,
  };
  try {
    const normalizedId = normalizeProjectId(projectId);
    const project = await findProjectByExternalId(prisma, normalizedId);

    if (!project) {
      return { ok: false, message: "Project not found" } satisfies QuickSiteCheckLepResponse;
    }

    const siteContext = await prisma.siteContext.findUnique({ where: { projectId: project.id } });
    const siteSummary = serializeSiteContext(siteContext, project);

    const lga = siteSummary?.lgaName ?? siteSummary?.lgaCode ?? null;
    errorContext.projectId = project.id;
    errorContext.lga = lga;
    const zone =
      project.zoningCode ??
      siteSummary?.zoningCode ??
      siteSummary?.zoningName ??
      siteSummary?.zone ??
      project.zoningName ??
      null;

    const zoneCode = toZoneCode(zone);
    errorContext.zone = zoneCode;

    if (!lga) {
      return {
        ok: false,
        projectId: project.id,
        message: "Set a site with LGA to run LEP Quick Site Check.",
      } satisfies QuickSiteCheckLepResponse;
    }

    if (!zoneCode) {
      return {
        ok: false,
        projectId: project.id,
        message: "Zone not set for this project. Set the site and zoning first to run LEP Quick Site Check.",
      } satisfies QuickSiteCheckLepResponse;
    }

    const lepInstrument = await findLepInstrumentForLga(lga);
    errorContext.lepName = lepInstrument?.name;

    if (!lepInstrument) {
      return {
        ok: false,
        projectId: project.id,
        message: "LEP data for this council is not loaded yet. Quick Site Check will work once LEP is ingested.",
      } satisfies QuickSiteCheckLepResponse;
    }

    const [storedObjectives, storedLandUses] = await Promise.all([
      prisma.lepZoneObjective.findMany({ where: { instrumentId: lepInstrument.id, zoneCode } }),
      prisma.lepZoneLandUse.findMany({ where: { instrumentId: lepInstrument.id, zoneCode } }),
    ]);

    const hasStoredZoneData = storedObjectives.length > 0 || storedLandUses.length > 0;

    const zonePattern = `Zone ${zoneCode}`;

    const allClauses = await prisma.clause.findMany({
      where: {
        instrumentId: lepInstrument.id,
        isCurrent: true,
      },
      orderBy: { clauseKey: "asc" },
      select: { clauseKey: true, title: true, bodyText: true, hierarchyPath: true },
    });

    let zoneSummary: ZoneSummary = {
      objectives: [],
      landUse: { withoutConsent: [], withConsent: [], prohibited: [] },
      debug: {
        headingMatch: null,
        zoneTableClauseKey: null,
        zoneTableClauseTitle: null,
        zoneObjectiveSource: "fallback",
        landUseSource: null,
        zoneAnchorClauseKey: null,
        zoneAnchorTitle: null,
        zoneCandidateCount: 0,
        excludedGlobalZoneClauses: [],
        usedGlobalZoneFallback: false,
        zoneClauseKey: null,
        zoneClauseTitle: null,
        zoneBlockFound: false,
        zoneBlockHeading: null,
        landUseTableSectionFound: false,
        landUseTableSectionHeading: null,
        landUseZoneBlockFound: false,
        landUseZoneBlockHeading: null,
        landUseZoneClausegroupId: null,
        objectivesCount: 0,
        landUseCounts: { withoutConsent: 0, withConsent: 0, prohibited: 0 },
        landUseExtractionMode: null,
        landUseResolvedViaLink: false,
        landUseResolvedTargetIds: [],
        lepSource: "db",
        lepSourceError: null,
        usedFallback: false,
        fallbackReason: null,
        notes: [],
      },
    };
    let zonePick: ZoneClausePick | null = null;
    let usedFallback = false;
    let fallbackReason: string | null = null;

    if (hasStoredZoneData) {
      zoneSummary = buildStoredZoneSummary(zoneCode, storedObjectives, storedLandUses);
    } else {
      const clauseTwoThree = allClauses.find(isClauseTwoThree) ?? null;
      const landUseTableClause = findLandUseTableClause(allClauses, zoneCode);
      const instrumentConfig = getInstrumentConfig(lepInstrument.slug);
      let lepSource: ZoneSummary["debug"]["lepSource"] = "db";
      let lepSourceError: string | null = null;

      let xmlDocument: string | null = null;
      if (instrumentConfig?.xmlLocalPath) {
        try {
          if (fs.existsSync(instrumentConfig.xmlLocalPath)) {
            xmlDocument = await fs.promises.readFile(instrumentConfig.xmlLocalPath, "utf-8");
            lepSource = "local-xml";
          } else {
            lepSourceError = `Local XML not found at ${instrumentConfig.xmlLocalPath}`;
          }
        } catch (error) {
          lepSourceError = error instanceof Error ? error.message : String(error);
          console.error("[quick-site-check-lep] Failed to load local XML", {
            lep: lepInstrument.slug,
            path: instrumentConfig.xmlLocalPath,
            error,
          });
        }
      }

      let landUseTableXmlBlock = null as ReturnType<typeof extractZoneBlockFromLandUseXml>;
      let landUseClausegroupExtraction = null as ReturnType<typeof extractZoneFromXmlClausegroup>;
      if (xmlDocument) {
        try {
          landUseTableXmlBlock = extractZoneBlockFromLandUseXml(xmlDocument, zoneCode);
          landUseClausegroupExtraction = extractZoneFromXmlClausegroup(xmlDocument, zoneCode);
        } catch (error) {
          lepSourceError = error instanceof Error ? error.message : String(error);
          lepSource = "db";
          console.error("[quick-site-check-lep] Failed to parse local XML for land use table", {
            lep: lepInstrument.slug,
            path: instrumentConfig?.xmlLocalPath,
            error,
          });
        }
      }
      if (xmlDocument && !landUseTableXmlBlock && !landUseClausegroupExtraction) {
        lepSource = "db";
        lepSourceError =
          lepSourceError ??
          (zoneCode ? `Zone block not found in local XML for ${zoneCode}` : "Zone block not found in local XML");
      }
      const landUseTableText = landUseTableClause ? cleanXmlLikeString(landUseTableClause.bodyText) : "";
      const landUseTableBlock = landUseTableClause
        ? extractZoneBlockFromClause(landUseTableText, zoneCode)
        : null;
      const landUseTableSectionFound = Boolean(landUseTableClause || landUseTableXmlBlock || landUseClausegroupExtraction);
      const landUseTableSectionHeading = landUseClausegroupExtraction
        ? "Land Use Table"
        : landUseTableXmlBlock
          ? "Land Use Table"
          : landUseTableClause?.title ?? null;
      const landUseZoneBlockFound = Boolean(
        landUseClausegroupExtraction || landUseTableXmlBlock || landUseTableBlock,
      );
      const landUseZoneBlockHeading =
        landUseClausegroupExtraction?.heading ?? landUseTableXmlBlock?.heading ?? landUseTableBlock?.heading ?? null;
      const landUseZoneClausegroupId = landUseClausegroupExtraction?.clausegroupId ?? null;
      const lepSourceExtras: Partial<ZoneSummary["debug"]> = { lepSource, lepSourceError };

      if (landUseClausegroupExtraction) {
        const syntheticBlockSections: string[] = [];
        syntheticBlockSections.push("Objectives of zone");
        syntheticBlockSections.push(...landUseClausegroupExtraction.objectives);
        syntheticBlockSections.push("Permitted without consent");
        syntheticBlockSections.push(...landUseClausegroupExtraction.withoutConsent);
        syntheticBlockSections.push("Permitted with consent");
        syntheticBlockSections.push(...landUseClausegroupExtraction.withConsent);
        syntheticBlockSections.push("Prohibited");
        syntheticBlockSections.push(...landUseClausegroupExtraction.prohibited);

        const syntheticBlock = syntheticBlockSections.join("\n");

        const clauseForXml: ClauseSummary = landUseTableClause
          ? {
              clauseKey: landUseTableClause.clauseKey,
              title: landUseTableClause.title ?? "Land Use Table",
              bodyText: syntheticBlock,
              hierarchyPath: landUseTableClause.hierarchyPath ?? [],
            }
          : {
              clauseKey: landUseClausegroupExtraction.clausegroupId ?? `land-use-table-${zoneCode}`,
              title: landUseClausegroupExtraction.heading ?? "Land Use Table",
              bodyText: syntheticBlock,
              hierarchyPath: [],
            };

        const landUseSelection: ZoneClauseSelection = {
          clause: clauseForXml,
          matchedHeading: landUseClausegroupExtraction.heading,
          sectionText: syntheticBlock,
          source: "heading",
        };

        const landUseDebug: ZoneClausePick["debug"] = {
          anchorClauseKey: clauseForXml.clauseKey ?? null,
          anchorTitle: clauseForXml.title ?? null,
          headingMatch: landUseClausegroupExtraction.heading ?? null,
          candidateCount: landUseTableClause ? 1 : 0,
          excludedGlobalClauses: [],
          usedGlobalFallback: false,
        } satisfies ZoneClausePick["debug"];

        const summaryFromLandUseTable = buildZoneSummary(landUseSelection, zoneCode, landUseDebug, {
          zoneClauseKey: clauseForXml.clauseKey ?? null,
          zoneClauseTitle: clauseForXml.title ?? null,
          zoneBlockFound: true,
          zoneBlockHeading: landUseClausegroupExtraction.heading ?? null,
          landUseTableSectionFound,
          landUseTableSectionHeading,
          landUseZoneBlockFound,
          landUseZoneBlockHeading,
          landUseZoneClausegroupId,
          landUseSource: "land-use-table",
          landUseExtractionMode: landUseClausegroupExtraction.extractionMode,
          landUseResolvedViaLink: false,
          landUseResolvedTargetIds: [],
          ...lepSourceExtras,
        });

        const hasLandUseFromTable =
          summaryFromLandUseTable.debug.landUseCounts.withoutConsent > 0 ||
          summaryFromLandUseTable.debug.landUseCounts.withConsent > 0 ||
          summaryFromLandUseTable.debug.landUseCounts.prohibited > 0;

        const hasObjectives = summaryFromLandUseTable.debug.objectivesCount > 0;

        if (hasLandUseFromTable || hasObjectives) {
          zoneSummary = summaryFromLandUseTable;
        } else {
          usedFallback = true;
          fallbackReason = fallbackReason ?? "No land use entries found in Land Use Table section for the requested zone";
        }
      } else if (landUseTableXmlBlock) {
        const clauseForXml: ClauseSummary = landUseTableClause
          ? {
              clauseKey: landUseTableClause.clauseKey,
              title: landUseTableClause.title ?? "Land Use Table",
              bodyText: landUseTableXmlBlock.block,
              hierarchyPath: landUseTableClause.hierarchyPath ?? [],
            }
          : {
              clauseKey: `land-use-table-${zoneCode}`,
              title: "Land Use Table",
              bodyText: landUseTableXmlBlock.block,
              hierarchyPath: [],
            };

        const landUseSelection: ZoneClauseSelection = {
          clause: clauseForXml,
          matchedHeading: landUseTableXmlBlock.heading,
          sectionText: landUseTableXmlBlock.block,
          source: "heading",
        };

        const landUseDebug: ZoneClausePick["debug"] = {
          anchorClauseKey: clauseForXml.clauseKey ?? null,
          anchorTitle: clauseForXml.title ?? null,
          headingMatch: landUseTableXmlBlock.heading ?? null,
          candidateCount: landUseTableClause ? 1 : 0,
          excludedGlobalClauses: [],
          usedGlobalFallback: false,
        } satisfies ZoneClausePick["debug"];

        const summaryFromLandUseTable = buildZoneSummary(landUseSelection, zoneCode, landUseDebug, {
          zoneClauseKey: clauseForXml.clauseKey ?? null,
          zoneClauseTitle: clauseForXml.title ?? null,
          zoneBlockFound: true,
          zoneBlockHeading: landUseTableXmlBlock.heading ?? null,
          landUseTableSectionFound,
          landUseTableSectionHeading,
          landUseZoneBlockFound,
          landUseZoneBlockHeading,
          landUseZoneClausegroupId,
          landUseSource: "land-use-table",
          landUseExtractionMode: landUseTableXmlBlock.extractionMode,
          landUseResolvedViaLink: landUseTableXmlBlock.resolvedViaLink,
          landUseResolvedTargetIds: landUseTableXmlBlock.resolvedTargetIds,
          ...lepSourceExtras,
        });

        const hasLandUseFromTable =
          summaryFromLandUseTable.debug.landUseCounts.withoutConsent > 0 ||
          summaryFromLandUseTable.debug.landUseCounts.withConsent > 0 ||
          summaryFromLandUseTable.debug.landUseCounts.prohibited > 0;

        if (hasLandUseFromTable) {
          zoneSummary = summaryFromLandUseTable;
        } else {
          usedFallback = true;
          fallbackReason = fallbackReason ?? "No land use entries found in Land Use Table section for the requested zone";
        }
      } else if (landUseTableClause) {
        if (landUseTableBlock) {
          const landUseSelection: ZoneClauseSelection = {
            clause: landUseTableClause,
            matchedHeading: landUseTableBlock.heading,
            sectionText: landUseTableBlock.block,
            source: "heading",
          };

          const landUseDebug: ZoneClausePick["debug"] = {
            anchorClauseKey: landUseTableClause.clauseKey ?? null,
            anchorTitle: landUseTableClause.title ?? null,
            headingMatch: landUseTableBlock.heading ?? null,
            candidateCount: 1,
            excludedGlobalClauses: [],
            usedGlobalFallback: false,
          } satisfies ZoneClausePick["debug"];

          const summaryFromLandUseTable = buildZoneSummary(landUseSelection, zoneCode, landUseDebug, {
            zoneClauseKey: landUseTableClause.clauseKey ?? null,
            zoneClauseTitle: landUseTableClause.title ?? null,
            zoneBlockFound: true,
            zoneBlockHeading: landUseTableBlock.heading ?? null,
            landUseTableSectionFound,
            landUseTableSectionHeading,
            landUseZoneBlockFound,
            landUseZoneBlockHeading,
            landUseZoneClausegroupId,
            landUseSource: "land-use-table-section",
            landUseExtractionMode: "string-search",
            ...lepSourceExtras,
          });

          const hasLandUseFromTable =
            summaryFromLandUseTable.debug.landUseCounts.withoutConsent > 0 ||
            summaryFromLandUseTable.debug.landUseCounts.withConsent > 0 ||
            summaryFromLandUseTable.debug.landUseCounts.prohibited > 0;

          if (hasLandUseFromTable) {
            zoneSummary = summaryFromLandUseTable;
          } else {
            usedFallback = true;
            fallbackReason =
              fallbackReason ?? "No land use entries found in Land Use Table section for the requested zone";
          }
        } else {
          usedFallback = true;
          fallbackReason = fallbackReason ?? "Zone heading not found inside Land Use Table section";
        }
      }
      const landUseTableExtras: Partial<ZoneSummary["debug"]> = {
        landUseTableSectionFound,
        landUseTableSectionHeading,
        landUseZoneBlockFound,
        landUseZoneBlockHeading,
        landUseZoneClausegroupId,
        landUseExtractionMode: landUseClausegroupExtraction
          ? landUseClausegroupExtraction.extractionMode
          : landUseTableXmlBlock
            ? landUseTableXmlBlock.extractionMode
            : landUseTableBlock
              ? "string-search"
              : null,
        landUseResolvedViaLink: landUseTableXmlBlock?.resolvedViaLink ?? false,
        landUseResolvedTargetIds: landUseTableXmlBlock?.resolvedTargetIds ?? [],
        ...lepSourceExtras,
      };

      if (
        zoneSummary.debug.landUseSource !== "land-use-table-section" &&
        zoneSummary.debug.landUseSource !== "land-use-table"
      ) {
        const cleanedClauseText = clauseTwoThree ? cleanXmlLikeString(clauseTwoThree.bodyText) : "";
        const clauseTwoThreeBlock = extractZoneBlockFromClause(cleanedClauseText, zoneCode);

        const clauseTwoThreeSelection: ZoneClauseSelectionResult = clauseTwoThreeBlock
          ? {
              clause: clauseTwoThree!,
              matchedHeading: clauseTwoThreeBlock.heading,
              sectionText: clauseTwoThreeBlock.block,
              source: "heading",
            }
          : null;

        const clauseTwoThreeDebug: ZoneClausePick["debug"] = {
          anchorClauseKey: clauseTwoThree?.clauseKey ?? null,
          anchorTitle: clauseTwoThree?.title ?? null,
          headingMatch: clauseTwoThreeBlock?.heading ?? null,
          candidateCount: clauseTwoThree ? 1 : 0,
          excludedGlobalClauses: [],
          usedGlobalFallback: false,
        } satisfies ZoneClausePick["debug"];

        if (clauseTwoThreeSelection) {
          const summaryFromTwoThree = buildZoneSummary(clauseTwoThreeSelection, zoneCode, clauseTwoThreeDebug, {
            zoneClauseKey: clauseTwoThree?.clauseKey ?? null,
            zoneClauseTitle: clauseTwoThree?.title ?? null,
            zoneBlockFound: true,
            zoneBlockHeading: clauseTwoThreeBlock?.heading ?? null,
            ...landUseTableExtras,
            ...lepSourceExtras,
          });

          const hasParsedContent =
            summaryFromTwoThree.debug.objectivesCount > 0 ||
            summaryFromTwoThree.debug.landUseCounts.withoutConsent > 0 ||
            summaryFromTwoThree.debug.landUseCounts.withConsent > 0 ||
            summaryFromTwoThree.debug.landUseCounts.prohibited > 0;

          if (hasParsedContent) {
            zoneSummary = summaryFromTwoThree;
          } else {
            usedFallback = true;
            fallbackReason = "No objectives or land use entries found in Part 2.3 zone block";
            zoneSummary = summaryFromTwoThree;
          }
        }

        if (!clauseTwoThreeSelection || usedFallback) {
          if (!clauseTwoThreeSelection && clauseTwoThree) {
            usedFallback = true;
            fallbackReason = fallbackReason ?? "Zone heading not found inside Part 2.3 clause";
          }

          const zoneClauses = allClauses.filter(
            (clause) =>
              clause.clauseKey?.startsWith("2") ||
              clause.hierarchyPath?.includes("Part 2") ||
              (clause.title && new RegExp(zonePattern, "i").test(clause.title)) ||
              (clause.bodyText && new RegExp(zonePattern, "i").test(clause.bodyText)) ||
              (clause.title && zoneCode && new RegExp(`\b${zoneCode}\b`, "i").test(clause.title)) ||
              (clause.bodyText && zoneCode && new RegExp(`\b${zoneCode}\b`, "i").test(clause.bodyText ?? "")),
          );

          zonePick = pickZoneClause(zoneClauses.length ? zoneClauses : allClauses, zoneCode);
          const chosenZoneClause = zonePick.selection;

          if (!chosenZoneClause) {
            console.warn("[quick-site-check-lep] No zone clause found", { lep: lepInstrument.name, zone: zoneCode });
          }

          const fallbackExtras: Partial<ZoneSummary["debug"]> = {
            usedFallback: usedFallback || !clauseTwoThreeSelection,
            fallbackReason,
            zoneClauseKey: clauseTwoThree?.clauseKey ?? null,
            zoneClauseTitle: clauseTwoThree?.title ?? null,
            zoneBlockFound: Boolean(clauseTwoThreeSelection),
            zoneBlockHeading: clauseTwoThreeBlock?.heading ?? null,
            ...landUseTableExtras,
          };

          zoneSummary = buildZoneSummary(chosenZoneClause, zoneCode, zonePick.debug, fallbackExtras);
        }
      }
    }

    const partBuckets: Record<"4" | "5" | "6", ClauseSummary[]> = { "4": [], "5": [], "6": [] };

    for (const clause of allClauses) {
      const part = derivePart(clause);
      if (part) {
        partBuckets[part].push(clause);
      }
    }

    const part4 = selectClauses("4", partBuckets["4"], zoneCode);
    const part5 = selectClauses("5", partBuckets["5"], zoneCode);
    const part6 = selectClauses("6", partBuckets["6"], zoneCode);

    const usedKeys = new Set(
      [...part4, ...part5, ...part6].map((clause) => `${clause.part}-${clause.clauseNumber}-${clause.heading}`),
    );

    let totalClauses = part4.length + part5.length + part6.length;
    if (totalClauses < 3 && allClauses.length) {
      const additional = allClauses
        .filter((clause) => {
          const key = `${derivePart(clause) ?? "?"}-${parseClauseNumber(clause)}-${clause.title ?? ""}`;
          return !usedKeys.has(key);
        })
        .map((clause) => {
          const part = derivePart(clause) ?? "4";
          return { clause, part, score: scoreClause(part, clause, zoneCode) };
        })
        .sort((first, second) => second.score - first.score)
        .slice(0, 3 - totalClauses);

      for (const extra of additional) {
        const targetPart = extra.part as "4" | "5" | "6";
        const snippet = {
          part: targetPart,
          clauseNumber: parseClauseNumber(extra.clause),
          heading: extra.clause.title ?? "",
          textSnippet: buildSnippet(extra.clause.bodyText),
        } satisfies QuickSiteCheckLepClause;
        if (targetPart === "4") part4.push(snippet);
        if (targetPart === "5") part5.push(snippet);
        if (targetPart === "6") part6.push(snippet);
        usedKeys.add(`${snippet.part}-${snippet.clauseNumber}-${snippet.heading}`);
        totalClauses += 1;
      }
    }



    const directLandUse = extractLandUseFromClauses(allClauses, zoneCode);
    if (directLandUse) {
      if (directLandUse.objectiveItems.length) zoneSummary.objectives = directLandUse.objectiveItems;
      if (
        directLandUse.permittedWithoutConsent.length ||
        directLandUse.permittedWithConsent.length ||
        directLandUse.prohibited.length
      ) {
        zoneSummary.landUse = {
          withoutConsent: directLandUse.permittedWithoutConsent,
          withConsent: directLandUse.permittedWithConsent,
          prohibited: directLandUse.prohibited,
        };
      }
    }

    const heightOfBuilding = buildControlValue(
      partBuckets["4"],
      zoneCode,
      /height of buildings?|building height/i,
      /(\d+(?:\.\d+)?\s*m)\b/i,
      "4.3",
    );
    const fsr = buildControlValue(
      partBuckets["4"],
      zoneCode,
      /floor space ratio|fsr/i,
      /(\d+(?:\.\d+)?\s*:\s*1)/i,
      "4.4",
    );
    const minLotSize = buildControlValue(
      partBuckets["4"],
      zoneCode,
      /minimum lot size|lot size/i,
      /(\d+(?:\.\d+)?\s*(?:m²|m2|sqm|square metres?|ha))/i,
      "4.1",
    );
    const realLandUseFound = hasRealLandUse(zoneSummary.landUse);
    const permissibility = realLandUseFound
      ? {
          permittedWithoutConsent: zoneSummary.landUse.withoutConsent,
          permittedWithConsent: zoneSummary.landUse.withConsent,
          prohibited: zoneSummary.landUse.prohibited,
        }
      : null;
    const controls = {
      heightOfBuilding,
      fsr,
      minLotSize,
      zoneObjectives: zoneSummary.objectives.length ? zoneSummary.objectives : null,
    };
    const dataSource = allClauses.length ? "db_clauses" : "fallback";

    const debugInfo: QuickSiteCheckLepSuccess["debug"] | undefined = options.debug
      ? {
          zoneHeadingMatch: zoneSummary.debug.headingMatch,
          zoneTableClauseKey: zoneSummary.debug.zoneTableClauseKey,
          zoneTableClauseTitle: zoneSummary.debug.zoneTableClauseTitle,
          zoneObjectiveSource: zoneSummary.debug.zoneObjectiveSource,
          landUseSource: zoneSummary.debug.landUseSource,
          zoneAnchorClauseKey: zoneSummary.debug.zoneAnchorClauseKey,
          zoneAnchorTitle: zoneSummary.debug.zoneAnchorTitle,
          zoneCandidateCount: zoneSummary.debug.zoneCandidateCount,
          excludedGlobalZoneClauses: zoneSummary.debug.excludedGlobalZoneClauses,
          usedGlobalZoneFallback: zoneSummary.debug.usedGlobalZoneFallback,
          zoneClauseKey: zoneSummary.debug.zoneClauseKey,
          zoneClauseTitle: zoneSummary.debug.zoneClauseTitle,
          zoneBlockFound: zoneSummary.debug.zoneBlockFound,
          zoneBlockHeading: zoneSummary.debug.zoneBlockHeading,
          landUseTableSectionFound: zoneSummary.debug.landUseTableSectionFound,
          landUseTableSectionHeading: zoneSummary.debug.landUseTableSectionHeading,
          landUseZoneBlockFound: zoneSummary.debug.landUseZoneBlockFound,
          landUseZoneBlockHeading: zoneSummary.debug.landUseZoneBlockHeading,
          landUseZoneClausegroupId: zoneSummary.debug.landUseZoneClausegroupId,
          objectivesCount: zoneSummary.debug.objectivesCount,
          landUseCounts: zoneSummary.debug.landUseCounts,
          landUseExtractionMode: zoneSummary.debug.landUseExtractionMode,
          landUseResolvedViaLink: zoneSummary.debug.landUseResolvedViaLink,
          landUseResolvedTargetIds: zoneSummary.debug.landUseResolvedTargetIds,
          lepSource: zoneSummary.debug.lepSource,
          lepSourceError: zoneSummary.debug.lepSourceError,
          usedFallback: zoneSummary.debug.usedFallback,
          fallbackReason: zoneSummary.debug.fallbackReason,
          partCandidateCounts: {
            "4": partBuckets["4"].length,
            "5": partBuckets["5"].length,
            "6": partBuckets["6"].length,
          },
          notes: zoneSummary.debug.notes,
        }
      : undefined;

    const part4Reason = part4.length
      ? undefined
      : partBuckets["4"].length
        ? "No relevant Part 4 clauses matched the heuristics."
        : "No Part 4 clauses found in LEP extract.";
    const part5Reason = part5.length
      ? undefined
      : partBuckets["5"].length
        ? "No relevant Part 5 clauses matched the heuristics."
        : "No Part 5 clauses found in LEP extract.";
    const part6Reason = part6.length
      ? undefined
      : partBuckets["6"].length
        ? "No relevant Part 6 clauses matched the heuristics."
        : "No Part 6 clauses found in LEP extract.";

    return {
      ok: true,
      projectId: project.id,
      lga: resolveCanonicalNswLga(lga) ?? lga,
      lepName: lepInstrument.name,
      zone: zoneCode,
      objectives: zoneSummary.objectives,
      controls,
      permissibility,
      dataSource,
      landUse: {
        withoutConsent: zoneSummary.landUse.withoutConsent,
        withConsent: zoneSummary.landUse.withConsent,
        prohibited: zoneSummary.landUse.prohibited,
      },
      part4,
      part5,
      part6,
      part4Reason,
      part5Reason,
      part6Reason,
      debug: debugInfo,
    } satisfies QuickSiteCheckLepResponse;
  } catch (error) {
    console.error("[quick-site-check-lep] failed", { errorContext, error });
    return {
      ok: false,
      projectId: errorContext.projectId,
      lepName: errorContext.lepName,
      lga: errorContext.lga ?? undefined,
      zone: errorContext.zone ?? null,
      error: error instanceof Error ? error.message : String(error),
      message: "Unable to run LEP Quick Site Check right now.",
    } satisfies QuickSiteCheckLepResponse;
  }
};
