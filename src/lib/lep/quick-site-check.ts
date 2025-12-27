import type { Clause } from "@prisma/client";

import type {
  QuickSiteCheckLepClause,
  QuickSiteCheckLepResponse,
  QuickSiteCheckLepSuccess,
} from "@/types/quick-site-check-lep";
import { getInstrumentConfig } from "../legislation/config";
import { LEP_XML_FIXTURES } from "../legislation/fixtures";

import { prisma } from "../prisma";
import { findProjectByExternalId, normalizeProjectId } from "../project-identifiers";
import { serializeSiteContext } from "../site-context";
import { buildLepInstrumentFilter } from "./lep-search";
import { resolveCanonicalNswLga } from "./nsw-lga-normaliser";
import { parse } from "node-html-parser";

type ClauseSummary = Pick<Clause, "clauseKey" | "title" | "bodyText" | "hierarchyPath">;

type ZoneSectionKey = "objectives" | "withoutConsent" | "withConsent" | "prohibited";

const GLOBAL_ZONE_PATTERNS = [
  /the land use zones under this plan are as follows/i,
  /zones under this plan are as follows/i,
  /the land use zones under this plan/i,
];

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

const ZONE_SECTION_HEADERS: { key: ZoneSectionKey; regex: RegExp }[] = [
  { key: "objectives", regex: /objectives of (the )?zone/i },
  { key: "withoutConsent", regex: /permitted without consent/i },
  { key: "withConsent", regex: /permitted with consent/i },
  { key: "prohibited", regex: /prohibited/i },
];

const toZoneCode = (value: string | null | undefined) => {
  if (!value) return null;
  const match = value.trim().match(/([A-Z]{1,3}\d?[A-Z]?)/i);
  return match ? match[1]?.toUpperCase() ?? null : null;
};

const splitZoneSections = (text: string): Record<ZoneSectionKey, string> => {
  const normalized = text.replace(/\r\n/g, "\n");
  const lower = normalized.toLowerCase();

  const matches = ZONE_SECTION_HEADERS.map((header) => {
    const match = lower.match(header.regex);
    if (!match || typeof match.index !== "number") return null;
    return { key: header.key, start: match.index, end: match.index + match[0].length };
  })
    .filter(Boolean)
    .sort((first, second) => (first!.start ?? 0) - (second!.start ?? 0)) as {
    key: ZoneSectionKey;
    start: number;
    end: number;
  }[];

  const sections: Record<ZoneSectionKey, string> = {
    objectives: "",
    withoutConsent: "",
    withConsent: "",
    prohibited: "",
  };

  matches.forEach((match, index) => {
    const nextStart = matches[index + 1]?.start ?? normalized.length;
    sections[match.key] = normalized.slice(match.end, nextStart).trim();
  });

  return sections;
};

const cleanListItems = (section: string): string[] => {
  if (!section) return [];

  const rawEntries = section
    .split(/\r?\n|;/)
    .flatMap((line) => line.split(/[•·\-–—]/))
    .map((entry) => entry.trim())
    .filter(Boolean);

  const cleaned = rawEntries
    .map((entry) => entry.replace(/^\d+[).]\s*/, "").replace(/^[-–—]\s*/, "").replace(/\s+[-–—]\s*$/, ""))
    .map((entry) => entry.replace(/^\W+/, "").replace(/\s+$/, ""))
    .map((entry) => entry.replace(/\[[^\]]+\]/g, ""))
    .map((entry) => entry.replace(/\s+\.$/, "."))
    .filter((entry) => entry.length > 0)
    .filter((entry) => !/^none\b/i.test(entry) && !/^nil\b/i.test(entry));

  return Array.from(new Set(cleaned));
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

