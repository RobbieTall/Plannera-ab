import type { Clause } from "@prisma/client";

import type { QuickSiteCheckLepClause, QuickSiteCheckLepResponse } from "@/types/quick-site-check-lep";

import { prisma } from "../prisma";
import { findProjectByExternalId, normalizeProjectId } from "../project-identifiers";
import { serializeSiteContext } from "../site-context";
import { buildLepInstrumentFilter } from "./lep-search";
import { resolveCanonicalNswLga } from "./nsw-lga-normaliser";

type ClauseSummary = Pick<Clause, "clauseKey" | "title" | "bodyText" | "hierarchyPath">;

type ZoneSectionKey = "objectives" | "withoutConsent" | "withConsent" | "prohibited";

const KEYWORDS: Record<"4" | "5" | "6", string[]> = {
  "4": ["height", "floor space", "fsr", "lot size", "subdivision", "envelope", "setback", "building"],
  "5": ["heritage", "archaeolog", "environmental heritage"],
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

const scoreClause = (part: "4" | "5" | "6", clause: ClauseSummary) => {
  const haystack = `${clause.title ?? ""} ${clause.bodyText ?? ""}`.toLowerCase();
  const keywords = KEYWORDS[part];
  const scoreFromKeywords = keywords.reduce((score, keyword) => (haystack.includes(keyword) ? score + 2 : score), 0);
  const partBonus = clause.clauseKey.startsWith(part) ? 1 : 0;
  return scoreFromKeywords + partBonus;
};

const selectClauses = (
  part: "4" | "5" | "6",
  clauses: ClauseSummary[],
): QuickSiteCheckLepClause[] => {
  const scored = clauses
    .map((clause) => ({ clause, score: scoreClause(part, clause), clauseNumber: parseClauseNumber(clause) }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => {
      if (first.score !== second.score) return second.score - first.score;
      return first.clauseNumber.localeCompare(second.clauseNumber, undefined, { numeric: true, sensitivity: "base" });
    });

  return scored
    .slice(0, 8)
    .map(({ clause }) => ({
      part,
      clauseNumber: parseClauseNumber(clause) || "",
      heading: clause.title?.trim() || "",
      textSnippet: buildSnippet(clause.bodyText),
    }));
};

const pickZoneClause = (clauses: ClauseSummary[], zoneCode: string | null) => {
  if (!clauses.length) return null;

  const zonePattern = zoneCode ? new RegExp(`\bzone\s+${zoneCode}\b`, "i") : null;

  const scored = clauses
    .map((clause) => {
      let score = 0;
      if (clause.clauseKey.startsWith("2")) score += 1;
      if (clause.hierarchyPath?.some((entry) => /part\s*2/i.test(entry))) score += 1;
      if (zonePattern?.test(clause.title ?? "")) score += 6;
      if (!score && zonePattern?.test(clause.bodyText ?? "")) score += 3;
      if (!score && zoneCode && new RegExp(`\b${zoneCode}\b`, "i").test(clause.title ?? "")) score += 2;
      if (!score && zoneCode && new RegExp(`\b${zoneCode}\b`, "i").test(clause.bodyText ?? "")) score += 1;
      return { clause, score };
    })
    .sort((first, second) => second.score - first.score);

  return scored[0]?.clause ?? null;
};

const buildZoneSummary = (clause: ClauseSummary | null) => {
  if (!clause) {
    return { objectives: [] as string[], withoutConsent: [] as string[], withConsent: [] as string[], prohibited: [] as string[] };
  }

  const text = clause.bodyText ?? "";
  const sections = splitZoneSections(text);

  const objectives = cleanListItems(sections.objectives);
  const withoutConsent = cleanListItems(sections.withoutConsent);
  const withConsent = cleanListItems(sections.withConsent);
  const prohibited = cleanListItems(sections.prohibited);

  const fallbackObjectives = objectives.length ? objectives : cleanListItems(text);

  return {
    objectives: fallbackObjectives,
    withoutConsent,
    withConsent,
    prohibited,
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

export const buildQuickSiteCheckLep = async (projectId: string): Promise<QuickSiteCheckLepResponse> => {
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

    return {
      ok: true,
      projectId: project.id,
      lga: resolveCanonicalNswLga(lga) ?? lga,
      lepName: lepInstrument.name,
      zone: zoneCode,
      zoneObjectives: zoneSummary.objectives,
      permittedWithoutConsent: zoneSummary.withoutConsent,
      permittedWithConsent: zoneSummary.withConsent,
      prohibited: zoneSummary.prohibited,
      part4Clauses: selectClauses("4", partBuckets["4"]),
      part5Clauses: selectClauses("5", partBuckets["5"]),
      part6Clauses: selectClauses("6", partBuckets["6"]),
    } satisfies QuickSiteCheckLepResponse;
  } catch (error) {
    console.error("[quick-site-check-lep] failed", error);
    return {
      ok: false,
      message: "Unable to run LEP Quick Site Check right now.",
    } satisfies QuickSiteCheckLepResponse;
  }
};
