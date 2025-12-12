import type { Clause } from "@prisma/client";

import type {
  QuickSiteCheckLepClause,
  QuickSiteCheckLepResponse,
  QuickSiteCheckLepSuccess,
} from "@/types/quick-site-check-lep";

import { prisma } from "../prisma";
import { findProjectByExternalId, normalizeProjectId } from "../project-identifiers";
import { serializeSiteContext } from "../site-context";
import { buildLepInstrumentFilter } from "./lep-search";
import { resolveCanonicalNswLga } from "./nsw-lga-normaliser";

type ClauseSummary = Pick<Clause, "clauseKey" | "title" | "bodyText" | "hierarchyPath">;

type ZoneSectionKey = "objectives" | "withoutConsent" | "withConsent" | "prohibited";

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

type ZoneClauseSelection = { clause: ClauseSummary; matchedHeading: string | null; sectionText: string } | null;

type ZoneSummary = {
  objectives: string[];
  landUse: { withoutConsent: string[]; withConsent: string[]; prohibited: string[] };
  debug: { headingMatch: string | null; landUseSource: string | null };
};

const extractZoneSection = (clause: ClauseSummary, zoneCode: string | null): ZoneClauseSelection => {
  const text = clause.bodyText ?? "";
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const headingRegexes = [
    zoneCode ? new RegExp(`^\s*zone\s+${zoneCode}\b.*`, "i") : null,
    zoneCode ? new RegExp(`^\s*${zoneCode}\b.*`, "i") : null,
  ].filter(Boolean) as RegExp[];

  let matchedHeading: string | null = null;
  let startIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (headingRegexes.some((regex) => regex.test(line))) {
      matchedHeading = line;
      startIndex = index + 1;
      break;
    }
  }

  const titleText = clause.title ?? "";
  if (matchedHeading === null && titleText && headingRegexes.some((regex) => regex.test(titleText))) {
    matchedHeading = clause.title ?? titleText;
    startIndex = 0;
  }

  let endIndex = lines.length;
  if (matchedHeading) {
    for (let index = startIndex; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (/^\s*zone\s+[A-Z]{1,3}\d?[A-Z]?\b/i.test(line)) {
        endIndex = index;
        break;
      }
    }
  }

  const sectionText = lines.slice(startIndex, endIndex).join("\n").trim() || normalized.trim();
  return { clause, matchedHeading, sectionText };
};

const pickZoneClause = (clauses: ClauseSummary[], zoneCode: string | null): ZoneClauseSelection => {
  if (!clauses.length) return null;

  const zonePattern = zoneCode ? new RegExp(`\bzone\s+${zoneCode}\b`, "i") : null;

  const scored = clauses
    .map((clause) => {
      let score = 0;
      if (clause.clauseKey.startsWith("2")) score += 1;
      if (clause.hierarchyPath?.some((entry) => /part\s*2/i.test(entry))) score += 1;
      if (clause.hierarchyPath?.some((entry) => /land use table/i.test(entry))) score += 5;
      if (/land use table/i.test(clause.title ?? "")) score += 4;
      if (/objectives of/i.test(clause.title ?? "")) score += 2;
      if (zonePattern?.test(clause.title ?? "")) score += 8;
      if (!score && zonePattern?.test(clause.bodyText ?? "")) score += 4;
      if (!score && zoneCode && new RegExp(`\b${zoneCode}\b`, "i").test(clause.title ?? "")) score += 3;
      if (!score && zoneCode && new RegExp(`\b${zoneCode}\b`, "i").test(clause.bodyText ?? "")) score += 2;
      return { clause, score };
    })
    .sort((first, second) => second.score - first.score);

  const winner = scored[0]?.clause ?? null;
  if (!winner) return null;

  return extractZoneSection(winner, zoneCode);
};

const buildZoneSummary = (selection: ZoneClauseSelection): ZoneSummary => {
  if (!selection) {
    return {
      objectives: [] as string[],
      landUse: { withoutConsent: [] as string[], withConsent: [] as string[], prohibited: [] as string[] },
      debug: { headingMatch: null, landUseSource: null },
    };
  }

  const text = selection.sectionText;
  const sections = splitZoneSections(text);

  const objectives = cleanListItems(sections.objectives);
  const withoutConsent = cleanListItems(sections.withoutConsent);
  const withConsent = cleanListItems(sections.withConsent);
  const prohibited = cleanListItems(sections.prohibited);

  const fallbackObjectives = objectives.length ? objectives : cleanListItems(text);
  const landUseSource = withoutConsent.length || withConsent.length || prohibited.length ? "zone-section" : "clause-fallback";

  return {
    objectives: fallbackObjectives,
    landUse: {
      withoutConsent,
      withConsent,
      prohibited,
    },
    debug: { headingMatch: selection.matchedHeading, landUseSource },
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

    const zonePattern = `Zone ${zoneCode}`;

    const zoneClauses = await prisma.clause.findMany({
      where: {
        instrumentId: lepInstrument.id,
        isCurrent: true,
        OR: [
          { clauseKey: { startsWith: "2" } },
          { hierarchyPath: { has: "Part 2" } },
          { title: { contains: zonePattern, mode: "insensitive" } },
          { bodyText: { contains: zonePattern, mode: "insensitive" } },
          { title: { contains: zoneCode, mode: "insensitive" } },
          { bodyText: { contains: zoneCode, mode: "insensitive" } },
        ],
      },
      orderBy: { clauseKey: "asc" },
      select: { clauseKey: true, title: true, bodyText: true, hierarchyPath: true },
    });

    const chosenZoneClause = pickZoneClause(zoneClauses, zoneCode);

    if (!chosenZoneClause) {
      console.warn("[quick-site-check-lep] No zone clause found", { lep: lepInstrument.name, zone: zoneCode });
    }

    const zoneSummary = buildZoneSummary(chosenZoneClause);

    const candidateClauses = await prisma.clause.findMany({
      where: {
        instrumentId: lepInstrument.id,
        isCurrent: true,
        OR: [
          { clauseKey: { startsWith: "4" } },
          { clauseKey: { startsWith: "5" } },
          { clauseKey: { startsWith: "6" } },
          { hierarchyPath: { hasSome: ["Part 4", "Part 5", "Part 6"] } },
        ],
      },
      orderBy: { clauseKey: "asc" },
      select: { clauseKey: true, title: true, bodyText: true, hierarchyPath: true },
    });

    const partBuckets: Record<"4" | "5" | "6", ClauseSummary[]> = { "4": [], "5": [], "6": [] };

    for (const clause of candidateClauses) {
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
    if (totalClauses < 3 && candidateClauses.length) {
      const additional = candidateClauses
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
          landUseSource: zoneSummary.debug.landUseSource,
          partCandidateCounts: {
            "4": partBuckets["4"].length,
            "5": partBuckets["5"].length,
            "6": partBuckets["6"].length,
          },
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