const buildSnippet = (text: string | null | undefined) => {
  if (!text) return "";
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  const snippet = sentences || text.slice(0, 250);
  return snippet.length > 260 ? `${snippet.slice(0, 260)}…` : snippet;
};

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
    zoneObjectiveSource: "table" | "text-block" | "fallback";
    landUseSource: string | null;
    zoneAnchorClauseKey: string | null;
    zoneAnchorTitle: string | null;
    zoneCandidateCount: number;
    excludedGlobalZoneClauses: string[];
    usedGlobalZoneFallback: boolean;
    notes: string[];
  };
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
  const anyZoneHeadingRegex = /(^|\n)\s*zone\s+[A-Z]{1,3}\d?[A-Z]?\b[^\n]*/gi;
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
  const text = clause.bodyText ?? "";
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const headingRegexes = [
    zoneCode ? new RegExp(`^\s*zone\s+${zoneCode}\b.*`, "i") : null,
    zoneCode ? new RegExp(`^\s*${zoneCode}\b.*`, "i") : null,
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
    zoneCode ? new RegExp(`^\s*zone\s+${zoneCode}\b.*`, "i") : null,
    zoneCode ? new RegExp(`^\s*${zoneCode}\b.*`, "i") : null,
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
): ZoneSummary => {
  const notFoundReason = zoneCode
    ? `No zone-specific objectives found for zone ${zoneCode}.`
    : "No zone-specific objectives found.";

  const noLandUseReason = zoneCode
    ? `No zone-specific land use table entries found for zone ${zoneCode}.`
    : "No zone-specific land use entries found.";

  if (!selection) {
    return {
      objectives: [notFoundReason],
      landUse: {
        withoutConsent: [noLandUseReason],
        withConsent: [],
        prohibited: [],
      },
      debug: {
        headingMatch: null,
        zoneTableClauseKey: null,
        zoneTableClauseTitle: null,
        zoneObjectiveSource: "fallback",
        landUseSource: null,
        zoneAnchorClauseKey: pickDebug.anchorClauseKey,
        zoneAnchorTitle: pickDebug.anchorTitle,
        zoneCandidateCount: pickDebug.candidateCount,
        excludedGlobalZoneClauses: pickDebug.excludedGlobalClauses,
        usedGlobalZoneFallback: pickDebug.usedGlobalFallback,
        notes: ["No clause matched zone heading"],
      },
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
        landUseSource: null,
        zoneAnchorClauseKey: pickDebug.anchorClauseKey,
        zoneAnchorTitle: pickDebug.anchorTitle,
        zoneCandidateCount: pickDebug.candidateCount,
        excludedGlobalZoneClauses: pickDebug.excludedGlobalClauses,
        usedGlobalZoneFallback: pickDebug.usedGlobalFallback,
        notes: ["Matched clause contained global zone list"],
      },
    };
  }

  if (zoneCode && !new RegExp(`\b${zoneCode}\b`, "i").test(selection.sectionText)) {
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
        landUseSource: null,
        zoneAnchorClauseKey: pickDebug.anchorClauseKey,
        zoneAnchorTitle: pickDebug.anchorTitle,
        zoneCandidateCount: pickDebug.candidateCount,
        excludedGlobalZoneClauses: pickDebug.excludedGlobalClauses,
        usedGlobalZoneFallback: pickDebug.usedGlobalFallback,
        notes: ["Zone code not found in selected clause body"],
      },
    };
  }

  const text = selection.sectionText;
  const sections = splitZoneSections(text);

  const objectives = cleanListItems(sections.objectives);
  const withoutConsent = cleanListItems(sections.withoutConsent);
  const withConsent = cleanListItems(sections.withConsent);
  const prohibited = cleanListItems(sections.prohibited);

  const looksTabular = /<table/i.test(text) || /\|/.test(text) || /\t/.test(text);
  const objectiveSource: ZoneSummary["debug"]["zoneObjectiveSource"] = objectives.length
    ? looksTabular
      ? "table"
      : "text-block"
    : "fallback";
  const fallbackObjectives = objectives.length ? objectives : [notFoundReason];
  const hasLandUse = withoutConsent.length || withConsent.length || prohibited.length;
  const landUseSource: ZoneSummary["debug"]["landUseSource"] = hasLandUse
    ? looksTabular
      ? "table"
      : "text-block"
    : "clause-fallback";
  const landUseFallback = hasLandUse
    ? { withoutConsent, withConsent, prohibited }
    : { withoutConsent: [noLandUseReason], withConsent: [], prohibited: [] };

  return {
    objectives: fallbackObjectives,
    landUse: landUseFallback,
    debug: {
      headingMatch: selection.matchedHeading,
      zoneTableClauseKey: selection.clause.clauseKey ?? null,
      zoneTableClauseTitle: selection.clause.title ?? null,
      zoneObjectiveSource: objectiveSource,
      landUseSource,
      zoneAnchorClauseKey: pickDebug.anchorClauseKey,
      zoneAnchorTitle: pickDebug.anchorTitle,
      zoneCandidateCount: pickDebug.candidateCount,
      excludedGlobalZoneClauses: pickDebug.excludedGlobalClauses,
      usedGlobalZoneFallback: pickDebug.usedGlobalFallback,
      notes: selection.source === "fallback" ? ["Zone heading not found; used nearest matching block"] : [],
    },
  };
};

const normalizeWhitespace = (value: string | null | undefined) =>
  value?.replace(/\s+/g, " ").trim() ?? "";

export const extractZoneSummaryFromXmlFixture = (
  xml: string,
  zoneCode: string,
): { summary: ZoneSummary; clausegroupId: string } | null => {
  if (!xml || !zoneCode) return null;

  const clausegroupId = `pt-cg1.Zone_${zoneCode}`;
  const root = parse(xml);
  const clausegroup = root.querySelector(`level[id="${clausegroupId}"]`);
  if (!clausegroup) return null;

  const clauseLevels = clausegroup
    .querySelectorAll("level")
    .filter((level) => level.getAttribute("type") === "clause");

  if (!clauseLevels.length) return null;

  const groupNumber = normalizeWhitespace(clausegroup.querySelector("no")?.textContent);
  const groupTitle = normalizeWhitespace(clausegroup.querySelector("heading")?.textContent);
  const groupHeading = [groupNumber, groupTitle].filter(Boolean).join(" ") || `Zone ${zoneCode}`;

  const clauseTextParts = clauseLevels
    .map((clause) => {
      const heading = normalizeWhitespace(clause.querySelector("heading")?.textContent);
      const bodyParts = clause
        .querySelectorAll("txt")
        .map((node) => normalizeWhitespace(node.textContent))
        .filter(Boolean);
      const body = bodyParts.join("\n");
      return [heading, body].filter(Boolean).join("\n");
    })
    .filter(Boolean);

  const combinedText = [groupHeading, ...clauseTextParts].filter(Boolean).join("\n\n");
  const sections = splitZoneSections(combinedText);

  const objectives = cleanListItems(sections.objectives);
  const withoutConsent = cleanListItems(sections.withoutConsent);
  const withConsent = cleanListItems(sections.withConsent);
  const prohibited = cleanListItems(sections.prohibited);

  const looksTabular = /<table/i.test(combinedText) || /\|/.test(combinedText) || /\t/.test(combinedText);
  const objectiveSource: ZoneSummary["debug"]["zoneObjectiveSource"] = objectives.length
    ? looksTabular
      ? "table"
      : "text-block"
    : "fallback";
  const fallbackObjectives = objectives.length ? objectives : [`No zone-specific objectives found for zone ${zoneCode}.`];
  const hasLandUse = withoutConsent.length || withConsent.length || prohibited.length;
  const landUseSource: ZoneSummary["debug"]["landUseSource"] = hasLandUse
    ? looksTabular
      ? "table"
      : "text-block"
    : "clause-fallback";
  const landUseFallback = hasLandUse
    ? { withoutConsent, withConsent, prohibited }
    : {
        withoutConsent: [`No zone-specific land use table entries found for zone ${zoneCode}.`],
        withConsent: [],
        prohibited: [],
      };

  const summary: ZoneSummary = {
    objectives: fallbackObjectives,
    landUse: landUseFallback,
    debug: {
      headingMatch: groupHeading,
      zoneTableClauseKey: clausegroupId,
      zoneTableClauseTitle: groupHeading,
      zoneObjectiveSource: objectiveSource,
      landUseSource,
      zoneAnchorClauseKey: clausegroupId,
      zoneAnchorTitle: groupHeading,
      zoneCandidateCount: clauseLevels.length,
      excludedGlobalZoneClauses: [],
      usedGlobalZoneFallback: false,
      notes: [],
    },
  };

  return { summary, clausegroupId };
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
  try {
    const normalizedId = normalizeProjectId(projectId);
    const project = await findProjectByExternalId(prisma, normalizedId);

    if (!project) {
      return { ok: false, message: "Project not found" } satisfies QuickSiteCheckLepResponse;
    }

    const siteContext = await prisma.siteContext.findUnique({ where: { projectId: project.id } });
    const siteSummary = serializeSiteContext(siteContext, project);

    const lga = siteSummary?.lgaName ?? siteSummary?.lgaCode ?? null;
    const zone =
      project.zoningCode ??
      siteSummary?.zoningCode ??
      siteSummary?.zoningName ??
      siteSummary?.zone ??
      project.zoningName ??
      null;

    const zoneCode = toZoneCode(zone);

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

    if (!lepInstrument) {
      return {
        ok: false,
        projectId: project.id,
        message: "LEP data for this council is not loaded yet. Quick Site Check will work once LEP is ingested.",
      } satisfies QuickSiteCheckLepResponse;
    }

    const useLocalFixtures = process.env.LEP_LOCAL_FIXTURES === "true";
    const instrumentConfig = getInstrumentConfig(lepInstrument.slug);
    const xmlFixtureKey = instrumentConfig?.xmlFixtureKey;
    const xmlFixtureDocument =
      useLocalFixtures && xmlFixtureKey ? LEP_XML_FIXTURES[xmlFixtureKey] : undefined;

    let lepSource: "db" | "local-xml" = "db";
    let lepSourceError: string | undefined;
    let landUseExtractionMode: "db-clause" | "xml-clausegroup" = "db-clause";
    let landUseZoneClausegroupId: string | null = null;
    let xmlZoneSummary: ZoneSummary | null = null;

    if (useLocalFixtures && xmlFixtureKey) {
      if (xmlFixtureDocument) {
        lepSource = "local-xml";
        const extracted = extractZoneSummaryFromXmlFixture(xmlFixtureDocument, zoneCode);
        if (extracted) {
          xmlZoneSummary = extracted.summary;
          landUseExtractionMode = "xml-clausegroup";
          landUseZoneClausegroupId = extracted.clausegroupId;
        } else {
          lepSourceError = `Zone clausegroup pt-cg1.Zone_${zoneCode} not found in XML fixture.`;
        }
      } else {
        const availableFixtureKeys = Object.keys(LEP_XML_FIXTURES).slice(0, 10);
        lepSourceError = `Missing XML fixture for key ${xmlFixtureKey}. Available fixture keys: ${availableFixtureKeys.join(", ")}`;
      }
    }

    const zonePattern = `Zone ${zoneCode}`;

    const allClauses = await prisma.clause.findMany({
      where: {
        instrumentId: lepInstrument.id,
        isCurrent: true,
      },
      orderBy: { clauseKey: "asc" },
      select: { clauseKey: true, title: true, bodyText: true, hierarchyPath: true },
    });

    const zoneClauses = allClauses.filter(
      (clause) =>
        clause.clauseKey?.startsWith("2") ||
        clause.hierarchyPath?.includes("Part 2") ||
        (clause.title && new RegExp(zonePattern, "i").test(clause.title)) ||
        (clause.bodyText && new RegExp(zonePattern, "i").test(clause.bodyText)) ||
        (clause.title && zoneCode && new RegExp(`\b${zoneCode}\b`, "i").test(clause.title)) ||
        (clause.bodyText && zoneCode && new RegExp(`\b${zoneCode}\b`, "i").test(clause.bodyText ?? "")),
    );

    const zonePick = pickZoneClause(zoneClauses.length ? zoneClauses : allClauses, zoneCode);
    const chosenZoneClause = zonePick.selection;

    if (!chosenZoneClause) {
      console.warn("[quick-site-check-lep] No zone clause found", { lep: lepInstrument.name, zone: zoneCode });
    }

    let zoneSummary = buildZoneSummary(chosenZoneClause, zoneCode, zonePick.debug);
    if (xmlZoneSummary) {
      zoneSummary = xmlZoneSummary;
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
          partCandidateCounts: {
            "4": partBuckets["4"].length,
            "5": partBuckets["5"].length,
            "6": partBuckets["6"].length,
          },
          notes: zoneSummary.debug.notes,
          lepSource,
          lepSourceError,
          landUseExtractionMode,
          landUseZoneClausegroupId,
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
    console.error("[quick-site-check-lep] failed", error);
    return {
      ok: false,
      message: "Unable to run LEP Quick Site Check right now.",
    } satisfies QuickSiteCheckLepResponse;
  }
};
